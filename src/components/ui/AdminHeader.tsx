'use client';

import React from 'react';
import { Bell, MessageCircle, Search, LogOut } from 'lucide-react';
import { logout } from '@/src/app/(auth)/login/actions';

interface Props {
  nombre: string;
  rol: string;
}

export default function AdminHeader({ nombre, rol }: Props) {
  const inicial = nombre.charAt(0).toUpperCase();

  return (
    <header
      className="h-14 flex items-center justify-between px-6 z-10 flex-shrink-0"
      style={{ backgroundColor: '#013299', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
    >
      {/* Buscador */}
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 w-64"
        style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
      >
        <Search className="h-4 w-4 shrink-0" style={{ color: 'rgba(191,219,254,0.8)' }} />
        <input
          type="text"
          placeholder="Buscar..."
          className="bg-transparent text-sm outline-none w-full text-white placeholder:text-blue-200"
        />
      </div>

      {/* Acciones derecha */}
      <div className="flex items-center gap-2">

        <button className="p-2 rounded-lg text-blue-200 hover:bg-white/10 transition-colors">
          <MessageCircle className="h-5 w-5" />
        </button>

        <button className="relative p-2 rounded-lg text-blue-200 hover:bg-white/10 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="w-px h-6 mx-1 bg-white/20" />

        {/* Avatar + nombre */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white border-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.35)' }}
          >
            {inicial}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-white">{nombre}</span>
            <span className="text-[10px] font-medium text-blue-200">{rol}</span>
          </div>
        </div>

        {/* Salir */}
        <form action={logout}>
          <button
            type="submit"
            className="p-2 rounded-lg text-blue-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>

      </div>
    </header>
  );
}