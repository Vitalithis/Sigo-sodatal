'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { CategoriaProducto } from '@/lib/prisma/generated';

export async function obtenerProductosAction() {
  try {
    const productos = await prisma.producto.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
    return { success: true, productos };
  } catch (error: any) {
    return { success: false, productos: [], message: error.message };
  }
}

export async function crearProductoAction(datos: {
  nombre: string;
  precio_venta_nueva: number;
  precio_recarga?: number;
  stock_minimo: number;
  categoria: CategoriaProducto;
}) {
  try {
    await prisma.producto.create({
      data: {
        nombre: datos.nombre,
        precio_venta_nueva: Number(datos.precio_venta_nueva),
        precio_recarga: datos.precio_recarga ? Number(datos.precio_recarga) : null,
        stock_minimo: Number(datos.stock_minimo),
        activo: true,
        categoria: datos.categoria,
      },
    });

    revalidatePath('/admin/productos');
    return { success: true };
  } catch (error: any) {
    console.error('Error al crear producto:', error);
    return { success: false, message: 'Error al guardar el producto.' };
  }
}

export async function desactivarProductoAction(id: string) {
  try {
    await prisma.producto.update({
      where: { id },
      data: { activo: false },
    });
    revalidatePath('/admin/productos');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}