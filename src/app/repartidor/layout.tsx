import { redirect } from 'next/navigation';
import { getUsuarioActual } from '@/lib/auth-session';
import { prisma } from '@lib/prisma';
import RepartidorHeader from './components/RepartidorHeader';
import RepartidorBottomNav from './components/RepartidorBottomNav';

export default async function RepartidorLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioActual();

  if (!usuario) redirect('/login');
  if (usuario.rol === 'PENDIENTE') redirect('/pendiente');
  if (usuario.rol === 'ADMIN') redirect('/admin');
  if (usuario.rol === 'OFICINA') redirect('/oficina');

  // Buscar información de vehículo si tiene asignado
  let vehiculoPatente: string | null = null;
  if (usuario.vehiculo_id) {
    const v = await prisma.vehiculo.findUnique({ where: { id: usuario.vehiculo_id } });
    if (v) vehiculoPatente = v.patente;
  }

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 flex flex-col font-sans">
      <RepartidorHeader nombreUsuario={usuario.nombre} vehiculoPatente={vehiculoPatente} />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-12">
        {children}
      </main>

      <RepartidorBottomNav />
    </div>
  );
}