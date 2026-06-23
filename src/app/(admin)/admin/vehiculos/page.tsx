import { prisma } from '@/lib/prisma';
import VehicleManager from './VehicleManager';

// Forzar que la página no use caché vieja y cargue datos frescos
export const revalidate = 0;

export default async function VehiculosPage() {
  // Traemos los vehículos con sus mantenciones y alertas ordenados por patente
  const vehiculos = await prisma.vehiculo.findMany({
    include: {
      mantenciones: {
        orderBy: {
          fecha: 'desc'
        }
      },
      alertas: true
    },
    orderBy: {
      patente: 'asc'
    }
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <VehicleManager initialVehiculos={vehiculos} />
    </div>
  );
}