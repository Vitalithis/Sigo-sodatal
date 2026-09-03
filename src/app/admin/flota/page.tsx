import { prisma } from '@lib/prisma';
import { obtenerChoferesAction } from './actions';
import FlotaTabs from './components/FlotaTabs';

export const revalidate = 0;

export const metadata = {
  title: 'Gestión de Flota - SIGO Sodatal',
  description: 'Administración de choferes y vehículos de reparto.',
};

export default async function FlotaPage() {
  // Traemos ambas fuentes en paralelo. Los vehículos vienen directo de Prisma
  // con su detalle completo (mantenciones, alertas, combustible) porque esa
  // es la fuente "rica" que ya tenías en admin/vehiculos.
  const [vehiculos, resChoferes] = await Promise.all([
    prisma.vehiculo.findMany({
      include: {
        mantenciones: { orderBy: { fecha: 'desc' } },
        alertas: true,
        cargas_combustible: { orderBy: { kilometraje: 'desc' } },
      },
      orderBy: { patente: 'asc' },
    }),
    obtenerChoferesAction(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-[#212529]">Gestión de Flota</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Administración de choferes y vehículos operativos. La asignación
            diaria chofer/vehículo se gestiona desde Rutas.
          </p>
        </div>

        <FlotaTabs
          choferesIniciales={resChoferes.choferes || []}
          vehiculosIniciales={vehiculos}
        />
      </div>
    </div>
  );
}
