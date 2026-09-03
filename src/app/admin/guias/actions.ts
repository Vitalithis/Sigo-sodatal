'use server';

import { prisma } from '../../../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { MetodoPago, ModalidadPago, TipoTransaccion } from '../../../../lib/prisma/generated';

// ────────────────────────────────────────────────────────────────
// Tipos e Interfaces
// ────────────────────────────────────────────────────────────────
export interface ItemGuiaInput {
  producto_id: string;
  tipo_transaccion: TipoTransaccion;
  cantidad: number;
  precio_unitario: number;
}

export interface NuevaGuiaInput {
  cliente_id: string;
  direccion_entrega: string;
  usuario_repartidor_id: string;
  metodo_pago: MetodoPago;
  nombre_receptor: string;
  rut_receptor?: string;
  observaciones?: string;
  botellones_prestados_entrega?: number;
  items: ItemGuiaInput[];
}

// ────────────────────────────────────────────────────────────────
// Lógica Auxiliar
// ────────────────────────────────────────────────────────────────
const derivarEstadoEntrega = (metodoPago: MetodoPago, modalidadPago: ModalidadPago) => {
  if (metodoPago === 'GUIA_MENSUAL' || modalidadPago === 'MENSUAL') return 'ENTREGADA_CREDITO';
  return metodoPago === 'TARJETA' ? 'ENTREGADA_TARJETA' : 'ENTREGADA_EFECTIVO';
};

const escapeSQL = (v: any): string => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

// ────────────────────────────────────────────────────────────────
// Acciones de CRUD
// ────────────────────────────────────────────────────────────────
export async function buscarClientesGuiaAction(criterio: string) {
  if (!criterio || criterio.length < 2) return { success: true, clientes: [] };
  const clientes = await prisma.cliente.findMany({
    where: { activo: true, OR: [{ nombre: { contains: criterio, mode: 'insensitive' } }] },
    take: 8,
    select: { id: true, nombre: true, direccion: true, modalidad_pago: true }
  });
  return { success: true, clientes };
}

export async function crearGuiaAction(data: NuevaGuiaInput) {
  try {
    const cliente = await prisma.cliente.findUnique({ where: { id: data.cliente_id } });
    if (!cliente) throw new Error('Cliente no encontrado.');

    const itemsData = data.items.map(it => ({ ...it, subtotal: Number((it.cantidad * it.precio_unitario).toFixed(2)) }));
    const total = itemsData.reduce((acc, i) => acc + i.subtotal, 0);

    const guia = await prisma.guiaDespacho.create({
      data: {
        ...data,
        total,
        estado: derivarEstadoEntrega(data.metodo_pago, cliente.modalidad_pago),
        items: { create: itemsData }
      }
    });

    revalidatePath('/admin/guias');
    return { success: true, numero_correlativo: guia.numero_correlativo };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Error al crear guía' };
  }
}

// ────────────────────────────────────────────────────────────────
// Exportación SQL (Para GuiasManager.tsx)
// ────────────────────────────────────────────────────────────────
export async function exportarGuiaSQLAction(id: string) {
  try {
    const guia = await prisma.guiaDespacho.findUnique({
      where: { id },
      include: { cliente: true, usuario_repartidor: true, items: { include: { producto: true } } },
    });
    if (!guia) return { success: false, message: 'La guía no existe.' };

    const sql = `-- Exportación individual — Guía N° ${guia.numero_correlativo}\n` +
                `INSERT INTO guias (id, numero, total) VALUES (${escapeSQL(guia.id)}, ${guia.numero_correlativo}, ${guia.total});`;

    return { success: true, sql, filename: `guia_${guia.numero_correlativo}.sql` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ────────────────────────────────────────────────────────────────
// Cierre Mensual (Para CierreMensualModal.tsx)
// ────────────────────────────────────────────────────────────────
export async function exportarCierreMensualAction(mes: number, anio: number) {
  try {
    const inicio = new Date(anio, mes - 1, 1);
    const fin = new Date(anio, mes, 1);

    const guias = await prisma.guiaDespacho.findMany({
      where: { estado: 'ENTREGADA_CREDITO', incluida_en_cierre: false, fecha_emision: { gte: inicio, lt: fin } },
      include: { cliente: true, items: { include: { producto: true } } }
    });

    if (guias.length === 0) return { success: false, message: 'No hay guías pendientes.' };

    await prisma.$transaction(
      guias.map(g => prisma.guiaDespacho.update({
        where: { id: g.id },
        data: { incluida_en_cierre: true, fecha_cierre: new Date() }
      }))
    );

    revalidatePath('/admin/guias');
    // Devolvemos el conteo para que el Modal no dé error
    return { success: true, count: guias.length }; 
  } catch (error) {
    return { success: false, message: 'Error procesando cierre mensual' };
  }
}
// ────────────────────────────────────────────────────────────────
// Anulación de Guía (Para AnularGuiaModal.tsx)
// ────────────────────────────────────────────────────────────────
export async function anularGuiaAction(id: string, motivo: string) {
  try {
    if (!motivo || motivo.trim().length < 3) {
      return { success: false, message: 'Debes indicar un motivo de anulación válido.' };
    }

    const guia = await prisma.guiaDespacho.findUnique({ where: { id } });
    if (!guia) return { success: false, message: 'La guía no existe.' };
    if (guia.estado === 'ANULADA') {
      return { success: false, message: 'Esta guía ya se encuentra anulada.' };
    }

    await prisma.guiaDespacho.update({
      where: { id },
      data: {
        estado: 'ANULADA',
        motivo_anulacion: motivo.trim(),
      },
    });

    revalidatePath('/admin/guias');
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Error al anular la guía' };
  }
}
