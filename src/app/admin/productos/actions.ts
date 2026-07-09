'use server';

import { prisma } from '@/src/lib/prisma';
import { revalidatePath } from 'next/cache';
import { CategoriaProducto, Prisma } from '@prisma/client';

export interface ProductoInput {
  nombre: string;
  categoria: CategoriaProducto;
  precio_venta_nueva: number;
  precio_recarga: number | null;
  stock_minimo: number;
  activo: boolean;
}

export async function crearProductoAction(data: ProductoInput) {
  try {
    if (!data.nombre?.trim() || !data.categoria) {
      return { success: false, message: 'El nombre y la categoría son obligatorios.' };
    }

    await prisma.producto.create({
      data: {
        nombre: data.nombre.trim(),
        categoria: data.categoria,
        precio_venta_nueva: data.precio_venta_nueva,
        precio_recarga: data.precio_recarga,
        stock_minimo: data.stock_minimo,
        activo: data.activo,
      },
    });

    revalidatePath('/admin/productos');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al crear el producto.';
    return { success: false, message };
  }
}

export async function editarProductoAction(id: string, data: ProductoInput) {
  try {
    if (!id) return { success: false, message: 'ID de producto no válido.' };
    if (!data.nombre?.trim() || !data.categoria) {
      return { success: false, message: 'El nombre y la categoría son obligatorios.' };
    }

    await prisma.producto.update({
      where: { id },
      data: {
        nombre: data.nombre.trim(),
        categoria: data.categoria,
        precio_venta_nueva: data.precio_venta_nueva,
        precio_recarga: data.precio_recarga,
        stock_minimo: data.stock_minimo,
        activo: data.activo,
      },
    });

    revalidatePath('/admin/productos');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al editar el producto.';
    return { success: false, message };
  }
}

export async function eliminarProductoAction(id: string) {
  try {
    if (!id) return { success: false, message: 'ID de producto no válido.' };

    await prisma.producto.delete({
      where: { id },
    });

    revalidatePath('/admin/productos');
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return {
          success: false,
          errorType: 'FOREIGN_KEY_VIOLATION',
          message: 'No se puede eliminar porque está vinculado a registros existentes.',
        };
      }
    }

    const message = error instanceof Error ? error.message : 'Error desconocido al eliminar el producto.';
    return { success: false, message };
  }
}

export async function desactivarProductoAction(id: string) {
  try {
    if (!id) return { success: false, message: 'ID de producto no válido.' };

    await prisma.producto.update({
      where: { id },
      data: { activo: false },
    });

    revalidatePath('/admin/productos');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al desactivar el producto.';
    return { success: false, message };
  }
}