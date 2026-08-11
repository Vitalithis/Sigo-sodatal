import { createClient } from '@/src/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import ListaParadas from './components/ListaParadas';
import { redirect } from 'next/navigation';

export default async function RutaDiaPage() {
  // 1. Obtener usuario autenticado
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // 2. Definir rango de fecha actual para buscar la ruta
  const hoy = new Date();
  hoy.setHours(hoy.getHours() - 4); // Ajuste de zona horaria local
  const fechaStr = hoy.toISOString().split('T')[0];
  const inicioDia = new Date(`${fechaStr}T00:00:00.000Z`);
  const finDia = new Date(`${fechaStr}T23:59:59.999Z`);

  // 3. Consultar la ruta activa del repartidor
  const ruta = await prisma.rutaDia.findFirst({
    where: {
      usuario_id: user.id,
      fecha: { gte: inicioDia, lte: finDia },
      estado: 'ACTIVA'
    },
    include: {
      paradas: {
        orderBy: { orden: 'asc' },
        include: {
          cliente: {
            include: {
              // Traemos incidencias no resueltas para las alertas del Bloque 3.2
              incidencias: {
                where: { resuelta: false }
              }
            }
          },
          pedido: {
            include: {
              items: {
                include: { producto: true }
              }
            }
          }
        }
      }
    }
  });

  if (!ruta) {
    return (
      <div className="p-4 max-w-md mx-auto mt-10">
        <h1 className="text-2xl font-bold mb-4">Ruta del Día</h1>
        <div className="bg-gray-50 border p-4 rounded-lg">
          <p className="text-gray-600">No tienes una hoja de ruta activa asignada para la jornada de hoy.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Ruta en curso</h1>
        <p className="text-sm text-gray-500">Fecha: {fechaStr}</p>
      </div>
      
      <ListaParadas paradasIniciales={ruta.paradas} usuarioId={user.id} />
    </div>
  );
}