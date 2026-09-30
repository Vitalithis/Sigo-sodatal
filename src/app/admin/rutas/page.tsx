import React from 'react';
import RutasManager from './components/RutasManager';

export const metadata = {
  title: 'Hojas de Ruta Diarias - SIGO Sodatal',
  description: 'Control de despacho de camiones, paradas comerciales fijos y acople de pedidos dinámicos.',
};

export default function AdminRutasPage() {
  return (
    <div className="space-y-6 pb-12">
      <RutasManager />
    </div>
  );
}
