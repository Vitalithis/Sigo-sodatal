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
    <div className="space-y-6 pb-12">
      <DispensadoresManager
        initialDispensadores={res.dispensadores || []}
        initialClientes={res.clientes || []}
      />
    </div>
  );
}
