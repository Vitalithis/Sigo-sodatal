'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { CategoriaProducto } from '@/lib/prisma/generated';

// ────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────
export interface ProductoInput {
  nombre: string;
  categoria: CategoriaProducto;
  precio_venta_nueva: number;
  precio_recarga: number | null;
  stock_minimo: number;
  activo: boolean;
}

// ────────────────────────────────────────────────────────────────
// CRUD
// ────────────────────────────────────────────────────────────────
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

export async function editarProductoAction(id: string, datos: ProductoInput) {
  try {
    const existente = await prisma.producto.findUnique({ where: { id } });
    if (!existente) {
      return { success: false, message: 'El producto no existe.' };
    }

    await prisma.producto.update({
      where: { id },
      data: {
        nombre: datos.nombre,
        categoria: datos.categoria,
        precio_venta_nueva: Number(datos.precio_venta_nueva),
        precio_recarga: datos.precio_recarga !== null ? Number(datos.precio_recarga) : null,
        stock_minimo: Number(datos.stock_minimo),
        activo: datos.activo,
      },
    });

    revalidatePath('/admin/productos');
    return { success: true };
  } catch (error: any) {
    console.error('Error al editar producto:', error);
    return { success: false, message: 'Error al guardar los cambios del producto.' };
  }
}

export async function eliminarProductoAction(id: string) {
  try {
    await prisma.producto.delete({ where: { id } });
    revalidatePath('/admin/productos');
    return { success: true };
  } catch (error: any) {
    // P2003: violación de clave foránea — el producto está referenciado
    // en guías, cuadraturas, pedidos, comisiones o stock.
    if (error.code === 'P2003') {
      return {
        success: false,
        errorType: 'FOREIGN_KEY_VIOLATION' as const,
        message: 'No se puede eliminar: el producto tiene transacciones asociadas.',
      };
    }
    console.error('Error al eliminar producto:', error);
    return { success: false, message: 'Error al eliminar el producto.' };
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