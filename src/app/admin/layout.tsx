import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/src/lib/supabase/server';
import Sidebar from '../../components/ui/Sidebar';
import AdminHeader from '../../components/ui/AdminHeader';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();

  if (!data?.user) redirect('/login');

  const rol = data.user.user_metadata?.rol ?? 'PENDIENTE';
  const nombre = data.user.user_metadata?.nombre ?? 'Usuario';

  return (
    <div className="flex h-screen bg-[#f4f6f9] font-sans overflow-hidden w-full">
      <Sidebar rol={rol} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader nombre={nombre} rol={rol} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}