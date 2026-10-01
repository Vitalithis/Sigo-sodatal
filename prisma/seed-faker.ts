import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { PrismaClient, TipoCliente, PreferenciaFacturacion, ModalidadPago, TipoRuta, Frecuencia } from '../lib/prisma/generated';
import { fakerES as faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Helper para generar RUT chileno válido en formato XX.XXX.XXX-Y
function generarRutChileno(): string {
  const numero = Math.floor(1000000 + Math.random() * 22000000);
  let suma = 0;
  let multiplicador = 2;
  let numStr = numero.toString();
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
  const CANTIDAD_CLIENTES = parseInt(process.env.CANTIDAD_CLIENTES || '500', 10);
  console.log(`🌱 Generando ${CANTIDAD_CLIENTES} clientes ficticios con Faker...`);

  // Asegurar comunas y sectores de la zona (Gran Concepción)
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
      nombre: 'Talcahuano',
      sectores: ['Las Higueras', 'Medio Camino', 'Brisas del Sol', 'Denavi Sur', 'Los Cerros']
    },
    {
      nombre: 'Chiguayante',
      sectores: ['Villuco', 'Lonco', 'Las Condes', 'Manquimávida', 'La Leonera']
    }
  ];

  const sectoresRegistrados: { id: string; nombre: string; comuna: string }[] = [];

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
          data: { nombre: secNombre, comuna_id: comuna.id },
        });
      }
      sectoresRegistrados.push({ id: sector.id, nombre: sector.nombre, comuna: comuna.nombre });
    }
  }

  console.log(`✅ ${sectoresRegistrados.length} sectores listos para asignación.`);

  const frecuencias: Frecuencia[] = ['SEMANAL', 'QUINCENAL', 'MENSUAL', 'A_PEDIDO'];
  const callesZona = [
    'Av. Pedro de Valdivia', 'Av. El Venado', 'O\'Higgins', 'Barros Arana', 'Aníbal Pinto',
    'Caupolicán', 'Chacabuco', 'Av. Collao', 'Av. Alessandri', 'Michimalonco',
    'Los Carrera', 'San Martín', 'Maipú', 'Freire', 'Victor Lamas'
  ];

  const batchSize = 100;
  let creados = 0;

  for (let i = 0; i < CANTIDAD_CLIENTES; i += batchSize) {
    const chunkCount = Math.min(batchSize, CANTIDAD_CLIENTES - i);
    const clientesBatch = [];

    for (let j = 0; j < chunkCount; j++) {
      const esEmpresa = Math.random() < 0.25; // 25% empresas, 75% domicilios
      const sectorAleatorio = sectoresRegistrados[Math.floor(Math.random() * sectoresRegistrados.length)];
      const calle = callesZona[Math.floor(Math.random() * callesZona.length)];
      const numero = faker.number.int({ min: 10, max: 4500 });

      let nombreCliente: string;
      let rutEmpresa: string | null = null;
      let giro: string | null = null;
      let prefFactura: PreferenciaFacturacion;

      if (esEmpresa) {
        const nombreEmpresa = faker.company.name();
        nombreCliente = `${nombreEmpresa} ${faker.helpers.arrayElement(['SpA', 'Ltda.', 'S.A.'])}`;
        rutEmpresa = generarRutChileno();
        giro = faker.company.buzzPhrase();
        prefFactura = PreferenciaFacturacion.FACTURA;
      } else {
        nombreCliente = `${faker.person.firstName()} ${faker.person.lastName()} ${faker.person.lastName()}`;
        prefFactura = PreferenciaFacturacion.BOLETA;
      }

      // Generar teléfono chileno +56 9 XXXX XXXX
      const telefono = `+569${faker.string.numeric(8)}`;
      const email = faker.internet.email({ firstName: nombreCliente.split(' ')[0], provider: 'gmail.com' }).toLowerCase();

      // Deuda: 70% al día, 30% con deuda entre $3.000 y $75.000
      const tieneDeuda = Math.random() < 0.3;
      const deuda = tieneDeuda ? faker.number.int({ min: 1, max: 25 }) * 3000 : 0;

      const botellonesPrestados = faker.number.int({ min: 0, max: esEmpresa ? 15 : 4 });
      const frecuencia = faker.helpers.arrayElement(frecuencias);

      clientesBatch.push({
        nombre: nombreCliente,
        tipo: esEmpresa ? TipoCliente.EMPRESA : TipoCliente.DOMICILIO,
        direccion: `${calle} #${numero}, ${sectorAleatorio.nombre}`,
        telefono,
        email,
        rut_empresa: rutEmpresa,
        giro,
        modalidad_pago: esEmpresa ? ModalidadPago.MENSUAL : ModalidadPago.INMEDIATO,
        tipo_ruta: TipoRuta.FIJO,
        botellones_prestados: botellonesPrestados,
        preferencia_factura: prefFactura,
        sector_id: sectorAleatorio.id,
        frecuencia,
        deuda,
        activo: Math.random() > 0.05, // 95% activos
        notas: Math.random() < 0.2 ? faker.lorem.sentence() : null,
      });
    }

    await prisma.cliente.createMany({
      data: clientesBatch,
    });

    creados += chunkCount;
    console.log(`📦 Insertados ${creados} / ${CANTIDAD_CLIENTES} clientes...`);
  }

  console.log(`🎉 ¡Población de datos finalizada con éxito! Se han registrado ${creados} clientes.`);
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed de Faker:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
