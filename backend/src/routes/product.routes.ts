import { Router } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../prisma/client";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

/**
 * GET /products?search=&category=&page=&limit=
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, category } = req.query as { search?: string; category?: string };
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const where: any = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      data: products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

/**
 * GET /products/low-stock - products at or below minStock threshold
 */
router.get(
  "/low-stock",
  asyncHandler(async (req, res) => {
    const products = await prisma.product.findMany();
    const low = products.filter((p) => p.stock <= p.minStock);
    res.json(low);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) throw new AppError("Product not found", 404);
    res.json(product);
  })
);

/**
 * POST /products - Admin, Warehouse only
 */
router.post(
  "/",
  authorize("ADMIN", "WAREHOUSE"),
  [
    body("name").notEmpty(),
    body("sku").notEmpty(),
    body("unitPrice").isFloat({ gt: 0 }).withMessage("Unit price must be positive"),
    body("stock").optional().isInt({ min: 0 }),
    body("minStock").optional().isInt({ min: 0 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const product = await prisma.product.create({ data: req.body });
    res.status(201).json(product);
  })
);

/**
 * PUT /products/:id - Admin, Warehouse only
 */
router.put(
  "/:id",
  authorize("ADMIN", "WAREHOUSE"),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(product);
  })
);

/**
 * POST /products/:id/stock-movement
 * Manually adjust stock (e.g. new purchase, damage write-off, correction)
 * Body: { quantity, movementType: "IN"|"OUT", reason }
 */
router.post(
  "/:id/stock-movement",
  authorize("ADMIN", "WAREHOUSE"),
  [
    body("quantity").isInt({ gt: 0 }).withMessage("Quantity must be positive"),
    body("movementType").isIn(["IN", "OUT"]),
    body("reason").notEmpty().withMessage("Reason is required"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { quantity, movementType, reason } = req.body;
    const productId = req.params.id;

    // Transaction: update stock + log movement atomically
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new AppError("Product not found", 404);

      const newStock =
        movementType === "IN" ? product.stock + quantity : product.stock - quantity;

      if (newStock < 0) {
        throw new AppError(
          `Insufficient stock. Current: ${product.stock}, requested OUT: ${quantity}`,
          400
        );
      }

      const updated = await tx.product.update({
        where: { id: productId },
        data: { stock: newStock },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          quantity,
          movementType,
          reason,
          createdById: req.user!.userId,
        },
      });

      return { product: updated, movement };
    });

    res.status(201).json(result);
  })
);

/**
 * GET /products/:id/stock-movements - movement history for a product
 */
router.get(
  "/:id/stock-movements",
  asyncHandler(async (req, res) => {
    const movements = await prisma.stockMovement.findMany({
      where: { productId: req.params.id },
      include: { createdBy: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(movements);
  })
);

export default router;
