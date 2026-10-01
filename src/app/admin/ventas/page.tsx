import React from 'react';
import VentasApp from './components/VentasApp';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Ventas - SIGO Sodatal',
  description: 'Registro y seguimiento de ventas por producto, tipo de cliente y repartidor.',
};

export default function VentasPage() {
  return (
    <div className="space-y-6 pb-12">
      <VentasApp />
    </div>
  );
}
