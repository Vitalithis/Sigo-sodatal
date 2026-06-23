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

// ==========================================
// ACTIONS DE PRODUCTOS
// ==========================================

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

// ==========================================
// ACTIONS DE RENDIMIENTO DE COMBUSTIBLE
// ==========================================

export interface CargaCombustibleInput {
  vehiculo_id: string;
  fecha: string;
  kilometraje: number;
  litros: number;
  monto: number;
  taller_o_bencinera: string;
}

export async function registrarCargaCombustibleAction(payload: CargaCombustibleInput) {
  try {
    await prisma.cargaCombustible.create({
      data: {
        vehiculo_id: payload.vehiculo_id,
        fecha: new Date(payload.fecha),
        kilometraje: Number(payload.kilometraje),
        litros: Number(payload.litros),
        monto: Number(payload.monto),
        taller_o_bencinera: payload.taller_o_bencinera
      }
    });
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al registrar la carga.' };
  }
}

// ==========================================
// ACTIONS DEL DASHBOARD (MÉTRICAS EN TIEMPO REAL)
// ==========================================

export async function obtenerMetricasDashboardAction() {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);

    // 1. Consultas optimizadas ejecutadas en paralelo
    const [
      totalPedidosHoy,
      pedidosEntregadosHoy,
      vehiculosActivos,
      vehiculosTotales,
      alertasActivas,
      productosParaEvaluar
    ] = await Promise.all([
      // Total Pedidos solicitados para hoy
      prisma.pedido.count({
        where: { fecha_solicitada: { gte: hoy, lt: mañana } }
      }),
      // Pedidos ya entregados hoy
      prisma.pedido.count({
        where: {
          fecha_solicitada: { gte: hoy, lt: mañana },
          estado: 'ENTREGADO'
        }
      }),
      // Vehículos operativos
      prisma.vehiculo.count({ where: { estado: 'ACTIVO' } }),
      // Total de flota registrada
      prisma.vehiculo.count(),
      // Alertas preventivas de vehículos vigentes
      prisma.alertaVehiculo.count({ where: { activa: true } }),
      // Traemos productos activos con su stock para evaluar el quiebre de stock en memoria (Evita errores de tipos)
      prisma.producto.findMany({
        where: { activo: true },
        include: { stock_fabrica: true }
      })
    ]);

    // 2. Filtrar en memoria los productos que están bajo o igual al stock mínimo requerido
    const productosBajoStockCount = productosParaEvaluar.filter(p => {
      const cantidadActual = p.stock_fabrica?.cantidad ?? 0;
      return cantidadActual <= p.stock_minimo;
    }).length;

    // 3. Calcular ingresos diarios sumando las guías de despacho emitidas hoy que no estén anuladas
    const guiasHoy = await prisma.guiaDespacho.findMany({
      where: {
        fecha_emision: { gte: hoy, lt: mañana },
        estado: { not: 'ANULADA' }
      },
      select: { total: true }
    });
    const ingresosHoy = guiasHoy.reduce((sum, g) => sum + g.total, 0);

    return {
      success: true,
      data: {
        pedidos: {
          total: totalPedidosHoy,
          entregados: pedidosEntregadosHoy,
          porcentaje: totalPedidosHoy > 0 ? Math.round((pedidosEntregadosHoy / totalPedidosHoy) * 100) : 0
        },
        flota: {
          activos: vehiculosActivos,
          totales: vehiculosTotales
        },
        alertas: alertasActivas,
        ingresos: ingresosHoy,
        productosCriticos: productosBajoStockCount
      }
    };
  } catch (error: any) {
    console.error("❌ Error en obtenerMetricasDashboardAction:", error);
    return { success: false, message: 'No se pudieron calcular las métricas operativas.' };
  }
}