// prisma.config.ts
import { defineConfig } from '@prisma/config';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DIRECT_URL,
  },
  migrations: {
    // Usamos Node directo, sin tsx ni configuraciones extrañas
    seed: 'node prisma/seed.js',
  },
});