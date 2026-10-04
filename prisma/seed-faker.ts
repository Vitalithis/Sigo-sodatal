import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { 
  PrismaClient, 
  TipoCliente, 
  PreferenciaFacturacion, 
  ModalidadPago, 
  TipoRuta, 
  Frecuencia,
  CategoriaProducto,
  TipoTransaccion,
  EstadoDispensador,
  Rol,
  EstadoVehiculo,
  DiaSemana,
  EstadoRuta,
  EstadoParada,
  EstadoPedido,
  CanalOrigen,
  EstadoGuia,
  MetodoPago,
  MetodoPagoCaja,
  EstadoCuadratura,
  EstadoCierreCaja,
  TipoAlerta
} from '../lib/prisma/generated';
import { fakerES as faker } from '@faker-js/faker';
import { hashPassword } from '@better-auth/utils/password';
import { getHoyHabilStr, getFechaNormalizadaUTC } from '../src/lib/fechas';

const prisma = new PrismaClient();

// Helper para generar RUT chileno válido con algoritmo módulo 11
function generarRutChileno(): string {
  const numero = Math.floor(6000000 + Math.random() * 19000000);
  let suma = 0;
  let multiplicador = 2;
  const numStr = numero.toString();
  for (let i = numStr.length - 1; i >= 0; i--) {
    suma += parseInt(numStr.charAt(i), 10) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  let dv = '0';
  if (resto === 11) dv = '0';
  else if (resto === 10) dv = 'K';
  else dv = resto.toString();

  const formatted = numero.toLocaleString('es-CL');
  return `${formatted}-${dv}`;
}

async function main() {
  console.log('🚀 [SEED-FAKER] Iniciando generación completa de datos para Sodatal...');

  console.log('🧹 Limpiando datos operativos y de prueba previos...');
  await prisma.repuestoDispensador.deleteMany({});
  await prisma.mantencionDispensador.deleteMany({});
  await prisma.maquinaReemplazo.deleteMany({});
  await prisma.dispensador.deleteMany({});
  await prisma.itemGuia.deleteMany({});
  await prisma.guiaDespacho.deleteMany({});
  await prisma.paradaDia.deleteMany({});
  await prisma.rutaDia.deleteMany({});
  await prisma.pedidoItem.deleteMany({});
  await prisma.pedido.deleteMany({});
  await prisma.clienteRutaBase.deleteMany({});
  await prisma.rutaBaseSector.deleteMany({});
  await prisma.rutaBase.deleteMany({});
  await prisma.incidencia.deleteMany({});
  await prisma.historialFinanciero.deleteMany({});
  await prisma.botellonDanado.deleteMany({});
  await prisma.botellonVacio.deleteMany({});
  await prisma.cuadraturaGasto.deleteMany({});
  await prisma.cuadraturaVenta.deleteMany({});
  await prisma.cuadraturaRetorno.deleteMany({});
  await prisma.cuadraturaSalida.deleteMany({});
  await prisma.cuadratura.deleteMany({});
  await prisma.ventaCierreCaja.deleteMany({});
  await prisma.gastoCierreCaja.deleteMany({});
  await prisma.cierreCaja.deleteMany({});
  await prisma.produccionDiaria.deleteMany({});
  await prisma.tuboCO2.deleteMany({});
  await prisma.repuestoMantencion.deleteMany({});
  await prisma.mantencion.deleteMany({});
  await prisma.alertaVehiculo.deleteMany({});
  await prisma.cargaCombustible.deleteMany({});
  await prisma.cliente.deleteMany({});


  // =========================================================================
  // 1. CONFIGURACIÓN DEL SISTEMA
  // =========================================================================
  const configs = [
    { clave: 'co2_alerta_porcentaje', valor: '20' },
    { clave: 'co2_rendimiento_45kg', valor: '3000' },
    { clave: 'co2_rendimiento_35kg', valor: '2300' },
    { clave: 'precio_recarga_20l', valor: '3000' },
    { clave: 'precio_recarga_10l', valor: '2000' },
  ];

  for (const cfg of configs) {
    await prisma.configuracion.upsert({
      where: { clave: cfg.clave },
      update: { valor: cfg.valor },
      create: cfg,
    });
  }
  console.log('✅ Configuración del sistema lista.');

  // =========================================================================
  // 2. COMUNAS Y SECTORES (Gran Concepción)
  // =========================================================================
  const datosComunas = [
    {
      nombre: 'San Pedro de la Paz',
      sectores: ['Andalué', 'Huertos Familiares', 'San Pedro del Valle', 'Michaihue', 'Lomas Coloradas', 'Villa San Pedro']
    },
    {
      nombre: 'Concepción',
      sectores: ['Centro', 'Barrio Universitario', 'Lomas de San Andrés', 'Collao', 'Agüita de la Perdiz', 'Lorenzo Arenas']
    },
    {
      nombre: 'Chiguayante',
      sectores: ['Villuco', 'Lonco', 'Las Condes', 'Manquimávida', 'La Leonera']
    },
    {
      nombre: 'Talcahuano',
      sectores: ['Las Higueras', 'Medio Camino', 'Brisas del Sol', 'Denavi Sur', 'Los Cerros']
    }
  ];

  const sectoresRegistrados: { id: string; nombre: string; comunaId: string; comunaNombre: string }[] = [];

  for (const cData of datosComunas) {
    const comuna = await prisma.comuna.upsert({
      where: { nombre: cData.nombre },
      update: {},
      create: { nombre: cData.nombre, activa: true },
    });

    for (const secNombre of cData.sectores) {
      let sector = await prisma.sector.findFirst({
        where: { nombre: secNombre, comuna_id: comuna.id },
      });
      if (!sector) {
        sector = await prisma.sector.create({
          data: { nombre: secNombre, comuna_id: comuna.id, activo: true },
        });
      }
      sectoresRegistrados.push({ id: sector.id, nombre: sector.nombre, comunaId: comuna.id, comunaNombre: comuna.nombre });
    }
  }
  console.log(`✅ ${sectoresRegistrados.length} sectores registrados en 4 comunas.`);

  // =========================================================================
  // 3. PRODUCTOS Y STOCK DE FÁBRICA
  // =========================================================================
  const productosData = [
    {
      id: 'prod-botellon-20l',
      nombre: 'Botellón Purificada 20L',
      categoria: CategoriaProducto.BOTELLON20,
      precio_venta_nueva: 6000,
      precio_recarga: 3000,
      stock_minimo: 50,
      stock_inicial: 350,
    },
    {
      id: 'prod-botellon-10l',
      nombre: 'Botellón Purificada 10L',
      categoria: CategoriaProducto.BOTELLON10,
      precio_venta_nueva: 4500,
      precio_recarga: 2000,
      stock_minimo: 30,
      stock_inicial: 200,
    },
    {
      id: 'prod-soda',
      nombre: 'Sifón Soda 1.5L',
      categoria: CategoriaProducto.SODA,
      precio_venta_nueva: 1500,
      precio_recarga: 1500,
      stock_minimo: 80,
      stock_inicial: 450,
    },
    {
      id: 'prod-dispensador-pedestal',
      nombre: 'Dispensador Frío/Caliente Pedestal',
      categoria: CategoriaProducto.OTRO,
      precio_venta_nueva: 85000,
      precio_recarga: null,
      stock_minimo: 5,
      stock_inicial: 18,
    }
  ];

  for (const p of productosData) {
    const { stock_inicial, ...prodProps } = p;
    await prisma.producto.upsert({
      where: { id: prodProps.id },
      update: prodProps,
      create: {
        ...prodProps,
        stock_fabrica: {
          create: { cantidad: stock_inicial }
        }
      }
    });
  }
  console.log('✅ Catálogo de productos y stock de fábrica inicializados.');

  // =========================================================================
  // 4. FLOTA DE VEHÍCULOS
  // =========================================================================
  const camion1 = await prisma.vehiculo.upsert({
    where: { patente: 'AB-CD-12' },
    update: {},
    create: {
      patente: 'AB-CD-12',
      marca: 'Kia',
      modelo: 'Frontier 2.5',
      anio: 2021,
      kilometraje_actual: 86450,
      estado: EstadoVehiculo.ACTIVO,
    }
  });

  const camion2 = await prisma.vehiculo.upsert({
    where: { patente: 'XY-ZW-34' },
    update: {},
    create: {
      patente: 'XY-ZW-34',
      marca: 'Hyundai',
      modelo: 'Porter H-100',
      anio: 2023,
      kilometraje_actual: 34200,
      estado: EstadoVehiculo.ACTIVO,
    }
  });

  const camion3 = await prisma.vehiculo.upsert({
    where: { patente: 'GH-JK-56' },
    update: {},
    create: {
      patente: 'GH-JK-56',
      marca: 'Chevrolet',
      modelo: 'N300 Max',
      anio: 2020,
      kilometraje_actual: 62100,
      estado: EstadoVehiculo.ACTIVO,
    }
  });

  // Mantenciones de prueba
  await prisma.mantencion.create({
    data: {
      vehiculo_id: camion1.id,
      tipo: 'PREVENTIVA',
      fecha: new Date('2026-09-15'),
      kilometraje: 85000,
      mano_de_obra: 45000,
      costo_total: 125000,
      taller: 'Taller Mecánico San Pedro',
      observaciones: 'Cambio de aceite, filtro de aire y pastillas de freno delanteras.',
      repuestos: {
        create: [
          { nombre: 'Filtro Aceite Kia', cantidad: 1, costo_unitario: 15000 },
          { nombre: 'Aceite 10W40 5L', cantidad: 1, costo_unitario: 35000 },
          { nombre: 'Pastillas Freno', cantidad: 1, costo_unitario: 30000 },
        ]
      }
    }
  });

  // Carga de combustible reciente
  await prisma.cargaCombustible.create({
    data: {
      vehiculo_id: camion1.id,
      fecha: new Date('2026-10-02'),
      kilometraje: 86400,
      litros: 48.5,
      monto: 52000,
      taller_o_bencinera: 'Copec San Pedro',
      numero_factura: 154201,
    }
  });

  console.log('✅ Flota de camiones con mantenciones y combustible listos.');

  // =========================================================================
  // 5. USUARIOS DEL SISTEMA Y AUTENTICACIÓN (Better-Auth)
  // =========================================================================
  const passHash = await hashPassword('admin1234');
  const passRepartidor = await hashPassword('repartidor1234');

  // Administrador Principal
  const authAdmin = await prisma.user.upsert({
    where: { email: 'docampo@ing.ucsc.cl' },
    update: {},
    create: {
      id: 'auth-user-admin',
      name: 'Dan Ocampo',
      email: 'docampo@ing.ucsc.cl',
      emailVerified: true,
      rut: '19.906.083-K',
    }
  });

  const adminUsuario = await prisma.usuario.upsert({
    where: { email: 'docampo@ing.ucsc.cl' },
    update: {},
    create: {
      id: 'usuario-admin-01',
      user_id: authAdmin.id,
      rut: '19.906.083-K',
      nombre: 'Dan',
      apellido: 'Ocampo',
      telefono: '+56999998888',
      email: 'docampo@ing.ucsc.cl',
      rol: Rol.ADMIN,
      fecha_ingreso: new Date('2023-01-01'),
      activo: true,
    }
  });

  await prisma.account.upsert({
    where: { providerId_accountId: { providerId: 'credential', accountId: authAdmin.id } },
    update: { password: passHash },
    create: {
      id: 'account-admin',
      accountId: authAdmin.id,
      providerId: 'credential',
      issuer: 'local:credential',
      userId: authAdmin.id,
      password: passHash,
    }
  });

  // Repartidor 1
  const authRep1 = await prisma.user.upsert({
    where: { email: 'carlos.soto@sodatal.cl' },
    update: {},
    create: {
      id: 'auth-user-rep1',
      name: 'Carlos Soto',
      email: 'carlos.soto@sodatal.cl',
      emailVerified: true,
      rut: '16.450.320-4',
    }
  });

  const repartidor1 = await prisma.usuario.upsert({
    where: { email: 'carlos.soto@sodatal.cl' },
    update: {},
    create: {
      id: 'usuario-rep1',
      user_id: authRep1.id,
      rut: '16.450.320-4',
      nombre: 'Carlos',
      apellido: 'Soto',
      telefono: '+56987654321',
      email: 'carlos.soto@sodatal.cl',
      rol: Rol.REPARTIDOR,
      vehiculo_id: camion1.id,
      fecha_ingreso: new Date('2024-02-01'),
      activo: true,
      licencia_tipo: 'A4',
      recibe_comision: true,
    }
  });

  await prisma.account.upsert({
    where: { providerId_accountId: { providerId: 'credential', accountId: authRep1.id } },
    update: { password: passRepartidor },
    create: {
      id: 'account-rep1',
      accountId: authRep1.id,
      providerId: 'credential',
      issuer: 'local:credential',
      userId: authRep1.id,
      password: passRepartidor,
    }
  });

  // Repartidor 2
  const authRep2 = await prisma.user.upsert({
    where: { email: 'rodrigo.munoz@sodatal.cl' },
    update: {},
    create: {
      id: 'auth-user-rep2',
      name: 'Rodrigo Muñoz',
      email: 'rodrigo.munoz@sodatal.cl',
      emailVerified: true,
      rut: '17.820.190-2',
    }
  });

  const repartidor2 = await prisma.usuario.upsert({
    where: { email: 'rodrigo.munoz@sodatal.cl' },
    update: {},
    create: {
      id: 'usuario-rep2',
      user_id: authRep2.id,
      rut: '17.820.190-2',
      nombre: 'Rodrigo',
      apellido: 'Muñoz',
      telefono: '+56976543210',
      email: 'rodrigo.munoz@sodatal.cl',
      rol: Rol.REPARTIDOR,
      vehiculo_id: camion2.id,
      fecha_ingreso: new Date('2024-05-10'),
      activo: true,
      licencia_tipo: 'A4',
      recibe_comision: true,
    }
  });

  await prisma.account.upsert({
    where: { providerId_accountId: { providerId: 'credential', accountId: authRep2.id } },
    update: { password: passRepartidor },
    create: {
      id: 'account-rep2',
      accountId: authRep2.id,
      providerId: 'credential',
      issuer: 'local:credential',
      userId: authRep2.id,
      password: passRepartidor,
    }
  });

  console.log('✅ Usuarios del sistema (Admin, Repartidores) y contraseñas creados.');

  // =========================================================================
  // 6. CLIENTES FICTICIOS CON FAKER (Empresas y Domicilios)
  // =========================================================================
  const TOTAL_CLIENTES = 120;
  console.log(`🌱 Generando ${TOTAL_CLIENTES} clientes realistas con Faker...`);

  const calles = [
    'Av. Pedro de Valdivia', 'Av. El Venado', 'O\'Higgins', 'Barros Arana', 'Aníbal Pinto',
    'Caupolicán', 'Chacabuco', 'Av. Collao', 'Av. Alessandri', 'Michimalonco',
    'Los Carrera', 'San Martín', 'Maipú', 'Freire', 'Victor Lamas', 'Paicaví'
  ];

  const clientesCreados: any[] = [];

  for (let i = 0; i < TOTAL_CLIENTES; i++) {
    const esEmpresa = Math.random() < 0.3; // 30% empresas, 70% domicilios
    const sector = sectoresRegistrados[Math.floor(Math.random() * sectoresRegistrados.length)];
    const calle = calles[Math.floor(Math.random() * calles.length)];
    const numero = faker.number.int({ min: 10, max: 4800 });

    let nombre: string;
    let rutEmpresa: string | null = null;
    let giro: string | null = null;

    if (esEmpresa) {
      nombre = `${faker.company.name()} ${faker.helpers.arrayElement(['SpA', 'Ltda.', 'S.A.'])}`;
      rutEmpresa = generarRutChileno();
      giro = faker.company.buzzPhrase();
    } else {
      nombre = `${faker.person.firstName()} ${faker.person.lastName()} ${faker.person.lastName()}`;
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombre,
        tipo: esEmpresa ? TipoCliente.EMPRESA : TipoCliente.DOMICILIO,
        direccion: `${calle} #${numero}, ${sector.nombre}`,
        telefono: `+569${faker.string.numeric(8)}`,
        email: faker.internet.email({ firstName: nombre.split(' ')[0], provider: 'gmail.com' }).toLowerCase(),
        rut_empresa: rutEmpresa,
        giro,
        modalidad_pago: esEmpresa ? ModalidadPago.MENSUAL : ModalidadPago.INMEDIATO,
        preferencia_factura: esEmpresa ? PreferenciaFacturacion.FACTURA : PreferenciaFacturacion.BOLETA,
        tipo_ruta: TipoRuta.FIJO,
        botellones_prestados: faker.number.int({ min: 1, max: esEmpresa ? 15 : 4 }),
        sector_id: sector.id,
        frecuencia: faker.helpers.arrayElement([Frecuencia.SEMANAL, Frecuencia.QUINCENAL, Frecuencia.MENSUAL]),
        deuda: Math.random() < 0.25 ? faker.number.int({ min: 2, max: 20 }) * 3000 : 0,
        activo: true,
        notas: Math.random() < 0.3 ? faker.lorem.sentence() : null,
      }
    });

    clientesCreados.push(cliente);
  }
  console.log(`✅ ${clientesCreados.length} clientes creados con éxito.`);

  // =========================================================================
  // 7. DISPENSADORES Y TALLER
  // =========================================================================
  const empresas = clientesCreados.filter(c => c.tipo === TipoCliente.EMPRESA);
  for (let i = 0; i < Math.min(8, empresas.length); i++) {
    await prisma.dispensador.create({
      data: {
        cliente_id: empresas[i].id,
        marca: 'AquaLine',
        modelo: 'Frío/Caliente Pedestal Digital',
        numero_serie: `SN-AQ-2026-${String(i + 1).padStart(4, '0')}`,
        estado: EstadoDispensador.EN_CLIENTE,
        precio_arriendo: 15000,
      }
    });
  }

  // Dispensadores en Taller para pruebas de mantención
  const dispTaller = await prisma.dispensador.create({
    data: {
      marca: 'Midea',
      modelo: 'Sobremesa Standard',
      numero_serie: 'SN-MID-TALLER-009',
      estado: EstadoDispensador.EN_TALLER,
      precio_arriendo: 12000,
    }
  });

  await prisma.mantencionDispensador.create({
    data: {
      dispensador_id: dispTaller.id,
      problema_reportated: 'Fuga interna de agua y termostato no calienta.',
      diagnostico: 'Manguera de silicona agrietada y resistencia quemada.',
      costo_repuestos: 18000,
      mano_de_obra: 15000,
      costo_total: 33000,
      foto_ingreso_url: '/dispensador_defectuoso.png',
      repuestos: {
        create: [
          { nombre: 'Resistencia Térmica 500W', cantidad: 1, costo_unitario: 12000 },
          { nombre: 'Juego Mangueras Silicona', cantidad: 1, costo_unitario: 6000 },
        ]
      }
    }
  });

  await prisma.maquinaReemplazo.create({
    data: {
      marca: 'AquaLine',
      modelo: 'Sobremesa Reemplazo',
      estado: 'DISPONIBLE',
    }
  });
  console.log('✅ Módulo de dispensadores, contratos de arriendo y taller configurados.');

  // =========================================================================
  // 8. RUTAS BASE (Lunes a Viernes)
  // =========================================================================
  const diasHabiles = [
    { dia: DiaSemana.LUNES, nombre: 'Ruta 1 - Andalué & San Pedro del Valle', rep: repartidor1, cam: camion1 },
    { dia: DiaSemana.MARTES, nombre: 'Ruta 2 - Centro Concepción & Barrio Univ.', rep: repartidor2, cam: camion2 },
    { dia: DiaSemana.MIERCOLES, nombre: 'Ruta 3 - Huertos Familiares & Villuco', rep: repartidor1, cam: camion1 },
    { dia: DiaSemana.JUEVES, nombre: 'Ruta 4 - Lomas San Andrés & Brisas del Sol', rep: repartidor2, cam: camion2 },
    { dia: DiaSemana.VIERNES, nombre: 'Ruta 5 - Lonco & Michaihue', rep: repartidor1, cam: camion1 },
  ];

  let rutaViernesBase: any = null;

  for (const rData of diasHabiles) {
    const clientesRuta = faker.helpers.arrayElements(clientesCreados, 12);

    const rb = await prisma.rutaBase.create({
      data: {
        nombre: rData.nombre,
        dia_semana: rData.dia,
        frecuencia: Frecuencia.SEMANAL,
        usuario_id: rData.rep.id,
        vehiculo_id: rData.cam.id,
        clientes: {
          create: clientesRuta.map((c, idx) => ({
            cliente_id: c.id,
            orden: idx + 1,
            bot20_default: faker.number.int({ min: 1, max: 4 }),
            bot10_default: faker.number.int({ min: 0, max: 2 }),
            soda_default: faker.number.int({ min: 0, max: 2 }),
          }))
        }
      },
      include: { clientes: true }
    });

    if (rData.dia === DiaSemana.VIERNES) {
      rutaViernesBase = rb;
    }
  }
  console.log('✅ Plantillas de Rutas Base (Lunes a Viernes) creadas.');

  // =========================================================================
  // 9. JORNADA DE OPERACIÓN COMPLETA (Día Hábil Vigente - Viernes Reciente)
  // =========================================================================
  const fechaHoyHabilStr = getHoyHabilStr(); // Ej: 2026-10-02 (Viernes)
  const fechaOperacionUTC = getFechaNormalizadaUTC(fechaHoyHabilStr);

  console.log(`📅 Poblando jornada operativa completa para la fecha: ${fechaHoyHabilStr}...`);

  // A) Ruta del Día y Paradas
  const rutaDia = await prisma.rutaDia.create({
    data: {
      ruta_base_id: rutaViernesBase.id,
      fecha: fechaOperacionUTC,
      usuario_id: repartidor1.id,
      vehiculo_id: camion1.id,
      estado: EstadoRuta.ACTIVA,
    }
  });

  const paradasCreadas = [];
  const clientesDeLaRuta = rutaViernesBase.clientes;

  for (let idx = 0; idx < clientesDeLaRuta.length; idx++) {
    const cItem = clientesDeLaRuta[idx];
    const fueEntregado = idx < 9; // 9 paradas entregadas, 3 pendientes
    const b20 = cItem.bot20_default || 2;
    const b10 = cItem.bot10_default || 1;
    const soda = cItem.soda_default || 0;

    // Crear Pedido
    const pedido = await prisma.pedido.create({
      data: {
        cliente_id: cItem.cliente_id,
        fecha_solicitada: fechaOperacionUTC,
        canal_origen: CanalOrigen.WHATSAPP,
        estado: fueEntregado ? EstadoPedido.ENTREGADO : EstadoPedido.ASIGNADO,
        usuario_registro_id: authAdmin.id,
        pagado: fueEntregado,
        items: {
          create: [
            { producto_id: 'prod-botellon-20l', tipo_transaccion: TipoTransaccion.RECARGA, cantidad: b20, precio_historico: 3000 },
            ...(b10 > 0 ? [{ producto_id: 'prod-botellon-10l', tipo_transaccion: TipoTransaccion.RECARGA, cantidad: b10, precio_historico: 2000 }] : []),
            ...(soda > 0 ? [{ producto_id: 'prod-soda', tipo_transaccion: TipoTransaccion.VENTA, cantidad: soda, precio_historico: 1500 }] : []),
          ]
        }
      }
    });

    const parada = await prisma.paradaDia.create({
      data: {
        ruta_dia_id: rutaDia.id,
        cliente_id: cItem.cliente_id,
        pedido_id: pedido.id,
        orden: idx + 1,
        estado: fueEntregado ? EstadoParada.ENTREGADO : EstadoParada.PENDIENTE,
        bot20_esperado: b20,
        bot10_esperado: b10,
        soda_esperada: soda,
        bot20_entregado: fueEntregado ? b20 : 0,
        bot10_entregado: fueEntregado ? b10 : 0,
        soda_entregada: fueEntregado ? soda : 0,
      }
    });

    paradasCreadas.push({ parada, pedido, fueEntregado, b20, b10, soda, clienteId: cItem.cliente_id });
  }

  // B) Guías de Despacho para las entregas
  let totalEfectivoRuta = 0;
  let totalTarjetaRuta = 0;
  let totalTransferenciaRuta = 0;
  let totalCreditoRuta = 0;
  const guiasCreadas = [];

  for (const item of paradasCreadas) {
    if (!item.fueEntregado) continue;

    const totalGuia = (item.b20 * 3000) + (item.b10 * 2000) + (item.soda * 1500);
    const metodo = faker.helpers.arrayElement([
      EstadoGuia.ENTREGADA_EFECTIVO,
      EstadoGuia.ENTREGADA_TARJETA,
      EstadoGuia.ENTREGADA_TRANSFERENCIA,
      EstadoGuia.ENTREGADA_CREDITO
    ]);

    if (metodo === EstadoGuia.ENTREGADA_EFECTIVO) totalEfectivoRuta += totalGuia;
    else if (metodo === EstadoGuia.ENTREGADA_TARJETA) totalTarjetaRuta += totalGuia;
    else if (metodo === EstadoGuia.ENTREGADA_TRANSFERENCIA) totalTransferenciaRuta += totalGuia;
    else totalCreditoRuta += totalGuia;

    const guia = await prisma.guiaDespacho.create({
      data: {
        cliente_id: item.clienteId,
        pedido_id: item.pedido.id,
        direccion_entrega: 'Dirección confirmada en ruta',
        usuario_repartidor_id: repartidor1.id,
        estado: metodo,
        nombre_receptor: faker.person.fullName(),
        rut_receptor: generarRutChileno(),
        hora_entrega: new Date(),
        total: totalGuia,
        botellones_prestados_entrega: 0,
        items: {
          create: [
            { producto_id: 'prod-botellon-20l', tipo_transaccion: TipoTransaccion.RECARGA, cantidad: item.b20, precio_unitario: 3000, subtotal: item.b20 * 3000 },
            ...(item.b10 > 0 ? [{ producto_id: 'prod-botellon-10l', tipo_transaccion: TipoTransaccion.RECARGA, cantidad: item.b10, precio_unitario: 2000, subtotal: item.b10 * 2000 }] : []),
            ...(item.soda > 0 ? [{ producto_id: 'prod-soda', tipo_transaccion: TipoTransaccion.VENTA, cantidad: item.soda, precio_unitario: 1500, subtotal: item.soda * 1500 }] : []),
          ]
        }
      }
    });

    guiasCreadas.push(guia);
  }

  // C) Cuadratura del Repartidor (Camión 1)
  const cuadratura = await prisma.cuadratura.upsert({
    where: {
      usuario_id_fecha: {
        usuario_id: repartidor1.id,
        fecha: fechaOperacionUTC,
      }
    },
    update: {},
    create: {
      usuario_id: repartidor1.id,
      fecha: fechaOperacionUTC,
      estado: EstadoCuadratura.ABIERTA,
      km_inicial: 86400,
      total_efectivo: totalEfectivoRuta,
      total_tarjeta: totalTarjetaRuta,
      total_transferencia: totalTransferenciaRuta,
      total_guia_mensual: totalCreditoRuta,
      salida: {
        create: [
          { producto_id: 'prod-botellon-20l', cantidad: 60 },
          { producto_id: 'prod-botellon-10l', cantidad: 30 },
          { producto_id: 'prod-soda', cantidad: 24 },
        ]
      },
      retorno: {
        create: [
          { producto_id: 'prod-botellon-20l', cantidad: 42 },
          { producto_id: 'prod-botellon-10l', cantidad: 21 },
          { producto_id: 'prod-soda', cantidad: 24 },
        ]
      },
      botellones_vacios: {
        create: {
          cantidad_total: 27,
          cantidad_danados: 1,
        }
      },
      gastos: {
        create: [
          { tipo: 'PEAJE', monto: 1200, descripcion: 'Peaje Coronel / San Pedro' },
        ]
      }
    }
  });

  // D) Cierre de Caja del Día (Fábrica / Oficina)
  const cierreCaja = await prisma.cierreCaja.upsert({
    where: { fecha: fechaOperacionUTC },
    update: {},
    create: {
      fecha: fechaOperacionUTC,
      usuario_id: adminUsuario.id,
      estado: EstadoCierreCaja.ABIERTO,
      efectivo_inicial: 50000,
      total_efectivo: 21000,
      total_tarjeta: 15000,
      total_transferencia: 6000,
      total_general: 42000,
      ventas: {
        create: [
          { descripcion: 'Venta mostrador - 2 Recargas 20L', producto_id: 'prod-botellon-20l', cantidad: 2, precio_unitario: 3000, subtotal: 6000, metodo_pago: MetodoPagoCaja.EFECTIVO },
          { descripcion: 'Venta mostrador - 1 Botellón Nuevo 20L + Recarga', producto_id: 'prod-botellon-20l', cantidad: 1, precio_unitario: 9000, subtotal: 9000, metodo_pago: MetodoPagoCaja.EFECTIVO },
          { descripcion: 'Venta mostrador - 5 Sifones Soda', producto_id: 'prod-soda', cantidad: 5, precio_unitario: 1500, subtotal: 7500, metodo_pago: MetodoPagoCaja.TARJETA },
          { descripcion: 'Venta mostrador - 1 Recarga 20L + 2 Recargas 10L', producto_id: 'prod-botellon-20l', cantidad: 1, precio_unitario: 7500, subtotal: 7500, metodo_pago: MetodoPagoCaja.TARJETA },
          { descripcion: 'Venta mostrador - 2 Recargas 20L', producto_id: 'prod-botellon-20l', cantidad: 2, precio_unitario: 3000, subtotal: 6000, metodo_pago: MetodoPagoCaja.TRANSFERENCIA },
        ]
      },
      gastos: {
        create: [
          { descripcion: 'Insumos de limpieza y bolsas', monto: 6500, tipo: 'ASEO' },
          { descripcion: 'Agua mineral y café oficina', monto: 4500, tipo: 'OFICINA' },
        ]
      }
    }
  });

  // E) Producción Diaria y CO2
  await prisma.produccionDiaria.upsert({
    where: { fecha: fechaOperacionUTC },
    update: {},
    create: {
      fecha: fechaOperacionUTC,
      usuario_id: adminUsuario.id,
      botellon20_cantidad: 180,
      botellon10_cantidad: 90,
      sodas_cantidad: 150,
      ph: 7.2,
      ppm: 42.5,
      observaciones: 'Producción estándar con parámetros físico-químicos óptimos.',
    }
  });

  await prisma.tuboCO2.create({
    data: {
      fecha_llegada: new Date(),
      peso_kg: 45,
      rendimiento_estimado: 3000,
      sodas_producidas_total: 450,
      kg_consumidos: 6.75,
      activo: true,
    }
  });

  console.log('✅ Jornada operativa (Ruta, Paradas, Guías, Cuadratura, Caja, Producción) generada.');
  console.log('🎉 ¡SEED COMPLETO Y LISTO PARA PRUEBAS!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed-faker:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
