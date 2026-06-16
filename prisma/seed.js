// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Prisma 7 ya no gestiona la URL automáticamente, tenemos que pasársela al Pool
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('❌ No se encontró DIRECT_URL o DATABASE_URL en .env.local');
}

// 1. Inicializamos la conexión nativa de Postgres
const pool = new Pool({ connectionString });

// 2. Creamos el adaptador oficial
const adapter = new PrismaPg(pool);

// 3. ¡Por fin! Pasamos el adaptador a PrismaClient cumpliendo la regla de Prisma 7
const prisma = new PrismaClient({ adapter });

async function main() {
  const configs = [
    { clave: 'co2_rendimiento_45kg', valor: '1500' },
    { clave: 'co2_rendimiento_35kg', valor: '1167' },
    { clave: 'co2_alerta_porcentaje', valor: '20' },
    { clave: 'stock_alerta_activa', valor: 'true' },
  ];

  console.log(' Iniciando la carga de datos base...');

  for (const config of configs) {
    await prisma.configuracion.upsert({
      where: { clave: config.clave },
      update: {},
      create: config,
    });
  }

  console.log('Datos de configuración sembrados con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el proceso seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    // Cerramos el pool de Postgres para que la terminal no se quede colgada
    await pool.end();
  });