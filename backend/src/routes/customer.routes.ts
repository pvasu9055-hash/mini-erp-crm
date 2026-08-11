import { Router } from "express";
import { body, query, validationResult } from "express-validator";
import prisma from "../prisma/client";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate); // all customer routes require login

/**
 * GET /customers?search=&status=&page=&limit=
 * Sales, Admin, Accounts can view. Search by name/mobile/business name.
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, status } = req.query as { search?: string; status?: string };
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { mobile: { contains: search } },
        { businessName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      data: customers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

/**
 * GET /customers/:id - full detail incl. follow-ups
 */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { followUps: { orderBy: { createdAt: "desc" } } },
    });
    if (!customer) throw new AppError("Customer not found", 404);
    res.json(customer);
  })
);

/**
 * POST /customers - Admin, Sales only
 */
router.post(
  "/",
  authorize("ADMIN", "SALES"),
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("mobile").notEmpty().withMessage("Mobile is required"),
    body("email").optional().isEmail().withMessage("Invalid email"),
    body("customerType")
      .optional()
      .isIn(["RETAIL", "WHOLESALE", "DISTRIBUTOR"]),
    body("status").optional().isIn(["LEAD", "ACTIVE", "INACTIVE"]),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const customer = await prisma.customer.create({ data: req.body });
    res.status(201).json(customer);
  })
);

/**
 * PUT /customers/:id - Admin, Sales only
 */
router.put(
  "/:id",
  authorize("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(customer);
  })
);

/**
 * POST /customers/:id/followups - add a follow-up note
 */
router.post(
  "/:id/followups",
  authorize("ADMIN", "SALES"),
  [body("note").notEmpty().withMessage("Note is required")],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const followUp = await prisma.customerFollowUp.create({
      data: {
        customerId: req.params.id,
        note: req.body.note,
        createdById: req.user!.userId,
      },
    });
    res.status(201).json(followUp);
  })
);

export default router;
