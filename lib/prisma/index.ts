// 💡 Cambiamos la importación clásica de '@prisma/client' 
// para apuntar a la carpeta interna que generará el comando
import { PrismaClient } from './generated';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const urlFija = "postgresql://postgres.urenwxsxxdvkqoxypflw:123ert6789daN%40%40@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

// 1. Creamos el pool de conexiones nativo de PostgreSQL usando la URL
const pool = new Pool({ connectionString: urlFija });
const adapter = new PrismaPg(pool);

// 2. Le pasamos el adapter al constructor del cliente localizado
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: adapter,
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;