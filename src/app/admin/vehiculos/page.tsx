import { prisma } from '@/src/lib/prisma';
import VehicleManager from './components/VehicleManager';

export const revalidate = 0;

export default async function VehiculosPage() {
  // Traemos los vehículos con sus mantenciones, alertas y combustible ordenados por patente
  const vehiculos = await prisma.vehiculo.findMany({
    include: {
      mantenciones: {
        orderBy: {
          fecha: 'desc'
        }
      },
      alertas: true,
      cargas_combustible: { 
        orderBy: {
          kilometraje: 'desc'
        }
      }
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