'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const routeNameMap: Record<string, string> = {
  admin: 'Inicio',
  clientes: 'Clientes',
  dispensadores: 'Dispensadores',
  rutas: 'Despacho y Rutas',
  'rutas-base': 'Plantillas de Ruta Base',
  cuadratura: 'Cuadraturas y Finanzas',
  flota: 'Flota de Vehículos',
  guias: 'Guías de Despacho',
  productos: 'Catálogo de Productos',
  produccion: 'Producción y CO2',
  roles: 'Gestión de Roles',
  sectores: 'Sectores y Comunas',
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  if (!pathname || pathname === '/admin') return null;

  const segments = pathname.split('/').filter(Boolean);

  let accumulatedPath = '';

  return (
    <nav aria-label="Breadcrumbs" className="flex items-center space-x-2 text-xs font-semibold text-slate-500 mb-4 bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm w-fit">
      <Link href="/admin" className="flex items-center gap-1 text-slate-600 hover:text-[#013299] transition-colors">
        <Home className="h-3.5 w-3.5" />
        <span>Inicio</span>
      </Link>

      {segments.map((segment, index) => {
        if (segment === 'admin') return null;
        accumulatedPath += `/${segment}`;
        const isLast = index === segments.length - 1;
        const displayName = routeNameMap[segment] || segment.replace(/-/g, ' ');

        return (
          <React.Fragment key={accumulatedPath}>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            {isLast ? (
              <span className="text-[#013299] font-extrabold capitalize">{displayName}</span>
            ) : (
              <Link href={`/admin${accumulatedPath}`} className="hover:text-[#013299] transition-colors capitalize">
                {displayName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
