import { Router } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../prisma/client";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

/**
 * Generates a challan number like CH-2026-0001
 * Sequential per year, based on count of challans created this year.
 */
async function generateChallanNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.salesChallan.count({
    where: { challanNumber: { startsWith: `CH-${year}-` } },
  });
  const next = String(count + 1).padStart(4, "0");
  return `CH-${year}-${next}`;
}

/**
 * GET /challans?status=&customerId=&page=&limit=
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, customerId } = req.query as { status?: string; customerId?: string };
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const where: any = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const [challans, total] = await Promise.all([
      prisma.salesChallan.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { name: true, mobile: true } },
          items: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.salesChallan.count({ where }),
    ]);

    res.json({
      data: challans,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const challan = await prisma.salesChallan.findUnique({
      where: { id: req.params.id },
      include: { customer: true, items: true, createdBy: { select: { name: true } } },
    });
    if (!challan) throw new AppError("Challan not found", 404);
    res.json(challan);
  })
);

/**
 * POST /challans - Create a new challan (Draft by default)
 * Body: { customerId, items: [{ productId, quantity }], status?: "DRAFT"|"CONFIRMED" }
 *
 * Business logic:
 * - Challan number auto-generated
 * - Product data is SNAPSHOTTED into ChallanItem (name/sku/price at time of creation)
 * - If status = CONFIRMED at creation, stock is validated & reduced immediately
 * - Stock must never go negative -> proper 400 error if insufficient
 */
router.post(
  "/",
  authorize("ADMIN", "SALES"),
  [
    body("customerId").notEmpty().withMessage("customerId is required"),
    body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
    body("items.*.productId").notEmpty(),
    body("items.*.quantity").isInt({ gt: 0 }).withMessage("Quantity must be positive"),
    body("status").optional().isIn(["DRAFT", "CONFIRMED"]),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { customerId, items, status = "DRAFT" } = req.body as {
      customerId: string;
      items: { productId: string; quantity: number }[];
      status?: "DRAFT" | "CONFIRMED";
    };

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new AppError("Customer not found", 404);

    const result = await prisma.$transaction(async (tx) => {
      // Fetch all products involved, and snapshot their current data
      const products = await tx.product.findMany({
        where: { id: { in: items.map((i) => i.productId) } },
      });

      if (products.length !== items.length) {
        throw new AppError("One or more products not found", 404);
      }

      // If confirming immediately, validate stock BEFORE making any changes
      if (status === "CONFIRMED") {
        for (const item of items) {
          const product = products.find((p) => p.id === item.productId)!;
          if (product.stock < item.quantity) {
            throw new AppError(
              `Insufficient stock for "${product.name}" (SKU: ${product.sku}). Available: ${product.stock}, requested: ${item.quantity}`,
              400
            );
          }
        }
      }

      const challanNumber = await generateChallanNumber();
      const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

      const challan = await tx.salesChallan.create({
        data: {
          challanNumber,
          customerId,
          totalQuantity,
          status,
          createdById: req.user!.userId,
          items: {
            create: items.map((item) => {
              const product = products.find((p) => p.id === item.productId)!;
              return {
                productId: product.id,
                productNameSnap: product.name,
                productSkuSnap: product.sku,
                unitPriceSnap: product.unitPrice,
                quantity: item.quantity,
              };
            }),
          },
        },
        include: { items: true },
      });

      // If confirmed, reduce stock + log movement for each item
      if (status === "CONFIRMED") {
        for (const item of items) {
          const product = products.find((p) => p.id === item.productId)!;
          await tx.product.update({
            where: { id: product.id },
            data: { stock: product.stock - item.quantity },
          });
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              quantity: item.quantity,
              movementType: "OUT",
              reason: `Sales Challan ${challanNumber}`,
              createdById: req.user!.userId,
            },
          });
        }
      }

      return challan;
    });

    res.status(201).json(result);
  })
);

/**
 * PATCH /challans/:id/confirm
 * Moves a DRAFT challan to CONFIRMED, reducing stock at this point.
 * Rejects if any item now has insufficient stock (stock can shift between
 * draft creation and confirmation), returning a proper error - never lets
 * stock go negative.
 */
router.patch(
  "/:id/confirm",
  authorize("ADMIN", "SALES", "WAREHOUSE"),
  asyncHandler(async (req, res) => {
    const result = await prisma.$transaction(async (tx) => {
      const challan = await tx.salesChallan.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      });
      if (!challan) throw new AppError("Challan not found", 404);
      if (challan.status !== "DRAFT") {
        throw new AppError(`Only DRAFT challans can be confirmed. Current status: ${challan.status}`, 400);
      }

      // Validate stock for every item first
      for (const item of challan.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new AppError(`Product ${item.productSkuSnap} no longer exists`, 404);
        if (product.stock < item.quantity) {
          throw new AppError(
            `Insufficient stock for "${product.name}". Available: ${product.stock}, required: ${item.quantity}`,
            400
          );
        }
      }

      // All good -> reduce stock + log movements
      for (const item of challan.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: product!.stock - item.quantity },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            movementType: "OUT",
            reason: `Sales Challan ${challan.challanNumber}`,
            createdById: req.user!.userId,
          },
        });
      }

      return tx.salesChallan.update({
        where: { id: req.params.id },
        data: { status: "CONFIRMED" },
        include: { items: true },
      });
    });

    res.json(result);
  })
);

/**
 * PATCH /challans/:id/cancel
 * Cancels a challan. If it was CONFIRMED, restocks the items (reverses the OUT movement).
 */
router.patch(
  "/:id/cancel",
  authorize("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const result = await prisma.$transaction(async (tx) => {
      const challan = await tx.salesChallan.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      });
      if (!challan) throw new AppError("Challan not found", 404);
      if (challan.status === "CANCELLED") {
        throw new AppError("Challan is already cancelled", 400);
      }

      // If it was confirmed (stock already deducted), reverse it
      if (challan.status === "CONFIRMED") {
        for (const item of challan.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: product!.stock + item.quantity },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              movementType: "IN",
              reason: `Cancelled Challan ${challan.challanNumber} - stock reversed`,
              createdById: req.user!.userId,
            },
          });
        }
      }

      return tx.salesChallan.update({
        where: { id: req.params.id },
        data: { status: "CANCELLED" },
      });
    });

    res.json(result);
  })
);

export default router;
