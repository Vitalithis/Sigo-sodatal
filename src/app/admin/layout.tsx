import React from 'react';
import { redirect } from 'next/navigation';
import { getUsuarioActual } from '@/lib/auth-session';
import Sidebar from '../../components/ui/Sidebar';
import AdminHeader from '../../components/ui/AdminHeader';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioActual();

  if (!usuario) redirect('/login');

  const rol = usuario.rol ?? 'PENDIENTE';
  const nombre = usuario.nombre ?? 'Usuario';

  return (
    <div className="flex h-screen bg-[#f4f6f9] font-sans w-full">
      <Sidebar rol={rol} />
      <div className="flex-1 flex flex-col min-h-0">
        <AdminHeader nombre={nombre} rol={rol} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}