import React from 'react';
import DispensadoresManager from './components/DispensadoresManager';
import { obtenerDispensadoresAction } from './actions';

export const metadata = {
  title: 'Mantenedor de Dispensadores - SIGO Sodatal',
  description: 'Gestión y control de inventario de dispensadores de agua de forma independiente.',
};

export default async function AdminDispensadoresPage() {
  const res = await obtenerDispensadoresAction();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-[#1e293b] tracking-tight">
          Mantenedor de Dispensadores
        </h1>
        <div className="h-1 w-12 bg-[#013299] rounded-full mt-1.5" />
      </div>

      <DispensadoresManager
        initialDispensadores={res.dispensadores || []}
        initialClientes={res.clientes || []}
      />
    </div>
  );
}
