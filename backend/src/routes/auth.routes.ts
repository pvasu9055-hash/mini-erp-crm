import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import prisma from "../prisma/client";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = "8h";

/**
 * POST /auth/login
 */
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError("Invalid email or password", 401);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new AppError("Invalid email or password", 401);

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })
);

/**
 * POST /auth/register
 * Self-registration is restricted to non-admin roles. Admin access can
 * only be granted afterward by an existing Admin via PATCH /users/:id/role.
 */
router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("role").isIn(["SALES", "WAREHOUSE", "ACCOUNTS"]).withMessage("Invalid role for self-registration"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, role } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError("An account with this email already exists", 409);

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, email, password: hashedPassword, role } });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })
);

/**
 * GET /auth/me - current user's profile
 */
router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!user) throw new AppError("User not found", 404);
    res.json(user);
  })
);

/**
 * PATCH /auth/me - update own name and/or password
 * Body: { name?, currentPassword?, newPassword? }
 */
router.patch(
  "/me",
  authenticate,
  [
    body("name").optional().notEmpty().withMessage("Name cannot be empty"),
    body("newPassword").optional().isLength({ min: 8 }).withMessage("New password must be at least 8 characters"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new AppError("User not found", 404);

    const data: any = {};
    if (name) data.name = name;

    if (newPassword) {
      if (!currentPassword) throw new AppError("Current password is required to set a new password", 400);
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) throw new AppError("Current password is incorrect", 401);
      data.password = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
      select: { id: true, name: true, email: true, role: true },
    });

    res.json(updated);
  })
);

export default router;