import React from 'react';
import { prisma } from '@lib/prisma';
import ClientManager from './components/ClientManager';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Gestión de Clientes - SIGO Sodatal',
  description: 'Administración de ficha de clientes, dispensadores asignados e historial.',
};

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({
    include: {
      dispensadores: {
        include: {
          mantenciones: true,
        }
      },
      historial_financiero: true,
      sector: {
        include: {
          comuna: true,
        },
      },
    },
    orderBy: {
      nombre: 'asc',
    },
  });

  return (
    <div className="space-y-6 pb-12">
      <ClientManager initialClientes={clientes} />
    </div>
  );
}