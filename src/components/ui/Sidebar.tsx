'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Truck,
  MapPin,
  Map,
  FileText,
  Package,
  FlaskConical,
  ShieldCheck,
  Building2,
  Droplets,
  Search,
  Bell,
  MessageCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { logout } from '@/app/(auth)/login/actions';

interface SidebarProps {
  rol: string;
  nombre: string;
}

export default function Sidebar({ rol, nombre }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const inicial = (nombre || 'U').charAt(0).toUpperCase();

  const menuItems = [
    { name: 'Dashboard',          href: '/admin',             icon: LayoutDashboard },
    { name: 'Cuadraturas',        href: '/admin/cuadratura',  icon: ClipboardList   },
    { name: 'Clientes',           href: '/admin/clientes',    icon: Users           },
    { name: 'Dispensadores',      href: '/admin/dispensadores', icon: Droplets        },
    { name: 'Flota',              href: '/admin/flota',       icon: Truck           },
    { name: 'Rutas y Despacho',   href: '/admin/rutas',       icon: MapPin          },
    { name: 'Rutas Base',         href: '/admin/rutas-base',  icon: Map             },
    { name: 'Guías de Despacho',  href: '/admin/guias',       icon: FileText        },
    { name: 'Catálogo Productos', href: '/admin/productos',   icon: Package         },
    { name: 'Producción y CO2',   href: '/admin/produccion',  icon: FlaskConical    },
    
    ...(rol === 'ADMIN'
      ? [
          { name: 'Roles',    href: '/admin/roles',    icon: ShieldCheck },
          { name: 'Sectores', href: '/admin/sectores', icon: Building2   },
        ]
      : []),
  ];

  return (
    <aside
      className={`flex flex-col flex-shrink-0 z-20 min-h-screen transition-all duration-300 relative ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
      style={{ backgroundColor: '#013299' }}
    >
      {/* Botón Colapsar / Expandir */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
        className="absolute -right-3 top-5 bg-white text-[#013299] p-1 rounded-full border border-slate-200 shadow-md hover:scale-110 transition-transform z-30"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {/* LOGO */}
      <div
        className="h-16 flex items-center px-5 flex-shrink-0 justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}
      >
        {!isCollapsed ? (
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-black text-white tracking-tight">
              SIGO <span className="font-light text-blue-200 text-sm">Sodatal</span>
            </span>
          </div>
        ) : (
          <span className="font-black text-white text-base tracking-tighter mx-auto">
            S<span className="text-blue-300">S</span>
          </span>
        )}
      </div>

      {/* ELEMENTOS DE HEADER MIGRADOS: Búsqueda y Notificaciones */}
      <div className="p-3 border-b border-white/10 space-y-2">
        {!isCollapsed ? (
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 w-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
          >
            <Search className="h-4 w-4 shrink-0 text-blue-200" />
            <input
              type="text"
              placeholder="Buscar..."
              className="bg-transparent text-xs outline-none w-full text-white placeholder:text-blue-200 font-medium"
            />
          </div>
        ) : (
          <button title="Buscar..." className="w-full flex justify-center p-2 rounded-xl text-blue-200 hover:bg-white/10">
            <Search className="h-4 w-4" />
          </button>
        )}

        <div className={`flex items-center ${isCollapsed ? 'flex-col justify-center gap-2' : 'justify-around px-2 py-1'}`}>
          <button title="Mensajes" className="p-1.5 rounded-lg text-blue-200 hover:bg-white/10 transition-colors">
            <MessageCircle className="h-4 w-4" />
          </button>

          <button title="Notificaciones" className="relative p-1.5 rounded-lg text-blue-200 hover:bg-white/10 transition-colors">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>

      {/* NAV */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                isCollapsed ? 'justify-center' : ''
              }`}
              style={{
                backgroundColor: isActive ? 'white' : 'transparent',
                color: isActive ? '#013299' : 'rgba(219, 234, 254, 0.9)', 
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.12)';
                  (e.currentTarget as HTMLElement).style.color = 'white';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'rgba(219, 234, 254, 0.9)';
                }
              }}
            >
              <Icon
                className="h-4 w-4 shrink-0"
                style={{ color: isActive ? '#013299' : 'rgba(191, 219, 254, 0.8)' }}
              />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* PERFIL Y SALIR (MIGRADO DE ADMINHEADER) */}
      <div
        className="p-3 flex flex-col gap-2 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
      >
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-2`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white border-2 shrink-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.35)' }}
            >
              {inicial}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-xs font-bold text-white truncate">{nombre}</span>
                <span className="text-[10px] font-medium text-blue-200 uppercase">{rol}</span>
              </div>
            )}
          </div>

          <form action={logout}>
            <button
              type="submit"
              title="Cerrar Sesión"
              className="p-2 rounded-lg text-blue-200 hover:bg-white/10 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>

        {!isCollapsed && (
          <div className="text-[10px] text-center pt-1" style={{ color: 'rgba(147, 197, 253, 0.7)' }}>
            SIGO v1.2.9
          </div>
        )}
      </div>
    </aside>
  );
}