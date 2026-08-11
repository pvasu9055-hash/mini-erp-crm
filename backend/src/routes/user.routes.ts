import { Router } from "express";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import prisma from "../prisma/client";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

router.use(authenticate);

/**
 * GET /users - Admin only. List all users.
 */
router.get(
  "/",
  authorize("ADMIN"),
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  })
);

/**
 * PATCH /users/:id/role - Admin only. Change ANY user's role.
 */
router.patch(
  "/:id/role",
  authorize("ADMIN"),
  [body("role").isIn(["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"]).withMessage("Invalid role")],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new AppError("User not found", 404);

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: req.body.role },
      select: { id: true, name: true, email: true, role: true },
    });

    res.json(updated);
  })
);

/**
 * POST /users/switch-role - ADMIN ONLY. Instantly switch YOUR OWN
 * active role without logging out, for demo/testing convenience.
 * Restricted to Admins so regular staff can never self-promote.
 */
router.post(
  "/switch-role",
  authorize("ADMIN"),
  [body("role").isIn(["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"]).withMessage("Invalid role")],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const updated = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { role: req.body.role },
      select: { id: true, name: true, email: true, role: true },
    });

    const token = jwt.sign(
      { userId: updated.id, role: updated.role },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ token, user: updated });
  })
);

export default router;