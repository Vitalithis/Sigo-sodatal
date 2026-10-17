import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { prisma } from '../lib/prisma';

async function main() {
  console.log('Creando tabla ComprobantePago en MySQL si no existe...');
  
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`ComprobantePago\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`origen_documento\` ENUM('TRANSFERENCIA_BANCARIA', 'VOUCHER_POS', 'DEPOSITO_VENTANILLA', 'OTRO') NOT NULL DEFAULT 'TRANSFERENCIA_BANCARIA',
      \`banco_origen\` VARCHAR(191) NULL,
      \`monto\` DOUBLE NOT NULL,
      \`fecha_transaccion\` DATETIME(3) NULL,
      \`num_operacion\` VARCHAR(191) NOT NULL,
      \`rut_emisor\` VARCHAR(191) NULL,
      \`metodo_pago\` ENUM('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'GUIA_MENSUAL') NOT NULL DEFAULT 'TRANSFERENCIA',
      \`estado\` ENUM('PENDIENTE', 'CONCILIADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
      \`url_archivo\` VARCHAR(500) NOT NULL,
      \`nombre_archivo\` VARCHAR(255) NOT NULL,
      \`mime_type\` VARCHAR(100) NOT NULL,
      \`confianza_ia\` DOUBLE NOT NULL DEFAULT 1.0,
      \`datos_ia_raw\` JSON NULL,
      \`observaciones_ia\` TEXT NULL,
      \`cliente_id\` VARCHAR(191) NULL,
      \`motivo_rechazo\` TEXT NULL,
      \`conciliado_por_id\` VARCHAR(191) NULL,
      \`fecha_conciliacion\` DATETIME(3) NULL,
      \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      UNIQUE INDEX \`uq_operacion_monto\` (\`num_operacion\`, \`monto\`),
      INDEX \`ComprobantePago_estado_idx\` (\`estado\`),
      INDEX \`ComprobantePago_cliente_id_idx\` (\`cliente_id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  console.log('✅ Tabla ComprobantePago lista en la base de datos MySQL.');
}

main()
  .catch((e) => {
    console.error('Error al crear tabla:', e);
  })
  .finally(() => prisma.$disconnect());
