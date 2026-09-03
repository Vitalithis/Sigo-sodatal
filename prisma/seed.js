// prisma/seed.js
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const { PrismaClient } = require('../lib/prisma/generated');

const prisma = new PrismaClient();

async function main() {
  const configs = [
    { clave: 'co2_rendimiento_45kg', valor: '1500' },
    { clave: 'co2_rendimiento_35kg', valor: '1167' },
    { clave: 'co2_alerta_porcentaje', valor: '20' },
    { clave: 'stock_alerta_activa', valor: 'true' },
  ];

  console.log('Iniciando la carga de datos base...');

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
  });