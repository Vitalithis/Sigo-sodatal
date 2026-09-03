import React from 'react';
import { prisma } from '@lib/prisma';
import ClientManager from './components/ClientManager';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({
    include: {
      dispensadores: {
        include: {
          mantenciones: true,
        }
      },
      historial_financiero: true,
    },
    orderBy: {
      nombre: 'asc',
    },
  });

  return (
    <div className="space-y-6">
      <ClientManager initialClientes={clientes} />
    </div>
  );
}
