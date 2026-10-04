import React from 'react';
import { obtenerRepartidoresComisionesAction } from './actions';
import ComisionesApp from './components/ComisionesApp';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Comisiones - SIGO Sodatal',
  description: 'Reglas de comisión, liquidación de repartidores y rendimiento comercial.',
};

export default async function ComisionesPage() {
  const resultado = await obtenerRepartidoresComisionesAction();

  return (
    <div className="space-y-6 pb-12">
      <ComisionesApp
        initialRepartidores={resultado.repartidores as any}
        initialConfigsMap={resultado.configsMap}
      />
    </div>
  );
}
