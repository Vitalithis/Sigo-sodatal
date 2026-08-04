import React from 'react';
import { prisma } from '@/src/lib/prisma';
import NuevaGuiaModal from './components/NuevaGuiaModal';
import GuiasManager from './components/GuiasManager';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Guías de Despacho - SIGO Sodatal',
  description: 'Emisión, entrega, anulación y cierre mensual de guías de despacho.',
};

export default async function GuiasPage() {
  const guias = await prisma.guiaDespacho.findMany({
    include: {
      cliente: true,
      usuario_repartidor: true,
      items: { include: { producto: true } },
    },
    orderBy: { fecha_emision: 'desc' },
    take: 300,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#212529]">Guías de Despacho</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Emisión de guías, confirmación de entrega, anulación y cierre mensual de clientes a crédito.
        </p>
      </div>

      <GuiasManager initialGuias={guias} />
    </div>
  );
}
