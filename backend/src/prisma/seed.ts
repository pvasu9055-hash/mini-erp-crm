import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Password@123", 10);

  const users = [
    { name: "Admin User", email: "admin@erp.test", role: Role.ADMIN },
    { name: "Sales User", email: "sales@erp.test", role: Role.SALES },
    { name: "Warehouse User", email: "warehouse@erp.test", role: Role.WAREHOUSE },
    { name: "Accounts User", email: "accounts@erp.test", role: Role.ACCOUNTS },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password },
    });
    console.log(`Seeded: ${u.email} / Password@123`);
  }

  // Seed a couple of sample products so challan flow can be tested immediately
  await prisma.product.upsert({
    where: { sku: "SKU-001" },
    update: {},
    create: {
      name: "Steel Rod 10mm",
      sku: "SKU-001",
      category: "Raw Material",
      unitPrice: 450.0,
      stock: 100,
      minStock: 20,
      location: "Warehouse A",
    },
  });

  await prisma.product.upsert({
    where: { sku: "SKU-002" },
    update: {},
    create: {
      name: "Cement Bag 50kg",
      sku: "SKU-002",
      category: "Raw Material",
      unitPrice: 380.0,
      stock: 50,
      minStock: 10,
      location: "Warehouse B",
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
