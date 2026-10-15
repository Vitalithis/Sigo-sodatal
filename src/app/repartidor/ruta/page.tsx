import { prisma } from '@lib/prisma';
import { getUsuarioActual } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import RutasRepartidorView from './components/RutasRepartidorView';

export const metadata = {
  title: 'Rutas y Despacho - Repartidor SODATAL',
  description: 'Gestión de hoja de ruta del día e historial de despachos.',
};

export default async function RutaDiaPage() {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect('/login');

  const hoy = new Date();
  hoy.setHours(hoy.getHours() - 4);
  const fechaStr = hoy.toISOString().split('T')[0];
  const inicioDia = new Date(`${fechaStr}T00:00:00.000Z`);
  const finDia = new Date(`${fechaStr}T23:59:59.999Z`);

  // Ruta activa de hoy
  const rutaHoy = await prisma.rutaDia.findFirst({
    where: {
      usuario_id: usuario.id,
      fecha: { gte: inicioDia, lte: finDia },
      estado: 'ACTIVA',
    },
    include: {
      vehiculo: true,
      paradas: {
        orderBy: { orden: 'asc' },
        include: {
          cliente: {
            include: {
              sector: { include: { comuna: true } },
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

  // Todas las rutas asignadas al repartidor (historial)
  const todasLasRutas = await prisma.rutaDia.findMany({
    where: {
      usuario_id: usuario.id,
    },
    include: {
      vehiculo: true,
      paradas: {
        orderBy: { orden: 'asc' },
        include: {
          cliente: {
            include: {
              sector: { include: { comuna: true } },
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
    orderBy: { fecha: 'desc' },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <RutasRepartidorView
        rutaHoy={rutaHoy}
        todasLasRutas={todasLasRutas}
        usuarioId={usuario.id}
        fechaStrHoy={fechaStr}
      />
    </div>
  );
}
