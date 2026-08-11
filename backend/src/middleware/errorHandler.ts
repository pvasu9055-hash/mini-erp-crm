import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Catches errors thrown/passed via next(err) from any route
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Prisma unique constraint violation
  if (err.code === "P2002") {
    return res.status(409).json({
      error: `Duplicate value for field: ${err.meta?.target ?? "unknown"}`,
    });
  }

  // Prisma record not found
  if (err.code === "P2025") {
    return res.status(404).json({ error: "Record not found" });
  }

  return res.status(500).json({ error: "Internal server error" });
}

// Wraps async route handlers so thrown errors reach errorHandler
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
