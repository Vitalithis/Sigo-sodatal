import { prisma } from '@/lib/prisma';
import ProduccionCO2Manager from './components/ProduccionCO2Manager';

export const revalidate = 0;

export const metadata = {
  title: 'Producción y CO₂ - SIGO Sodatal',
  description: 'Registro de producción diaria y control de consumo de tubos de CO₂.',
};

export default async function ProduccionPage() {
  const [produccion, tubos, config, usuarios] = await Promise.all([
    prisma.produccionDiaria.findMany({
      include: { usuario: { select: { nombre: true, apellido: true } } },
      orderBy: { fecha: 'desc' },
      take: 30,
    }),
    prisma.tuboCO2.findMany({ orderBy: { fecha_llegada: 'desc' }, take: 50 }),
    prisma.configuracion.findMany({
      where: { clave: { in: ['co2_rendimiento_45kg', 'co2_rendimiento_35kg', 'co2_alerta_porcentaje'] } },
    }),
    prisma.usuario.findMany({
      where: { rol: { in: ['ADMIN', 'OFICINA'] }, activo: true },
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, apellido: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#212529]">Producción y CO₂</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Registro de producción diaria de botellones y sodas, y control del consumo de los tubos de CO₂.
        </p>
      </div>

      <ProduccionCO2Manager
        produccionInicial={produccion}
        tubosIniciales={tubos}
        configInicial={config}
        usuarios={usuarios}
      />
    </div>
  );
}