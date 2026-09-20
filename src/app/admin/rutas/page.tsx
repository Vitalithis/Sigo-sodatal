import React from 'react';
import RutasManager from './components/RutasManager';

export const metadata = {
  title: 'Hojas de Ruta Diarias - SIGO Sodatal',
  description: 'Control de despacho de camiones, paradas comerciales fijos y acople de pedidos dinámicos.',
};

export default function AdminRutasPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-[#1e293b] tracking-tight">
          Despacho y Hojas de Ruta
        </h1>
        <div className="h-1 w-12 bg-[#1e40af] rounded-full mt-1.5"></div>
      </div>
      
      {/* Componente reactivo encargado de la navegación por calendario */}
      <RutasManager />
    </div>
  );
}
