import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Next/Vercel can evaluate more than one route bundle in the same warm process.
// Reuse the client there too so every bundle does not create its own pool.
globalForPrisma.prisma = prisma;
