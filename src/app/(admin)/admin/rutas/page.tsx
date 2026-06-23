import React from 'react';
import RutasManager from './RutasManager';

export const metadata = {
  title: 'Hojas de Ruta Diarias - SIGO Sodatal',
  description: 'Control de despacho de camiones, paradas comerciales fijos y acople de pedidos dinámicos.',
};

export default function AdminRutasPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#212529]">Despacho y Hojas de Ruta</h1>
        <p className="text-xs text-gray-500 mt-0.5">Planificación libre de camiones, clientes fijos y pedidos entrantes</p>
      </div>
      
      {/* Componente reactivo encargado de la navegación por calendario */}
      <RutasManager />
    </div>
  );
}