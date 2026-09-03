-- CreateTable
CREATE TABLE `Usuario` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `apellido` VARCHAR(191) NULL,
    `rut` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `rol` ENUM('ADMIN', 'OFICINA', 'REPARTIDOR') NOT NULL,
    `vehiculo_id` VARCHAR(191) NULL,
    `fecha_ingreso` DATETIME(3) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `licencia_tipo` VARCHAR(191) NULL,
    `recibe_comision` BOOLEAN NOT NULL DEFAULT false,
    `vencimiento_lic` DATETIME(3) NULL,

    UNIQUE INDEX `Usuario_rut_key`(`rut`),
    UNIQUE INDEX `Usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vehiculo` (
    `id` VARCHAR(191) NOT NULL,
    `patente` VARCHAR(191) NOT NULL,
    `marca` VARCHAR(191) NOT NULL,
    `modelo` VARCHAR(191) NOT NULL,
    `anio` INTEGER NOT NULL,
    `kilometraje_actual` INTEGER NOT NULL,
    `estado` ENUM('ACTIVO', 'EN_MANTENCION', 'FUERA_DE_SERVICIO') NOT NULL DEFAULT 'ACTIVO',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Vehiculo_patente_key`(`patente`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mantencion` (
    `id` VARCHAR(191) NOT NULL,
    `vehiculo_id` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `kilometraje` INTEGER NOT NULL,
    `mano_de_obra` INTEGER NOT NULL,
    `costo_total` INTEGER NOT NULL,
    `taller` VARCHAR(191) NOT NULL,
    `observaciones` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuario_id` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RepuestoMantencion` (
    `id` VARCHAR(191) NOT NULL,
    `mantencion_id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `costo_unitario` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AlertaVehiculo` (
    `id` VARCHAR(191) NOT NULL,
    `vehiculo_id` VARCHAR(191) NOT NULL,
    `tipo` ENUM('KM', 'FECHA') NOT NULL,
    `valor_km` INTEGER NULL,
    `fecha_alerta` DATETIME(3) NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Producto` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `categoria` ENUM('BOTELLON10', 'BOTELLON20', 'SODA', 'OTRO') NOT NULL,
    `precio_venta_nueva` DOUBLE NOT NULL,
    `precio_recarga` DOUBLE NULL,
    `stock_minimo` INTEGER NOT NULL DEFAULT 0,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MovimientoStock` (
    `id` VARCHAR(191) NOT NULL,
    `producto_id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `motivo` VARCHAR(191) NOT NULL,
    `stock_antes` INTEGER NOT NULL,
    `stock_despues` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Comision` (
    `id` VARCHAR(191) NOT NULL,
    `producto_id` VARCHAR(191) NOT NULL,
    `tipo_transaccion` ENUM('VENTA', 'RECARGA') NOT NULL,
    `tipo_cliente` ENUM('DOMICILIO', 'EMPRESA') NOT NULL,
    `monto` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cliente` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `tipo` ENUM('DOMICILIO', 'EMPRESA') NOT NULL,
    `direccion` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `rut_empresa` VARCHAR(191) NULL,
    `giro` VARCHAR(191) NULL,
    `modalidad_pago` ENUM('INMEDIATO', 'MENSUAL') NOT NULL DEFAULT 'INMEDIATO',
    `tipo_ruta` ENUM('FIJO', 'LLAMADO') NOT NULL DEFAULT 'LLAMADO',
    `notas` VARCHAR(191) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `botellones_prestados` INTEGER NOT NULL DEFAULT 0,
    `preferencia_factura` ENUM('POR_GUIA', 'CONSOLIDADO_MES', 'BOLETA', 'FACTURA') NOT NULL DEFAULT 'BOLETA',
    `sector` VARCHAR(191) NOT NULL DEFAULT 'GENERAL',
    `frecuencia` ENUM('SEMANAL', 'ALTERNA') NOT NULL DEFAULT 'SEMANAL',
    `semana_alterna` ENUM('PAR', 'IMPAR') NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RutaBase` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `dia_semana` ENUM('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES') NOT NULL,
    `frecuencia` ENUM('SEMANAL', 'ALTERNA') NOT NULL DEFAULT 'SEMANAL',
    `semana_alterna` ENUM('PAR', 'IMPAR') NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `vehiculo_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ComunaRuta` (
    `id` VARCHAR(191) NOT NULL,
    `ruta_base_id` VARCHAR(191) NOT NULL,
    `comuna` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClienteRutaBase` (
    `id` VARCHAR(191) NOT NULL,
    `ruta_base_id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL,
    `frecuencia` ENUM('SEMANAL', 'ALTERNA') NOT NULL DEFAULT 'SEMANAL',
    `semana_alterna` ENUM('PAR', 'IMPAR') NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RutaDia` (
    `id` VARCHAR(191) NOT NULL,
    `ruta_base_id` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `vehiculo_id` VARCHAR(191) NOT NULL,
    `estado` ENUM('ACTIVA', 'CERRADA') NOT NULL DEFAULT 'ACTIVA',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ParadaDia` (
    `id` VARCHAR(191) NOT NULL,
    `ruta_dia_id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `pedido_id` VARCHAR(191) NULL,
    `orden` INTEGER NOT NULL,
    `estado` ENUM('PENDIENTE', 'ENTREGADO', 'POSTERGADO') NOT NULL DEFAULT 'PENDIENTE',
    `motivo_postergacion` VARCHAR(191) NULL,
    `orden_ajustado` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pedido` (
    `id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `fecha_solicitada` DATETIME(3) NOT NULL,
    `ruta_dia_id` VARCHAR(191) NULL,
    `notas` VARCHAR(191) NULL,
    `canal_origen` ENUM('LLAMADO', 'WHATSAPP', 'WEB', 'WHATSAPP_BOT') NOT NULL,
    `estado` ENUM('PENDIENTE_CONFIRMACION', 'CONFIRMADO', 'ASIGNADO', 'ENTREGADO', 'CANCELADO') NOT NULL DEFAULT 'PENDIENTE_CONFIRMACION',
    `usuario_registro_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pagado` BOOLEAN NOT NULL DEFAULT false,
    `metodo_pago_web` ENUM('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'GUIA_MENSUAL') NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PedidoItem` (
    `id` VARCHAR(191) NOT NULL,
    `pedido_id` VARCHAR(191) NOT NULL,
    `producto_id` VARCHAR(191) NOT NULL,
    `tipo_transaccion` ENUM('VENTA', 'RECARGA') NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `cantidad_entregada` INTEGER NULL,
    `precio_historico` DOUBLE NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuiaDespacho` (
    `id` VARCHAR(191) NOT NULL,
    `numero_correlativo` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha_emision` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cliente_id` VARCHAR(191) NOT NULL,
    `pedido_id` VARCHAR(191) NULL,
    `direccion_entrega` VARCHAR(191) NOT NULL,
    `usuario_repartidor_id` VARCHAR(191) NOT NULL,
    `estado` ENUM('ENTREGADA_EFECTIVO', 'ENTREGADA_TARJETA', 'ENTREGADA_TRANSFERENCIA', 'ENTREGADA_CREDITO', 'ANULADA') NOT NULL,
    `nombre_receptor` VARCHAR(191) NULL,
    `rut_receptor` VARCHAR(191) NULL,
    `hora_entrega` DATETIME(3) NULL,
    `observaciones` VARCHAR(191) NULL,
    `total` DOUBLE NOT NULL,
    `motivo_anulacion` VARCHAR(191) NULL,
    `botellones_prestados_entrega` INTEGER NOT NULL DEFAULT 0,
    `incluida_en_cierre` BOOLEAN NOT NULL DEFAULT false,
    `fecha_cierre` DATETIME(3) NULL,

    UNIQUE INDEX `GuiaDespacho_numero_correlativo_key`(`numero_correlativo`),
    UNIQUE INDEX `GuiaDespacho_pedido_id_key`(`pedido_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemGuia` (
    `id` VARCHAR(191) NOT NULL,
    `guia_id` VARCHAR(191) NOT NULL,
    `producto_id` VARCHAR(191) NOT NULL,
    `tipo_transaccion` ENUM('VENTA', 'RECARGA') NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `precio_unitario` DOUBLE NOT NULL,
    `subtotal` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cuadratura` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `estado` ENUM('ABIERTA', 'CERRADA') NOT NULL DEFAULT 'ABIERTA',
    `total_comision` DOUBLE NOT NULL DEFAULT 0,
    `total_efectivo` DOUBLE NOT NULL DEFAULT 0,
    `total_guia_mensual` DOUBLE NOT NULL DEFAULT 0,
    `total_tarjeta` DOUBLE NOT NULL DEFAULT 0,
    `total_transferencia` DOUBLE NOT NULL DEFAULT 0,
    `motivo_reapertura` VARCHAR(191) NULL,
    `fecha_reapertura` DATETIME(3) NULL,
    `monto_bencina` INTEGER NULL,
    `km_inicial` INTEGER NULL,
    `km_final` INTEGER NULL,

    UNIQUE INDEX `Cuadratura_usuario_id_fecha_key`(`usuario_id`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CuadraturaSalida` (
    `id` VARCHAR(191) NOT NULL,
    `cuadratura_id` VARCHAR(191) NOT NULL,
    `producto_id` VARCHAR(191) NOT NULL,
    `cantidad` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CuadraturaVenta` (
    `id` VARCHAR(191) NOT NULL,
    `cuadratura_id` VARCHAR(191) NOT NULL,
    `producto_id` VARCHAR(191) NOT NULL,
    `tipo_transaccion` ENUM('VENTA', 'RECARGA') NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `tipo_cliente` ENUM('DOMICILIO', 'EMPRESA') NOT NULL,
    `guia_id` VARCHAR(191) NULL,
    `comision_calculada` DOUBLE NOT NULL DEFAULT 0,
    `metodo_pago` ENUM('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'GUIA_MENSUAL') NOT NULL DEFAULT 'EFECTIVO',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CuadraturaRetorno` (
    `id` VARCHAR(191) NOT NULL,
    `cuadratura_id` VARCHAR(191) NOT NULL,
    `producto_id` VARCHAR(191) NOT NULL,
    `cantidad` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CuadraturaGasto` (
    `id` VARCHAR(191) NOT NULL,
    `cuadratura_id` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `monto` INTEGER NOT NULL,
    `descripcion` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BotellonVacio` (
    `id` VARCHAR(191) NOT NULL,
    `cuadratura_id` VARCHAR(191) NOT NULL,
    `cantidad_total` INTEGER NOT NULL,
    `cantidad_danados` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BotellonDanado` (
    `id` VARCHAR(191) NOT NULL,
    `cuadratura_id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `foto_url` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProduccionDiaria` (
    `id` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `botellon10_cantidad` INTEGER NOT NULL DEFAULT 0,
    `botellon20_cantidad` INTEGER NOT NULL DEFAULT 0,
    `sodas_cantidad` INTEGER NOT NULL DEFAULT 0,
    `ph` DOUBLE NOT NULL,
    `ppm` DOUBLE NOT NULL,
    `observaciones` VARCHAR(191) NULL,
    `usuario_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `ProduccionDiaria_fecha_key`(`fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TuboCO2` (
    `id` VARCHAR(191) NOT NULL,
    `fecha_llegada` DATETIME(3) NOT NULL,
    `peso_kg` INTEGER NOT NULL,
    `rendimiento_estimado` INTEGER NOT NULL,
    `sodas_producidas_total` INTEGER NOT NULL DEFAULT 0,
    `kg_consumidos` DOUBLE NOT NULL DEFAULT 0,
    `fecha_cierre` DATETIME(3) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockFabrica` (
    `id` VARCHAR(191) NOT NULL,
    `producto_id` VARCHAR(191) NOT NULL,
    `cantidad` INTEGER NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StockFabrica_producto_id_key`(`producto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockCamion` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `producto_id` VARCHAR(191) NOT NULL,
    `cantidad` INTEGER NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StockCamion_usuario_id_producto_id_key`(`usuario_id`, `producto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Configuracion` (
    `id` VARCHAR(191) NOT NULL,
    `clave` VARCHAR(191) NOT NULL,
    `valor` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Configuracion_clave_key`(`clave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LogAcceso` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Dispensador` (
    `id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `marca` VARCHAR(191) NOT NULL,
    `modelo` VARCHAR(191) NOT NULL,
    `numero_serie` VARCHAR(191) NULL,
    `foto_url` VARCHAR(191) NULL,
    `estado` ENUM('EN_CLIENTE', 'EN_TALLER', 'REEMPLAZADO_TEMPORALMENTE') NOT NULL DEFAULT 'EN_CLIENTE',
    `precio_arriendo` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Dispensador_numero_serie_key`(`numero_serie`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MantencionDispensador` (
    `id` VARCHAR(191) NOT NULL,
    `dispensador_id` VARCHAR(191) NOT NULL,
    `fecha_ingreso` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `foto_ingreso_url` VARCHAR(191) NOT NULL,
    `diagnostico` VARCHAR(191) NULL,
    `fecha_termino` DATETIME(3) NULL,
    `foto_salida_url` VARCHAR(191) NULL,
    `costo_repuestos` DOUBLE NOT NULL DEFAULT 0,
    `mano_de_obra` DOUBLE NOT NULL DEFAULT 0,
    `costo_total` DOUBLE NOT NULL DEFAULT 0,
    `nombre_receptor_devolucion` VARCHAR(191) NULL,
    `maquina_reemplazo_id` VARCHAR(191) NULL,
    `problema_reportated` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RepuestoDispensador` (
    `id` VARCHAR(191) NOT NULL,
    `mantencion_id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `costo_unitario` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MaquinaReemplazo` (
    `id` VARCHAR(191) NOT NULL,
    `marca` VARCHAR(191) NOT NULL,
    `modelo` VARCHAR(191) NOT NULL,
    `estado` ENUM('DISPONIBLE', 'PRESTADA') NOT NULL DEFAULT 'DISPONIBLE',
    `cliente_id` VARCHAR(191) NULL,
    `fecha_prestamo` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notificacion` (
    `id` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `mensaje` VARCHAR(191) NOT NULL,
    `usuario_destino_id` VARCHAR(191) NOT NULL,
    `leida` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `metadata` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HistorialFinanciero` (
    `id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tipo` ENUM('COMPRA_BOTELLON', 'ARRIENDO_DISPENSADOR', 'PAGO_RECIBIDO', 'AJUSTE_CREDITO') NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `monto` DOUBLE NOT NULL,
    `documento_ref` VARCHAR(191) NULL,
    `sincronizado_facturacion` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CargaCombustible` (
    `id` VARCHAR(191) NOT NULL,
    `vehiculo_id` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `kilometraje` INTEGER NOT NULL,
    `litros` DOUBLE NOT NULL,
    `monto` INTEGER NOT NULL,
    `taller_o_bencinera` VARCHAR(191) NOT NULL,
    `numero_factura` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuario_id` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Incidencia` (
    `id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `parada_id` VARCHAR(191) NULL,
    `tipo` ENUM('NO_ESTABA', 'DEJADO_CONSERJERIA', 'PRESTAMO_BOTELLON', 'CANTIDAD_PARCIAL', 'REAGENDADO', 'OTRO') NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `resuelta` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuario_id` VARCHAR(191) NOT NULL,
    `cuadratura_id` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `image` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Session_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `accessToken` TEXT NULL,
    `refreshToken` TEXT NULL,
    `idToken` TEXT NULL,
    `accessTokenExpiresAt` DATETIME(3) NULL,
    `refreshTokenExpiresAt` DATETIME(3) NULL,
    `scope` VARCHAR(191) NULL,
    `password` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Account_providerId_accountId_key`(`providerId`, `accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Verification` (
    `id` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_vehiculo_id_fkey` FOREIGN KEY (`vehiculo_id`) REFERENCES `Vehiculo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mantencion` ADD CONSTRAINT `Mantencion_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mantencion` ADD CONSTRAINT `Mantencion_vehiculo_id_fkey` FOREIGN KEY (`vehiculo_id`) REFERENCES `Vehiculo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RepuestoMantencion` ADD CONSTRAINT `RepuestoMantencion_mantencion_id_fkey` FOREIGN KEY (`mantencion_id`) REFERENCES `Mantencion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AlertaVehiculo` ADD CONSTRAINT `AlertaVehiculo_vehiculo_id_fkey` FOREIGN KEY (`vehiculo_id`) REFERENCES `Vehiculo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoStock` ADD CONSTRAINT `MovimientoStock_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoStock` ADD CONSTRAINT `MovimientoStock_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comision` ADD CONSTRAINT `Comision_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RutaBase` ADD CONSTRAINT `RutaBase_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RutaBase` ADD CONSTRAINT `RutaBase_vehiculo_id_fkey` FOREIGN KEY (`vehiculo_id`) REFERENCES `Vehiculo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComunaRuta` ADD CONSTRAINT `ComunaRuta_ruta_base_id_fkey` FOREIGN KEY (`ruta_base_id`) REFERENCES `RutaBase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClienteRutaBase` ADD CONSTRAINT `ClienteRutaBase_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClienteRutaBase` ADD CONSTRAINT `ClienteRutaBase_ruta_base_id_fkey` FOREIGN KEY (`ruta_base_id`) REFERENCES `RutaBase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RutaDia` ADD CONSTRAINT `RutaDia_ruta_base_id_fkey` FOREIGN KEY (`ruta_base_id`) REFERENCES `RutaBase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RutaDia` ADD CONSTRAINT `RutaDia_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RutaDia` ADD CONSTRAINT `RutaDia_vehiculo_id_fkey` FOREIGN KEY (`vehiculo_id`) REFERENCES `Vehiculo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParadaDia` ADD CONSTRAINT `ParadaDia_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParadaDia` ADD CONSTRAINT `ParadaDia_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `Pedido`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParadaDia` ADD CONSTRAINT `ParadaDia_ruta_dia_id_fkey` FOREIGN KEY (`ruta_dia_id`) REFERENCES `RutaDia`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pedido` ADD CONSTRAINT `Pedido_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PedidoItem` ADD CONSTRAINT `PedidoItem_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `Pedido`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PedidoItem` ADD CONSTRAINT `PedidoItem_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuiaDespacho` ADD CONSTRAINT `GuiaDespacho_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuiaDespacho` ADD CONSTRAINT `GuiaDespacho_usuario_repartidor_id_fkey` FOREIGN KEY (`usuario_repartidor_id`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuiaDespacho` ADD CONSTRAINT `GuiaDespacho_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `Pedido`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemGuia` ADD CONSTRAINT `ItemGuia_guia_id_fkey` FOREIGN KEY (`guia_id`) REFERENCES `GuiaDespacho`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemGuia` ADD CONSTRAINT `ItemGuia_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cuadratura` ADD CONSTRAINT `Cuadratura_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CuadraturaSalida` ADD CONSTRAINT `CuadraturaSalida_cuadratura_id_fkey` FOREIGN KEY (`cuadratura_id`) REFERENCES `Cuadratura`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CuadraturaSalida` ADD CONSTRAINT `CuadraturaSalida_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CuadraturaVenta` ADD CONSTRAINT `CuadraturaVenta_cuadratura_id_fkey` FOREIGN KEY (`cuadratura_id`) REFERENCES `Cuadratura`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CuadraturaVenta` ADD CONSTRAINT `CuadraturaVenta_guia_id_fkey` FOREIGN KEY (`guia_id`) REFERENCES `GuiaDespacho`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CuadraturaVenta` ADD CONSTRAINT `CuadraturaVenta_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CuadraturaRetorno` ADD CONSTRAINT `CuadraturaRetorno_cuadratura_id_fkey` FOREIGN KEY (`cuadratura_id`) REFERENCES `Cuadratura`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CuadraturaRetorno` ADD CONSTRAINT `CuadraturaRetorno_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CuadraturaGasto` ADD CONSTRAINT `CuadraturaGasto_cuadratura_id_fkey` FOREIGN KEY (`cuadratura_id`) REFERENCES `Cuadratura`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BotellonVacio` ADD CONSTRAINT `BotellonVacio_cuadratura_id_fkey` FOREIGN KEY (`cuadratura_id`) REFERENCES `Cuadratura`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BotellonDanado` ADD CONSTRAINT `BotellonDanado_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BotellonDanado` ADD CONSTRAINT `BotellonDanado_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProduccionDiaria` ADD CONSTRAINT `ProduccionDiaria_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockFabrica` ADD CONSTRAINT `StockFabrica_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockCamion` ADD CONSTRAINT `StockCamion_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockCamion` ADD CONSTRAINT `StockCamion_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogAcceso` ADD CONSTRAINT `LogAcceso_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dispensador` ADD CONSTRAINT `Dispensador_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MantencionDispensador` ADD CONSTRAINT `MantencionDispensador_dispensador_id_fkey` FOREIGN KEY (`dispensador_id`) REFERENCES `Dispensador`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MantencionDispensador` ADD CONSTRAINT `MantencionDispensador_maquina_reemplazo_id_fkey` FOREIGN KEY (`maquina_reemplazo_id`) REFERENCES `MaquinaReemplazo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RepuestoDispensador` ADD CONSTRAINT `RepuestoDispensador_mantencion_id_fkey` FOREIGN KEY (`mantencion_id`) REFERENCES `MantencionDispensador`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistorialFinanciero` ADD CONSTRAINT `HistorialFinanciero_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Cliente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CargaCombustible` ADD CONSTRAINT `CargaCombustible_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CargaCombustible` ADD CONSTRAINT `CargaCombustible_vehiculo_id_fkey` FOREIGN KEY (`vehiculo_id`) REFERENCES `Vehiculo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incidencia` ADD CONSTRAINT `Incidencia_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incidencia` ADD CONSTRAINT `Incidencia_parada_id_fkey` FOREIGN KEY (`parada_id`) REFERENCES `ParadaDia`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incidencia` ADD CONSTRAINT `Incidencia_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incidencia` ADD CONSTRAINT `Incidencia_cuadratura_id_fkey` FOREIGN KEY (`cuadratura_id`) REFERENCES `Cuadratura`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
