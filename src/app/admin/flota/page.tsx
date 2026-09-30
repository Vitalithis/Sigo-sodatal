import { prisma } from '@lib/prisma';
import { obtenerChoferesAction } from './actions';
import FlotaTabs from './components/FlotaTabs';

export const revalidate = 0;

export const metadata = {
  title: 'Gestión de Flota - SIGO Sodatal',
  description: 'Administración de choferes y vehículos de reparto.',
};

export default async function FlotaPage() {
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
    <div className="space-y-6 pb-12">
      <FlotaTabs
        choferesIniciales={resChoferes.choferes || []}
        vehiculosIniciales={vehiculos}
      />
    </div>
  );
}
