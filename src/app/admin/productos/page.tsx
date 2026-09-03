import React from 'react';
import { prisma } from '@lib/prisma';
import ProductManager from './components/ProductManager';
import { Package } from 'lucide-react';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* HEADER */}


      <ProductManager initialProductos={productos} />

    </div>
  );
}
