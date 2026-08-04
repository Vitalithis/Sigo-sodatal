import React from 'react';
import { prisma } from '@/lib/prisma';
import ProductManager from './components/ProductManager';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Catálogo de Productos - SIGO Sodatal',
  description: 'Gestión de precios, categorías y stock mínimo de productos.',
};

export default async function ProductosPage() {
  const productos = await prisma.producto.findMany({
    orderBy: { nombre: 'asc' },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#212529]">Catálogo de Productos</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Gestión de precios, categorías y stock mínimo de productos.
        </p>
      </div>

      <ProductManager initialProductos={productos} />
    </div>
  );
}