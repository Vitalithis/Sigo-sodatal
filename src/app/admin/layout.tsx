import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/src/lib/supabase/server';
import Sidebar from '../../components/ui/Sidebar';
import { logout } from '../(auth)/login/actions';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();

  if (!data?.user) redirect('/login');

  const rol = data.user.user_metadata?.rol ?? 'PENDIENTE';
  const nombre = data.user.user_metadata?.nombre ?? 'Usuario';
  const inicial = nombre.charAt(0).toUpperCase();

  return (
    <div className="flex h-screen bg-[#f4f6f9] text-[#4b545c] font-sans overflow-hidden w-full">
      <Sidebar rol={rol} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400 font-medium">Sistema de Gestión Operativa</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-semibold text-gray-700">{nombre}</span>
            <span className="text-xs text-gray-400">({rol})</span>
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
              {inicial}
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Salir
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}