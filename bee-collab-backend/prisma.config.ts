import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Paksa pakai Transaction Pooler (port 6543) - port 5432 tidak bisa diakses
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
