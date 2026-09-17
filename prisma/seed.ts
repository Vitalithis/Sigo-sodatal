import { PrismaClient } from '../lib/prisma/generated'; // Ajusta esta ruta si es necesario

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la población de la base de datos (Seed)...');

  // =========================================================
  // 1. CREAR COMUNAS Y SECTORES (San Pedro de la Paz y Concepción)
  // =========================================================
  const comunaSanPedro = await prisma.comuna.upsert({
    where: { nombre: 'San Pedro de la Paz' },
    update: {},
    create: {
      nombre: 'San事前 Pedro de la Paz',
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
      sectores: {
        create: [
          { nombre: 'Centro' },
          { nombre: 'Barrio Universitario' },
          { nombre: 'Lomas de San Andrés' },
        ],
      },
    },
  });

  // Obtener IDs de algunos sectores para usarlos luego
  const sectorAndalue = await prisma.sector.findFirst({ where: { nombre: 'Andalué' } });
  const sectorCentro = await prisma.sector.findFirst({ where: { nombre: 'Centro' } });

  console.log('✅ Comunas y Sectores creados.');

  // =========================================================
  // 2. CREAR PRODUCTOS (Catálogo Sodatal)
  // =========================================================
  const prodBotellon20 = await prisma.producto.upsert({
    where: { id: 'prod-botellon-20l' },
    update: {},
    create: {
      id: 'prod-botellon-20l',
      nombre: 'Botellón 20 Litros',
      categoria: 'BOTELLON20',
      precio_venta_nueva: 6000,
      precio_recarga: 3000,
      stock_minimo: 50,
    },
  });

  const prodBotellon10 = await prisma.producto.upsert({
    where: { id: 'prod-botellon-10l' },
    update: {},
    create: {
      id: 'prod-botellon-10l',
      nombre: 'Botellón 10 Litros',
      categoria: 'BOTELLON10',
      precio_venta_nueva: 4500,
      precio_recarga: 2000,
      stock_minimo: 30,
    },
  });

  const prodSoda = await prisma.producto.upsert({
    where: { id: 'prod-soda' },
    update: {},
    create: {
      id: 'prod-soda',
      nombre: 'Sifón Soda 1.5L',
      categoria: 'SODA',
      precio_venta_nueva: 1500,
      precio_recarga: 1500, // La soda suele ser intercambio
      stock_minimo: 100,
    },
  });

  console.log('✅ Productos creados.');

  // =========================================================
  // 3. CREAR VEHÍCULOS (Flota)
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
      estado: 'ACTIVO',
    },
  });

  console.log('✅ Vehículos creados.');

  // =========================================================
  // 4. CREAR USUARIOS (Staff)
  // =========================================================
  const repartidor = await prisma.usuario.upsert({
    where: { email: 'repartidor@sodatal.cl' },
    update: {},
    create: {
      rut: '15111222-3',
      nombre: 'Carlos',
      apellido: 'Soto',
      telefono: '+56911112222',
      email: 'repartidor@sodatal.cl',
      rol: 'REPARTIDOR',
      vehiculo_id: camion1.id, // Le asignamos el camión inmediatamente
      fecha_ingreso: new Date('2024-01-15'),
      activo: true,
    },
  });

  console.log('✅ Usuarios del staff creados.');

  // =========================================================
  // 5. CREAR CLIENTES
  // =========================================================
  const cliente1 = await prisma.cliente.upsert({
    where: { id: 'cliente-domicilio-1' },
    update: {},
    create: {
      id: 'cliente-domicilio-1',
      nombre: 'María Teresa Ruiz',
      tipo: 'DOMICILIO',
      direccion: 'Av. El Venado 1234, Condominio Los Robles',
      telefono: '+56988887777',
      email: 'mruiz@ejemplo.cl',
      preferencia_factura: 'BOLETA',
      modalidad_pago: 'INMEDIATO',
      tipo_ruta: 'FIJO',
      botellones_prestados: 2,
      sector_id: sectorAndalue?.id,
      notas: 'Llamar a conserjería al llegar',
    },
  });

  const cliente2 = await prisma.cliente.upsert({
    where: { id: 'cliente-empresa-1' },
    update: {},
    create: {
      id: 'cliente-empresa-1',
      nombre: 'Constructora BioBío SpA',
      tipo: 'EMPRESA',
      rut_empresa: '76.555.444-3',
      giro: 'Construcción',
      direccion: 'Caupolicán 550, Oficina 402',
      telefono: '+56412223333',
      email: 'compras@constructorabiobio.cl',
      preferencia_factura: 'FACTURA',
      modalidad_pago: 'MENSUAL', // Las empresas suelen pagar a fin de mes
      tipo_ruta: 'LLAMADO',
      botellones_prestados: 5,
      sector_id: sectorCentro?.id,
    },
  });

  console.log('✅ Clientes creados.');

  // =========================================================
  // 6. CREAR UN DISPENSADOR (Comodato Empresa)
  // =========================================================
  await prisma.dispensador.upsert({
    where: { numero_serie: 'SN-AQUALINE-001' },
    update: {},
    create: {
      cliente_id: cliente2.id,
      marca: 'AquaLine',
      modelo: 'Frío/Caliente Piso',
      numero_serie: 'SN-AQUALINE-001',
      estado: 'EN_CLIENTE',
      precio_arriendo: 15000,
    },
  });

  console.log('✅ Dispensador asignado a empresa.');
  console.log('🌳 ¡Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });