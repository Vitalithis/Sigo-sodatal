-- Nuevas tablas para Cierre de Caja

CREATE TABLE IF NOT EXISTS `CierreCaja` (
    `id` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `efectivo_inicial` DOUBLE NOT NULL DEFAULT 0,
    `total_efectivo` DOUBLE NOT NULL DEFAULT 0,
    `total_tarjeta` DOUBLE NOT NULL DEFAULT 0,
    `total_transferencia` DOUBLE NOT NULL DEFAULT 0,
    `total_credito_oficina` DOUBLE NOT NULL DEFAULT 0,
    `total_pagina_web` DOUBLE NOT NULL DEFAULT 0,
    `total_general` DOUBLE NOT NULL DEFAULT 0,
    `estado` ENUM('ABIERTO', 'CERRADO') NOT NULL DEFAULT 'ABIERTO',
    `observaciones` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    `usuario_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `CierreCaja_fecha_key`(`fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `VentaCierreCaja` (
    `id` VARCHAR(191) NOT NULL,
    `cierre_id` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `producto_id` VARCHAR(191) NULL,
    `cantidad` INTEGER NOT NULL DEFAULT 1,
    `precio_unitario` DOUBLE NOT NULL,
    `subtotal` DOUBLE NOT NULL,
    `metodo_pago` ENUM('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO_OFICINA', 'PAGINA_WEB') NOT NULL,
    `es_otro` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `GastoCierreCaja` (
    `id` VARCHAR(191) NOT NULL,
    `cierre_id` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `monto` DOUBLE NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign keys (sin restricción de FK si las tablas origen no tienen constraint)
ALTER TABLE `CierreCaja` ADD CONSTRAINT `CierreCaja_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `VentaCierreCaja` ADD CONSTRAINT `VentaCierreCaja_cierre_id_fkey` FOREIGN KEY (`cierre_id`) REFERENCES `CierreCaja`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `GastoCierreCaja` ADD CONSTRAINT `GastoCierreCaja_cierre_id_fkey` FOREIGN KEY (`cierre_id`) REFERENCES `CierreCaja`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
