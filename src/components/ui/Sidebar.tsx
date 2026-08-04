'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar({ rol }: { rol: string }) {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', href: '/admin', icon: 'DB' },
    { name: 'Cuadraturas', href: '/admin/cuadratura', icon: 'CQ' },
    { name: 'Clientes', href: '/admin/clientes', icon: 'CL' },
    { name: 'Flota', href: '/admin/flota', icon: 'FL' },
    { name: 'Rutas y Despacho', href: '/admin/rutas', icon: 'RD' },
    { name: 'Rutas Base', href: '/admin/rutas-base', icon: 'RB' },
    { name: 'Guías de Despacho', href: '/admin/guias', icon: 'GD' },
    { name: 'Catálogo Productos', href: '/admin/productos', icon: 'CP' },
    { name: 'Producción y CO2', href: '/admin/produccion', icon: 'PZ' },
    ...(rol === 'ADMIN'
      ? [{ name: 'Roles', href: '/admin/roles', icon: 'RL' }]
      : []),
  ];

  return (
    <aside className="w-64 bg-[#343a40] text-[#c2c7d0] flex flex-col flex-shrink-0 z-20 shadow-xl min-h-screen">
      <div className="h-14 flex items-center px-4 border-b border-[#4f5962] bg-[#343a40]">
        <span className="text-xl font-semibold text-white tracking-wider">
          SIGO<span className="font-light text-blue-400">Sodatal</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        <div className="px-3 mb-2 text-xs font-semibold text-[#6c757d] uppercase tracking-wider">
          Módulos operativos
        </div>

        {menuItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-[#495057] hover:text-white'
              }`}
            >
              <span className={`mr-3 text-xs font-bold w-6 h-6 flex items-center justify-center rounded ${isActive ? 'bg-white/20' : 'bg-[#4f5962] text-gray-300'}`}>
                {item.icon}
              </span>
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#4f5962] text-xs text-center text-[#a8afb7]">
        SIGO v1.0
      </div>
    </aside>
  );
}