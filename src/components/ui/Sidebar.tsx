'use client';

import React from 'react';
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
} from 'lucide-react';

export default function Sidebar({ rol }: { rol: string }) {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard',          href: '/admin',             icon: LayoutDashboard },
    { name: 'Cuadraturas',        href: '/admin/cuadratura',  icon: ClipboardList   },
    { name: 'Clientes',           href: '/admin/clientes',    icon: Users           },
    { name: 'Flota',              href: '/admin/flota',       icon: Truck           },
    { name: 'Rutas y Despacho',   href: '/admin/rutas',       icon: MapPin          },
    { name: 'Rutas Base',         href: '/admin/rutas-base',  icon: Map             },
    { name: 'Guías de Despacho',  href: '/admin/guias',       icon: FileText        },
    { name: 'Catálogo Productos', href: '/admin/productos',   icon: Package         },
    { name: 'Producción y CO2',   href: '/admin/produccion',  icon: FlaskConical    },
    ...(rol === 'ADMIN'
      ? [{ name: 'Roles', href: '/admin/roles', icon: ShieldCheck }]
      : []),
  ];

  return (
    <aside
      className="w-56 flex flex-col flex-shrink-0 z-20 min-h-screen"
      style={{ backgroundColor: '#013299' }}
    >
      {/* LOGO */}
      <div
        className="h-14 flex items-center px-5 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}
      >
        <div className="flex flex-col leading-tight">
          <span className="text-base font-extrabold text-white tracking-tight">
            <span className="font-black">SIGO</span>
            <span className="font-light text-blue-200">Sodatal</span>
          </span>

        </div>
      </div>

      {/* NAV */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors"
              style={{
                backgroundColor: isActive ? 'white' : 'transparent',
                color: isActive ? '#013299' : 'rgba(219, 234, 254, 0.9)', // blue-100 tono
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
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* FOOTER */}
      <div
        className="p-4 text-xs text-center"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(147, 197, 253, 0.7)',
        }}
      >
        SIGO v1.0
      </div>
    </aside>
  );
}