'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Navigation, Package, User } from 'lucide-react';

export default function RepartidorBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/repartidor', label: 'Inicio', icon: Home },
    { href: '/repartidor/ruta', label: 'Mi Ruta', icon: Navigation },
    { href: '/repartidor/stock', label: 'Stock Camión', icon: Package },
    { href: '/repartidor/perfil', label: 'Mi Perfil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg max-w-md mx-auto">
      <div className="flex items-center justify-around h-16 px-2">
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
