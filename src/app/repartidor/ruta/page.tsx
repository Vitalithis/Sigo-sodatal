import { prisma } from '@/lib/prisma';
import { getUsuarioActual } from '@/lib/auth-session';
import ListaParadas from './components/ListaParadas';
import { redirect } from 'next/navigation';

export default async function RutaDiaPage() {
  const usuario = await getUsuarioActual();

  if (!usuario) redirect('/login');

  const hoy = new Date();
  hoy.setHours(hoy.getHours() - 4);
  const fechaStr = hoy.toISOString().split('T')[0];
  const inicioDia = new Date(`${fechaStr}T00:00:00.000Z`);
  const finDia = new Date(`${fechaStr}T23:59:59.999Z`);

  const ruta = await prisma.rutaDia.findFirst({
    where: {
      usuario_id: usuario.id,
      fecha: { gte: inicioDia, lte: finDia },
      estado: 'ACTIVA',
    },
    include: {
      paradas: {
        orderBy: { orden: 'asc' },
        include: {
          cliente: {
            include: {
              incidencias: { where: { resuelta: false } },
            },
          },
          pedido: {
            include: {
              items: { include: { producto: true } },
            },
          },
        },
      },
    },
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
      <ListaParadas paradasIniciales={ruta.paradas} usuarioId={usuario.id} />
    </div>
  );
}