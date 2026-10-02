'use server';

import { prisma } from '../../../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { getUsuarioActual } from '@/lib/auth-session';

export type MetodoPagoCaja = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO_OFICINA' | 'PAGINA_WEB';


// Obtener o crear el cierre de caja del día
export async function obtenerOCrearCierreDiaAction() {
  try {
    const usuario = await getUsuarioActual();
    if (!usuario) return { success: false, message: 'No autenticado.' };

    const hoy = new Date();
    hoy.setUTCHours(0, 0, 0, 0);

    let cierre = await prisma.cierreCaja.findFirst({
      where: { fecha: hoy },
      include: {
        ventas: {
          include: { producto: true },
          orderBy: { id: 'asc' },
        },
        gastos: { orderBy: { id: 'asc' } },
        usuario: true,
      },
    });

    if (!cierre) {
      cierre = await prisma.cierreCaja.create({
        data: {
          fecha: hoy,
          usuario_id: usuario.id,
        },
        include: {
          ventas: {
            include: { producto: true },
            orderBy: { id: 'asc' },
          },
          gastos: { orderBy: { id: 'asc' } },
          usuario: true,
        },
      });
    }

    // Traer productos del catálogo activos
    const productos = await prisma.producto.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });

    return { success: true, cierre, productos };
  } catch (error: any) {
    console.error('Error en cierre de caja:', error);
    return { success: false, message: error.message || 'Error al obtener el cierre.' };
  }
}

// Actualizar efectivo inicial
export async function actualizarEfectivoInicialAction(cierreId: string, monto: number) {
  try {
    await prisma.cierreCaja.update({
      where: { id: cierreId },
      data: { efectivo_inicial: monto },
    });
    revalidatePath('/admin/cierre-caja');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// Agregar venta de fábrica
export async function agregarVentaAction(data: {
  cierreId: string;
  descripcion: string;
  productoId?: string;
  cantidad: number;
  precioUnitario: number;
  metodoPago: MetodoPagoCaja;
  esOtro: boolean;
}) {
  try {
    const subtotal = data.cantidad * data.precioUnitario;
    await prisma.ventaCierreCaja.create({
      data: {
        cierre_id: data.cierreId,
        descripcion: data.descripcion,
        producto_id: data.productoId || null,
        cantidad: data.cantidad,
        precio_unitario: data.precioUnitario,
        subtotal,
        metodo_pago: data.metodoPago,
        es_otro: data.esOtro,
      },
    });
    await recalcularTotales(data.cierreId);
    revalidatePath('/admin/cierre-caja');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// Eliminar venta
export async function eliminarVentaAction(ventaId: string, cierreId: string) {
  try {
    await prisma.ventaCierreCaja.delete({ where: { id: ventaId } });
    await recalcularTotales(cierreId);
    revalidatePath('/admin/cierre-caja');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// Editar venta
export async function editarVentaAction(data: {
  ventaId: string;
  cierreId: string;
  descripcion: string;
  productoId?: string;
  cantidad: number;
  precioUnitario: number;
  metodoPago: MetodoPagoCaja;
  esOtro: boolean;
}) {
  try {
    const subtotal = data.cantidad * data.precioUnitario;
    await prisma.ventaCierreCaja.update({
      where: { id: data.ventaId },
      data: {
        descripcion: data.descripcion,
        producto_id: data.productoId || null,
        cantidad: data.cantidad,
        precio_unitario: data.precioUnitario,
        subtotal,
        metodo_pago: data.metodoPago,
        es_otro: data.esOtro,
      },
    });
    await recalcularTotales(data.cierreId);
    revalidatePath('/admin/cierre-caja');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// Agregar gasto de caja
export async function agregarGastoAction(data: {
  cierreId: string;
  descripcion: string;
  tipo: string;
  monto: number;
}) {
  try {
    await prisma.gastoCierreCaja.create({
      data: {
        cierre_id: data.cierreId,
        descripcion: data.descripcion,
        tipo: data.tipo,
        monto: data.monto,
      },
    });
    revalidatePath('/admin/cierre-caja');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// Editar gasto de caja
export async function editarGastoAction(data: {
  gastoId: string;
  descripcion: string;
  tipo: string;
  monto: number;
}) {
  try {
    await prisma.gastoCierreCaja.update({
      where: { id: data.gastoId },
      data: {
        descripcion: data.descripcion,
        tipo: data.tipo,
        monto: data.monto,
      },
    });
    revalidatePath('/admin/cierre-caja');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// Eliminar gasto
export async function eliminarGastoAction(gastoId: string) {
  try {
    await prisma.gastoCierreCaja.delete({ where: { id: gastoId } });
    revalidatePath('/admin/cierre-caja');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// Cerrar la caja del día
export async function cerrarCajaAction(cierreId: string) {
  try {
    await prisma.cierreCaja.update({
      where: { id: cierreId },
      data: { estado: 'CERRADO' },
    });
    revalidatePath('/admin/cierre-caja');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// Obtener historial de cierres anteriores
export async function obtenerHistorialCierresAction(limite = 50) {
  try {
    const cierres = await prisma.cierreCaja.findMany({
      orderBy: { fecha: 'desc' },
      take: limite,
      include: {
        usuario: true,
        ventas: true,
        gastos: true,
      },
    });
    return { success: true, cierres };
  } catch (error: any) {
    return { success: false, cierres: [], message: error.message };
  }
}

// Obtener cierres filtrados por mes y año
export async function obtenerCierresMensualesAction(anio: number, mes: number) {
  try {
    const fechaInicio = new Date(Date.UTC(anio, mes - 1, 1, 0, 0, 0));
    const fechaFin = new Date(Date.UTC(anio, mes, 0, 23, 59, 59, 999));

    const cierres = await prisma.cierreCaja.findMany({
      where: {
        fecha: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      orderBy: { fecha: 'desc' },
      include: {
        usuario: true,
        ventas: {
          include: { producto: true },
          orderBy: { id: 'asc' },
        },
        gastos: { orderBy: { id: 'asc' } },
      },
    });

    return { success: true, cierres };
  } catch (error: any) {
    return { success: false, cierres: [], message: error.message };
  }
}

// Obtener detalle de un cierre específico
export async function obtenerDetalleCierreAction(cierreId: string) {
  try {
    const cierre = await prisma.cierreCaja.findUnique({
      where: { id: cierreId },
      include: {
        usuario: true,
        ventas: {
          include: { producto: true },
          orderBy: { id: 'asc' },
        },
        gastos: { orderBy: { id: 'asc' } },
      },
    });
    if (!cierre) return { success: false, message: 'Cierre no encontrado' };
    return { success: true, cierre };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// Buscar cierre de caja por fecha exacta (formato YYYY-MM-DD)
export async function obtenerCierrePorFechaAction(fechaStr: string) {
  try {
    const [anioStr, mesStr, diaStr] = fechaStr.split('-');
    const anio = parseInt(anioStr, 10);
    const mes = parseInt(mesStr, 10);
    const dia = parseInt(diaStr, 10);

    if (isNaN(anio) || isNaN(mes) || isNaN(dia)) {
      return { success: false, message: 'Formato de fecha inválido. Use AAAA-MM-DD.' };
    }

    const fechaInicio = new Date(Date.UTC(anio, mes - 1, dia, 0, 0, 0));
    const fechaFin = new Date(Date.UTC(anio, mes - 1, dia, 23, 59, 59, 999));

    const cierre = await prisma.cierreCaja.findFirst({
      where: {
        fecha: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      include: {
        usuario: true,
        ventas: {
          include: { producto: true },
          orderBy: { id: 'asc' },
        },
        gastos: { orderBy: { id: 'asc' } },
      },
    });

    if (!cierre) {
      return { success: false, message: `No se encontró arqueo de caja registrado para el ${dia}/${mes}/${anio}.` };
    }

    return { success: true, cierre };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ── Internos ──────────────────────────────────────────────────────────────────
async function recalcularTotales(cierreId: string) {
  const ventas = await prisma.ventaCierreCaja.findMany({ where: { cierre_id: cierreId } });

  const totales = {
    total_efectivo: 0,
    total_tarjeta: 0,
    total_transferencia: 0,
    total_credito_oficina: 0,
    total_pagina_web: 0,
    total_general: 0,
  };

  for (const v of ventas) {
    totales.total_general += v.subtotal;
    if (v.metodo_pago === 'EFECTIVO') totales.total_efectivo += v.subtotal;
    else if (v.metodo_pago === 'TARJETA') totales.total_tarjeta += v.subtotal;
    else if (v.metodo_pago === 'TRANSFERENCIA') totales.total_transferencia += v.subtotal;
    else if (v.metodo_pago === 'CREDITO_OFICINA') totales.total_credito_oficina += v.subtotal;
    else if (v.metodo_pago === 'PAGINA_WEB') totales.total_pagina_web += v.subtotal;
  }

  await prisma.cierreCaja.update({ where: { id: cierreId }, data: totales });
}
