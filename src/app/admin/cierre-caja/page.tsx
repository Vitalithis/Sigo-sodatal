import React from 'react';
import { obtenerOCrearCierreDiaAction } from './actions';
import CierreCajaApp from './components/CierreCajaApp';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Cierre de Caja - SIGO Sodatal',
  description: 'Registro diario de ventas en fábrica, gastos y cierre de caja.',
};

export default async function CierreCajaPage() {
  const resultado = await obtenerOCrearCierreDiaAction();

  return (
    <div className="space-y-6 pb-12">
      <CierreCajaApp
        initialCierre={resultado.success ? (resultado.cierre as any) : null}
        initialProductos={resultado.success ? (resultado.productos as any) : []}
        errorMsg={resultado.success ? undefined : resultado.message}
      />
    </div>
  );
}
