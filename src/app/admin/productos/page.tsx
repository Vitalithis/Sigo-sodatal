import React from 'react';
import { prisma } from '@lib/prisma';
import ProductManager from './components/ProductManager';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Catálogo de Productos - SIGO Sodatal',
  description: 'Gestión de precios, categorías y stock mínimo de productos.',
};

export default async function ProductosPage() {
  const session = await auth.api.getSession({
    headers: headers(),
  });
  
  const usuarioActualId = session?.user?.id;

  if (!usuarioActualId) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm font-semibold">
        Error: No se detectó una sesión válida de usuario. Por favor inicia sesión nuevamente.
      </div>
    );
  }

  const productos = await prisma.producto.findMany({
    orderBy: { nombre: 'asc' },
    include: {
      stock_fabrica: true, 
    },
  });

  return (
    <div className="space-y-6 pb-12">
      <ProductManager 
        initialProductos={productos} 
        usuarioActualId={usuarioActualId} 
      />
    </div>
  );
}