import { PrismaClient } from "@prisma/client";

// Singleton pattern - prevents exhausting DB connections in dev with hot-reload
const prisma = new PrismaClient();

export default prisma;
