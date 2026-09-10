import React from 'react';
import { prisma } from '@lib/prisma';
import ProductManager from './components/ProductManager';
import { Package } from 'lucide-react';
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
  
  // 🐛 FIX: Si la sesión de Better-Auth está fallando, coloca tu ID de base de datos aquí temporalmente.
  // Ejemplo: const usuarioActualId = session?.user?.id || 'tu-id-real-de-la-bd';
  const usuarioActualId = session?.user?.id;

  if (!usuarioActualId) {
    // Es mejor fallar rápido y visiblemente si no hay sesión
    return <div>Error: No se detectó una sesión válida de usuario. Por favor inicia sesión nuevamente.</div>;
  }

  const productos = await prisma.producto.findMany({
    orderBy: { nombre: 'asc' },
    include: {
      stock_fabrica: true, 
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <ProductManager 
        initialProductos={productos} 
        usuarioActualId={usuarioActualId} 
      />
    </div>
  );
}