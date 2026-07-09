import React from 'react';
import Sidebar from '../../components/ui/Sidebar';
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#f4f6f9] text-[#4b545c] font-sans overflow-hidden w-full">
      
      {/* INYECCIÓN DEL COMPONENTE SIDEBAR CLIENTE */}
      <Sidebar />

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