import React from 'react';
import { prisma } from '@lib/prisma';
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
    <div className="space-y-6 pb-12">
      <GuiasManager initialGuias={guias} />
    </div>
  );
}
