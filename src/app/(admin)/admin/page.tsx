import { prisma } from '@/lib/prisma';
import ProductManager from './ProductManager';

export const metadata = {
  title: 'Administración de Productos - SIGO Sodatal',
  description: 'Panel de administración de productos para SIGO Sodatal. Permite crear, modificar, desactivar y eliminar productos del catálogo.',
};

export default async function AdminPage() {
  // 1. Obtenemos todos los productos desde la base de datos de manera ordenada
  const productos = await prisma.producto.findMany({
    orderBy: {
      nombre: 'asc',
    },
  });

  // 2. Renderizamos el componente de cliente pasándole los productos iniciales
  return <ProductManager initialProductos={productos} />;
}