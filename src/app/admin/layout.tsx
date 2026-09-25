import React from 'react';
import { redirect } from 'next/navigation';
import { getUsuarioActual } from '@/lib/auth-session';
import Sidebar from '../../components/ui/Sidebar';
import Breadcrumbs from '../../components/ui/Breadcrumbs';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioActual();

  if (!usuario) redirect('/login');
  
  if (usuario.rol === 'PENDIENTE') redirect('/pendiente');
  if (usuario.rol === 'REPARTIDOR') redirect('/repartidor');
  if (usuario.rol === 'OFICINA') redirect('/oficina');

  const rol = usuario.rol;
  const nombre = usuario.nombre;

  return (
    <div className="flex h-screen bg-[#f4f6f9] font-sans w-full overflow-hidden">
      <Sidebar rol={rol} nombre={nombre} />
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <main className="flex-1 p-6">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}