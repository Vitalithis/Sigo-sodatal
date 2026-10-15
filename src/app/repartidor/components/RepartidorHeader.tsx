'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Truck, Calendar, Home, Navigation, FileText, Scale, Package, User, LogOut } from 'lucide-react';
import { signOut } from '@/lib/auth-client';

interface Props {
  nombreUsuario: string;
  vehiculoPatente?: string | null;
}

export default function RepartidorHeader({ nombreUsuario, vehiculoPatente }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const fechaHoy = new Date().toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  const handleCerrarSesion = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const navLinks = [
    { href: '/repartidor', label: 'Inicio', icon: Home },
    { href: '/repartidor/ruta', label: 'Rutas y Despacho', icon: Navigation },
    { href: '/repartidor/guias', label: 'Guías de Despacho', icon: FileText },
    { href: '/repartidor/cuadraturas', label: 'Cuadraturas', icon: Scale },
    { href: '/repartidor/stock', label: 'Stock Camión', icon: Package },
    { href: '/repartidor/perfil', label: 'Mi Perfil', icon: User },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#013299] text-white shadow-md border-b border-blue-900/40">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between">
        
        {/* Brand & Truck info */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/repartidor" className="flex items-center gap-2 group">
            <div className="p-1.5 sm:p-2 bg-white/10 rounded-xl border border-white/15 group-hover:bg-white/20 transition-colors">
              <Truck className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black tracking-tight leading-none">SODATAL</span>
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded leading-none">
                  Repartidor
                </span>
              </div>
              <p className="text-[11px] text-blue-100/90 font-medium mt-0.5">
                {vehiculoPatente ? `Camión: ${vehiculoPatente}` : 'En ruta'}
              </p>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links (hidden on mobile, shown on md+) */}
        <nav className="hidden md:flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/15">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/repartidor' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white text-[#013299] shadow-sm'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User badge & Date & Logout on PC */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] text-blue-200/90 font-semibold capitalize flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {fechaHoy}
            </span>
          </div>

          <Link
            href="/repartidor/perfil"
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition-colors px-2.5 py-1 sm:py-1.5 rounded-full border border-white/15"
            title="Ver perfil y ajustes de cuenta"
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-400 text-slate-900 text-[10px] sm:text-xs font-black flex items-center justify-center">
              {nombreUsuario.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-bold truncate max-w-[90px] sm:max-w-[120px]">
              {nombreUsuario.split(' ')[0]}
            </span>
          </Link>

          {/* Botón rápido de cierre de sesión en PC */}
          <button
            onClick={handleCerrarSesion}
            className="hidden md:flex p-1.5 text-blue-200 hover:text-white hover:bg-rose-500/20 rounded-lg transition-colors border border-transparent hover:border-rose-400/30"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4 text-rose-300" />
          </button>
        </div>

      </div>
    </header>
  );
}
