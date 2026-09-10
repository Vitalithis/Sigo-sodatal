import { redirect } from 'next/navigation';
import { getUsuarioActual } from '@/lib/auth-session';

export default async function RepartidorLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioActual();

  if (!usuario) redirect('/login');
  if (usuario.rol === 'PENDIENTE') redirect('/pendiente');
  if (usuario.rol === 'ADMIN') redirect('/admin');
  if (usuario.rol === 'OFICINA') redirect('/oficina');

  return (
    <div className="flex h-screen bg-slate-50 font-sans w-full">
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}