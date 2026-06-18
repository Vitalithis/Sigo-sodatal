import React from 'react';
// Asegúrate de apuntar a donde tengas configurada tu instancia de Prisma
import { prisma } from '@/lib/prisma'; 
import ClientManager from './components/ClientManager';

// Forzamos a que Next.js no cachee estáticamente esta página de administración
export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  // Traemos los clientes incluyendo las relaciones EXACTAS de tu schema.prisma
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
    <main className="min-h-screen bg-slate-50">
      <ClientManager initialClientes={clientes} />
    </main>
  );
}