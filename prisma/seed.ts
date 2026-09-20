import { PrismaClient, CategoriaProducto, TipoCliente, ModalidadPago, TipoRuta, PreferenciaFacturacion, EstadoDispensador, Rol, EstadoVehiculo, DiaSemana } from '../lib/prisma/generated';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la población completa de la base de datos (Seed)...');

  // =========================================================
  // 1. CREAR CONFIGURACIÓN INICIAL (Ej: Umbral de CO2 y rendimientos)
  // =========================================================
  const configs = [
    { clave: 'co2_alerta_porcentaje', valor: '20' },
    { clave: 'co2_rendimiento_45kg', valor: '3000' },
    { clave: 'co2_rendimiento_35kg', valor: '2300' },
  ];

  for (const cfg of configs) {
    await prisma.configuracion.upsert({
      where: { clave: cfg.clave },
      update: {},
      create: cfg,
    });
  }
  console.log('✅ Configuración inicial creada.');

  // =========================================================
  // 2. CREAR COMUNAS Y SECTORES (San Pedro de la Paz y Concepción)
  // =========================================================
  const comunaSanPedro = await prisma.comuna.upsert({
    where: { nombre: 'San Pedro de la Paz' },
    update: {},
    create: {
      nombre: 'San Pedro de la Paz',
      activa: true,
      sectores: {
        create: [
          { nombre: 'Andalué' },
          { nombre: 'Huertos Familiares' },
          { nombre: 'San Pedro del Valle' },
          { nombre: 'Michaihue' },
        ],
      },
    },
  });

  const comunaConce = await prisma.comuna.upsert({
    where: { nombre: 'Concepción' },
    update: {},
    create: {
      nombre: 'Concepción',
      activa: true,
      sectores: {
        create: [
          { nombre: 'Centro' },
          { nombre: 'Barrio Universitario' },
          { nombre: 'Lomas de San Andrés' },
        ],
      },
    },
  });

  // Obtener IDs de sectores clave
  const sectorAndalue = await prisma.sector.findFirst({ where: { nombre: 'Andalué' } });
  const sectorCentro = await prisma.sector.findFirst({ where: { nombre: 'Centro' } });

  console.log('✅ Comunas y Sectores creados.');

  // =========================================================
  // 3. CREAR PRODUCTOS (Catálogo Sodatal) y Stock de Fábrica
  // =========================================================
  const prodBotellon20 = await prisma.producto.upsert({
    where: { id: 'prod-botellon-20l' },
    update: {},
    create: {
      id: 'prod-botellon-20l',
      nombre: 'Botellón 20 Litros',
      categoria: CategoriaProducto.BOTELLON20,
      precio_venta_nueva: 6000,
      precio_recarga: 3000,
      stock_minimo: 50,
      activo: true,
      stock_fabrica: {
        create: { cantidad: 200 }
      }
    },
  });

  const prodBotellon10 = await prisma.producto.upsert({
    where: { id: 'prod-botellon-10l' },
    update: {},
    create: {
      id: 'prod-botellon-10l',
      nombre: 'Botellón 10 Litros',
      categoria: CategoriaProducto.BOTELLON10,
      precio_venta_nueva: 4500,
      precio_recarga: 2000,
      stock_minimo: 30,
      activo: true,
      stock_fabrica: {
        create: { cantidad: 150 }
      }
    },
  });

  const prodSoda = await prisma.producto.upsert({
    where: { id: 'prod-soda' },
    update: {},
    create: {
      id: 'prod-soda',
      nombre: 'Sifón Soda 1.5L',
      categoria: CategoriaProducto.SODA,
      precio_venta_nueva: 1500,
      precio_recarga: 1500,
      stock_minimo: 100,
      activo: true,
      stock_fabrica: {
        create: { cantidad: 300 }
      }
    },
  });

  console.log('✅ Productos y Stock de Fábrica creados.');

  // =========================================================
  // 4. CREAR VEHÍCULOS (Flota)
  // =========================================================
  const camion1 = await prisma.vehiculo.upsert({
    where: { patente: 'AB-CD-12' },
    update: {},
    create: {
      patente: 'AB-CD-12',
      marca: 'Kia',
      modelo: 'Frontier',
      anio: 2020,
      kilometraje_actual: 85000,
      estado: EstadoVehiculo.ACTIVO,
    },
  });

  const camion2 = await prisma.vehiculo.upsert({
    where: { patente: 'XY-ZW-34' },
    update: {},
    create: {
      patente: 'XY-ZW-34',
      marca: 'Hyundai',
      modelo: 'Porter',
      anio: 2022,
      kilometraje_actual: 32000,
      estado: EstadoVehiculo.ACTIVO,
    },
  });

  console.log('✅ Vehículos de la flota creados.');

  // =========================================================
  // 5. CREAR USUARIOS (Staff y Better-Auth Sincronizado)
  // =========================================================
  // Usuario Administrador (Vinculado a tu cuenta Better-Auth)
  const authUserAdmin = await prisma.user.upsert({
    where: { email: 'docampo@ing.ucsc.cl' },
    update: {},
    create: {
      id: 'user-admin-id-01',
      name: 'Dan Ocampo',
      email: 'docampo@ing.ucsc.cl',
      emailVerified: true,
      rut: '19906083-k',
    },
  });

  const usuarioAdmin = await prisma.usuario.upsert({
    where: { email: 'docampo@ing.ucsc.cl' },
    update: {},
    create: {
      id: 'usuario-admin-id-01',
      user_id: authUserAdmin.id,
      rut: '19906083-k',
      nombre: 'Dan',
      apellido: 'Ocampo',
      telefono: '+56999999999',
      email: 'docampo@ing.ucsc.cl',
      rol: Rol.ADMIN,
      fecha_ingreso: new Date('2023-01-01'),
      activo: true,
    },
  });

  // Usuario Repartidor
  const authUserRepartidor = await prisma.user.upsert({
    where: { email: 'repartidor@sodatal.cl' },
    update: {},
    create: {
      id: 'user-repartidor-id-02',
      name: 'Carlos Soto',
      email: 'repartidor@sodatal.cl',
      emailVerified: true,
      rut: '15111222-3',
    },
  });

  const repartidor = await prisma.usuario.upsert({
    where: { email: 'repartidor@sodatal.cl' },
    update: {},
    create: {
      id: 'usuario-repartidor-id-02',
      user_id: authUserRepartidor.id,
      rut: '15111222-3',
      nombre: 'Carlos',
      apellido: 'Soto',
      telefono: '+56911112222',
      email: 'repartidor@sodatal.cl',
      rol: Rol.REPARTIDOR,
      vehiculo_id: camion1.id,
      fecha_ingreso: new Date('2024-01-15'),
      activo: true,
      licencia_tipo: 'B',
      recibe_comision: true,
    },
  });

  console.log('✅ Usuarios del staff y credenciales Auth sincronizados.');

  // =========================================================
  // 6. CREAR CLIENTES DE PRUEBA
  // =========================================================
  const cliente1 = await prisma.cliente.upsert({
    where: { id: 'cliente-domicilio-1' },
    update: {},
    create: {
      id: 'cliente-domicilio-1',
      nombre: 'María Teresa Ruiz',
      tipo: TipoCliente.DOMICILIO,
      direccion: 'Av. El Venado 1234, Condominio Los Robles',
      telefono: '+56988887777',
      email: 'mruiz@ejemplo.cl',
      preferencia_factura: PreferenciaFacturacion.BOLETA,
      modalidad_pago: ModalidadPago.INMEDIATO,
      tipo_ruta: TipoRuta.FIJO,
      botellones_prestados: 2,
      sector_id: sectorAndalue?.id,
      notas: 'Llamar a conserjería al llegar',
      activo: true,
    },
  });

  const cliente2 = await prisma.cliente.upsert({
    where: { id: 'cliente-empresa-1' },
    update: {},
    create: {
      id: 'cliente-empresa-1',
      nombre: 'Constructora BioBío SpA',
      tipo: TipoCliente.EMPRESA,
      rut_empresa: '76.555.444-3',
      giro: 'Construcción',
      direccion: 'Caupolicán 550, Oficina 402',
      telefono: '+56412223333',
      email: 'compras@constructorabiobio.cl',
      preferencia_factura: PreferenciaFacturacion.FACTURA,
      modalidad_pago: ModalidadPago.MENSUAL,
      tipo_ruta: TipoRuta.LLAMADO,
      botellones_prestados: 5,
      sector_id: sectorCentro?.id,
      activo: true,
    },
  });

  console.log('✅ Clientes creados.');

  // =========================================================
  // 7. CREAR DISPENSADORES Y EQUIPOS DE REEMPLAZO
  // =========================================================
  await prisma.dispensador.upsert({
    where: { numero_serie: 'SN-AQUALINE-001' },
    update: {},
    create: {
      cliente_id: cliente2.id,
      marca: 'AquaLine',
      modelo: 'Frío/Caliente Piso',
      numero_serie: 'SN-AQUALINE-001',
      estado: EstadoDispensador.EN_CLIENTE,
      precio_arriendo: 15000,
    },
  });

  await prisma.maquinaReemplazo.create({
    data: {
      marca: 'Midea',
      modelo: 'Sobremesa Standard',
      estado: 'DISPONIBLE',
    },
  });

  console.log('✅ Dispensadores y máquinas de reemplazo configurados.');

  // =========================================================
  // 8. CREAR RUTAS BASE (Plantillas de distribución)
  // =========================================================
  if (sectorAndalue) {
    await prisma.rutaBase.create({
      data: {
        nombre: 'Ruta Troncal Lunes - Andalué',
        dia_semana: DiaSemana.LUNES,
        usuario_id: repartidor.id,
        vehiculo_id: camion1.id,
        frecuencia: 'SEMANAL',
        clientes: {
          create: [
            {
              cliente_id: cliente1.id,
              orden: 1,
              bot20_default: 2,
              bot10_default: 1,
              soda_default: 0,
            }
          ]
        },
        sectores: {
          create: [
            { sector_id: sectorAndalue.id }
          ]
        }
      },
    });
  }

  console.log('✅ Rutas Base configuradas.');

  // =========================================================
  // 9. INVENTARIO ADICIONAL Y FABRICA (Tubo de CO2 activo)
  // =========================================================
  await prisma.stockCamion.upsert({
    where: {
      usuario_id_producto_id: {
        usuario_id: repartidor.id,
        producto_id: prodBotellon20.id,
      }
    },
    update: {},
    create: {
      usuario_id: repartidor.id,
      producto_id: prodBotellon20.id,
      cantidad: 30,
    },
  });

  await prisma.tuboCO2.create({
    data: {
      fecha_llegada: new Date(),
      peso_kg: 45,
      rendimiento_estimado: 3000,
      activo: true,
    },
  });

  console.log('✅ Stock en camión y Tubo de CO₂ inicial agregados.');
  console.log('🌳 ¡Seed completado y sincronizado exitosamente con el esquema!');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });