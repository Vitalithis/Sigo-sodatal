import React from 'react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#f4f6f9] text-[#4b545c] font-sans overflow-hidden w-full">
      
      {/* SIDEBAR LATERAL (Estilo Oscuro Clásico AdminLTE 3) */}
      <aside className="w-64 bg-[#343a40] text-[#c2c7d0] flex flex-col flex-shrink-0 z-20 shadow-xl">
        
        {/* Identificador de la Empresa */}
        <div className="h-14 flex items-center px-4 border-b border-[#4f5962] bg-[#343a40]">
          <span className="text-xl font-semibold text-white tracking-wider">
            SIGO<span className="font-light text-blue-400">Sodatal</span>
          </span>
        </div>

        {/* Menú de Navegación de la Barra Lateral */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          <div className="px-3 mb-2 text-xs font-semibold text-[#6c757d] uppercase tracking-wider">
            Panel principal
          </div>
          
          {/* Enlace al Dashboard */}
          <Link href="/admin" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-[#495057] hover:text-white transition-colors">
            <span className="mr-3 text-lg">📊</span> Dashboard
          </Link>

          <div className="border-t border-[#4f5962] my-4 pt-4"></div>
          <div className="px-3 mb-2 text-xs font-semibold text-[#6c757d] uppercase tracking-wider">
            Módulos operativos
          </div>

          {/* Enlace a Clientes */}
          <Link href="/admin/clientes" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-[#495057] hover:text-white transition-colors">
            <span className="mr-3 text-lg">👥</span> Clientes
          </Link>

          {/* Enlace a Vehículos */}
          <Link href="/admin/vehiculos" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-[#495057] hover:text-white transition-colors">
            <span className="mr-3 text-lg">🚚</span> Vehículos y Flota
          </Link>

          {/* 👇 NUEVO: Enlace a Rutas y Despacho 👇 */}
          <Link href="/admin/rutas" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-[#495057] hover:text-white transition-colors">
            <span className="mr-3 text-lg">🗺️</span> Rutas y Despacho
          </Link>

          {/* Enlace a Productos */}
          <Link href="/admin/productos" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-[#495057] hover:text-white transition-colors">
            <span className="mr-3 text-lg">🥤</span> Catálogo Productos
          </Link>

        </nav>

        {/* Pie de la Barra Lateral */}
        <div className="p-4 border-t border-[#4f5962] text-xs text-center text-[#a8afb7]">
          SIGO v1.0
        </div>
      </aside>

      {/* CONTENEDOR PRINCIPAL DERECHO (Navbar + Contenido Cambiante) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* ENCABEZADO / NAVBAR SUPERIOR */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400 font-medium">Sistema de Gestión Operativa</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-semibold text-gray-700">Panel Admin</span>
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
              A
            </div>
          </div>
        </header>

        {/* ESPACIO DINÁMICO (Aquí Next.js inyectará el page.tsx correspondiente) */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

    </div>
  );
}