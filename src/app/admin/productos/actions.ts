'use server';

import { prisma } from '@/src/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function obtenerProductosAction() {
  try {
    const productos = await prisma.producto.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
      include: { categoria: true } // Esto traerá el nombre de la categoría
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
  categoria_id: string; // Recibimos el ID de la relación
}) {
  try {
    // Validar existencia de categoría
    const categoria = await prisma.categoria.findUnique({
      where: { id: datos.categoria_id }
    });

    if (!categoria) {
      return { success: false, message: 'La categoría seleccionada no existe.' };
    }

    await prisma.producto.create({
      data: {
        nombre: datos.nombre,
        precio_venta_nueva: Number(datos.precio_venta_nueva),
        precio_recarga: datos.precio_recarga ? Number(datos.precio_recarga) : null,
        stock_minimo: Number(datos.stock_minimo),
        activo: true,
        categoria_id: datos.categoria_id // Asignación directa de la relación
      }
    });

    revalidatePath('/admin/productos');
    return { success: true };
  } catch (error: any) {
    console.error("Error al crear producto:", error);
    return { success: false, message: 'Error al guardar el producto.' };
  }
}

export async function desactivarProductoAction(id: string) {
  try {
    await prisma.producto.update({
      where: { id },
      data: { activo: false }
    });
    revalidatePath('/admin/productos');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}