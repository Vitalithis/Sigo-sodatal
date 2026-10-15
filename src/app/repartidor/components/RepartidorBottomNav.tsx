'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Navigation, FileText, Scale, User } from 'lucide-react';

export default function RepartidorBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/repartidor', label: 'Inicio', icon: Home },
    { href: '/repartidor/ruta', label: 'Rutas', icon: Navigation },
    { href: '/repartidor/guias', label: 'Guías', icon: FileText },
    { href: '/repartidor/cuadraturas', label: 'Cuadre', icon: Scale },
    { href: '/repartidor/perfil', label: 'Perfil', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/repartidor' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                isActive ? 'text-[#013299]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-blue-50 text-[#013299] scale-110' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold mt-0.5 tracking-tight ${isActive ? 'text-[#013299]' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
