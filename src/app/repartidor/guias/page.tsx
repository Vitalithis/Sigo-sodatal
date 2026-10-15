import React from 'react';
import { prisma } from '@lib/prisma';
import { getUsuarioActual } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import GuiasRepartidorClient from './components/GuiasRepartidorClient';

export const metadata = {
  title: 'Guías de Despacho - Repartidor SODATAL',
  description: 'Control y consulta de guías de despacho emitidas por el repartidor.',
};

export default async function RepartidorGuiasPage() {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect('/login');

  const guias = await prisma.guiaDespacho.findMany({
    where: {
      usuario_repartidor_id: usuario.id,
    },
    include: {
      cliente: true,
      items: {
        include: {
          producto: true,
        },
      },
    },
    orderBy: {
      fecha_emision: 'desc',
    },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <GuiasRepartidorClient
        guias={guias as any}
        nombreRepartidor={usuario.nombre}
      />
    </div>
  );
}
