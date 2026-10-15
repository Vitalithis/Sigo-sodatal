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

  const correlativoMap = new Map<string, number>();
  guias.forEach((g: any) => {
    correlativoMap.set(g.id, g.numero_correlativo);
  });

  const missingIds = new Set<string>();
  guias.forEach((g: any) => {
    if (g.reemplaza_a_guia_id && !correlativoMap.has(g.reemplaza_a_guia_id)) {
      missingIds.add(g.reemplaza_a_guia_id);
    }
    if (g.reemplazada_por_guia_id && !correlativoMap.has(g.reemplazada_por_guia_id)) {
      missingIds.add(g.reemplazada_por_guia_id);
    }
  });

  if (missingIds.size > 0) {
    const extraGuias = await prisma.guiaDespacho.findMany({
      where: { id: { in: Array.from(missingIds) } },
      select: { id: true, numero_correlativo: true },
    });
    extraGuias.forEach((eg) => correlativoMap.set(eg.id, eg.numero_correlativo));
  }

  const enrichedGuias = guias.map((g: any) => ({
    ...g,
    reemplaza_a: g.reemplaza_a_guia_id && correlativoMap.has(g.reemplaza_a_guia_id)
      ? { id: g.reemplaza_a_guia_id, numero_correlativo: correlativoMap.get(g.reemplaza_a_guia_id)! }
      : null,
    reemplazada_por: g.reemplazada_por_guia_id && correlativoMap.has(g.reemplazada_por_guia_id)
      ? { id: g.reemplazada_por_guia_id, numero_correlativo: correlativoMap.get(g.reemplazada_por_guia_id)! }
      : null,
  }));

  return (
    <div className="space-y-6 pb-12">
      <GuiasManager initialGuias={enrichedGuias} />
    </div>
  );
}
