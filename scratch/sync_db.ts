import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('Running ALTER TABLE statements on MySQL...');
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`Cliente\` ADD COLUMN \`deuda\` DOUBLE NOT NULL DEFAULT 0;`);
    console.log('Added deuda to Cliente');
  } catch (e: any) {
    console.log('deuda column info:', e.message);
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`Cliente\` MODIFY COLUMN \`frecuencia\` ENUM('SEMANAL','QUINCENAL','MENSUAL','A_PEDIDO','ALTERNA') NOT NULL DEFAULT 'SEMANAL';`);
    console.log('Updated Frecuencia enum on Cliente');
  } catch (e: any) {
    console.log('frecuencia enum info:', e.message);
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`Dispensador\` MODIFY COLUMN \`cliente_id\` VARCHAR(191) NULL;`);
    console.log('Made cliente_id nullable on Dispensador');
  } catch (e: any) {
    console.log('cliente_id nullability info:', e.message);
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`Dispensador\` MODIFY COLUMN \`estado\` ENUM('DISPONIBLE','EN_CLIENTE','EN_TALLER','REEMPLAZADO_TEMPORALMENTE','RETIRADO','BAJA') NOT NULL DEFAULT 'DISPONIBLE';`);
    console.log('Updated EstadoDispensador enum on Dispensador');
  } catch (e: any) {
    console.log('estado enum info:', e.message);
  }

  console.log('DB sync completed successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
