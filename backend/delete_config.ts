import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.systemConfig.deleteMany().then(() => console.log('Deleted')).catch(console.error).finally(() => prisma.$disconnect());
