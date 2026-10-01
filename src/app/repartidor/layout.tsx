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
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <div className="max-w-md mx-auto w-full bg-slate-50 min-h-screen flex flex-col relative shadow-2xl border-x border-slate-200/60 pb-20">
        <RepartidorHeader nombreUsuario={usuario.nombre} vehiculoPatente={vehiculoPatente} />
        
        <main className="flex-1 p-4 overflow-y-auto">
          {children}
        </main>

        <RepartidorBottomNav />
      </div>
    </div>
  );
}