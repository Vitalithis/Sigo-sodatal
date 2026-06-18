'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { CategoriaProducto } from '@prisma/client';

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
    if (!data.nombre || !data.categoria) {
      return { success: false, message: 'El nombre y la categoría son obligatorios.' };
    }

    await prisma.producto.create({
      data: {
        nombre: data.nombre,
        categoria: data.categoria,
        precio_venta_nueva: data.precio_venta_nueva,
        precio_recarga: data.precio_recarga,
        stock_minimo: data.stock_minimo,
        activo: data.activo,
      },
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Error al crear producto:', error);
    return { success: false, message: error.message || 'Error desconocido al crear el producto.' };
  }
}

export async function editarProductoAction(id: string, data: ProductoInput) {
  try {
    if (!id) {
      return { success: false, message: 'ID de producto no válido.' };
    }
    if (!data.nombre || !data.categoria) {
      return { success: false, message: 'El nombre y la categoría son obligatorios.' };
    }

    await prisma.producto.update({
      where: { id },
      data: {
        nombre: data.nombre,
        categoria: data.categoria,
        precio_venta_nueva: data.precio_venta_nueva,
        precio_recarga: data.precio_recarga,
        stock_minimo: data.stock_minimo,
        activo: data.activo,
      },
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Error al editar producto:', error);
    return { success: false, message: error.message || 'Error desconocido al editar el producto.' };
  }
}

export async function eliminarProductoAction(id: string) {
  try {
    if (!id) {
      return { success: false, message: 'ID de producto no válido.' };
    }

    await prisma.producto.delete({
      where: { id },
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Error al eliminar producto:', error);
    
    // P2003 es el código de error de Prisma para fallos de clave foránea (Foreign Key Constraint)
    if (error.code === 'P2003') {
      return {
        success: false,
        errorType: 'FOREIGN_KEY_VIOLATION',
        message: 'No se puede eliminar porque está vinculado a registros existentes (ventas, comisiones, stock, etc.).',
      };
    }

    return { success: false, message: error.message || 'Error desconocido al eliminar el producto.' };
  }
}

export async function desactivarProductoAction(id: string) {
  try {
    if (!id) {
      return { success: false, message: 'ID de producto no válido.' };
    }

    await prisma.producto.update({
      where: { id },
      data: { activo: false },
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Error al desactivar producto:', error);
    return { success: false, message: error.message || 'Error desconocido al desactivar el producto.' };
  }
}
