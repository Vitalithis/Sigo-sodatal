'use server';

import { prisma } from '@/src/lib/prisma';
import { revalidatePath } from 'next/cache';
import { MetodoPago, ModalidadPago, TipoTransaccion } from '@prisma/client';

// ────────────────────────────────────────────────────────────────
// Tipos
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
// Búsquedas auxiliares para el formulario
// ────────────────────────────────────────────────────────────────
export async function buscarClientesGuiaAction(criterio: string) {
  try {
    if (!criterio || criterio.trim().length < 2) return { success: true, clientes: [] };
    const clientes = await prisma.cliente.findMany({
      where: {
        activo: true,
        OR: [
          { nombre: { contains: criterio, mode: 'insensitive' } },
          { telefono: { contains: criterio } },
          { direccion: { contains: criterio, mode: 'insensitive' } },
        ],
      },
      take: 8,
      orderBy: { nombre: 'asc' },
    });
    return { success: true, clientes };
  } catch (error: any) {
    return { success: false, clientes: [], message: error.message };
  }
}

export async function obtenerRepartidoresAction() {
  try {
    const repartidores = await prisma.usuario.findMany({
      where: { rol: 'REPARTIDOR', activo: true },
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, apellido: true },
    });
    return { success: true, repartidores };
  } catch (error: any) {
    return { success: false, repartidores: [], message: error.message };
  }
}

export async function obtenerProductosGuiaAction() {
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

// ────────────────────────────────────────────────────────────────
// CRUD de Guías
// ────────────────────────────────────────────────────────────────
// Deriva el estado de entrega según el método de pago real. Si el cliente es
// de modalidad MENSUAL o el método de pago es GUIA_MENSUAL, la guía queda
// ENTREGADA_CREDITO (pendiente de cierre mensual); en cualquier otro caso
// queda ENTREGADA_EFECTIVO o ENTREGADA_TARJETA según corresponda.
function derivarEstadoEntrega(metodoPago: MetodoPago, modalidadPago: ModalidadPago): 'ENTREGADA_CREDITO' | 'ENTREGADA_EFECTIVO' | 'ENTREGADA_TARJETA' {
  if (metodoPago === 'GUIA_MENSUAL' || modalidadPago === 'MENSUAL') return 'ENTREGADA_CREDITO';
  if (metodoPago === 'TARJETA') return 'ENTREGADA_TARJETA';
  return 'ENTREGADA_EFECTIVO';
}

// La guía se crea y entrega en un solo paso: ya incluye receptor y método de
// pago real, así que nace directamente en su estado de entrega definitivo.
export async function crearGuiaAction(data: NuevaGuiaInput) {
  try {
    if (!data.cliente_id) return { success: false, message: 'Debes seleccionar un cliente.' };
    if (!data.usuario_repartidor_id) return { success: false, message: 'Debes asignar un repartidor.' };
    if (!data.nombre_receptor?.trim()) return { success: false, message: 'Debes indicar el nombre de quien recibe.' };
    if (!data.items || data.items.length === 0) {
      return { success: false, message: 'Debes agregar al menos un producto a la guía.' };
    }

    const cliente = await prisma.cliente.findUnique({ where: { id: data.cliente_id } });
    if (!cliente) return { success: false, message: 'El cliente seleccionado no existe.' };

    const itemsData = data.items.map((it) => ({
      producto_id: it.producto_id,
      tipo_transaccion: it.tipo_transaccion,
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario,
      subtotal: Number((it.cantidad * it.precio_unitario).toFixed(2)),
    }));
    const total = Number(itemsData.reduce((acc, i) => acc + i.subtotal, 0).toFixed(2));
    const estado = derivarEstadoEntrega(data.metodo_pago, cliente.modalidad_pago);

    const guia = await prisma.guiaDespacho.create({
      data: {
        cliente_id: data.cliente_id,
        direccion_entrega: data.direccion_entrega,
        usuario_repartidor_id: data.usuario_repartidor_id,
        metodo_pago: data.metodo_pago,
        nombre_receptor: data.nombre_receptor,
        rut_receptor: data.rut_receptor || null,
        hora_entrega: new Date(),
        observaciones: data.observaciones || null,
        botellones_prestados_entrega: data.botellones_prestados_entrega || 0,
        total,
        estado,
        items: { create: itemsData },
      },
    });

    revalidatePath('/admin/guias');
    return { success: true, numero_correlativo: guia.numero_correlativo };
  } catch (error: any) {
    console.error('Error al crear guía:', error);
    return { success: false, message: error.message || 'Error al crear la guía.' };
  }
}

export async function anularGuiaAction(id: string, motivo: string) {
  try {
    if (!motivo || motivo.trim().length < 3) {
      return { success: false, message: 'Debes indicar un motivo de anulación.' };
    }
    const guia = await prisma.guiaDespacho.findUnique({ where: { id } });
    if (!guia) return { success: false, message: 'La guía no existe.' };
    if (guia.estado === 'ANULADA') return { success: false, message: 'La guía ya está anulada.' };
    if (guia.incluida_en_cierre) {
      return { success: false, message: 'No se puede anular una guía ya incluida en un cierre mensual.' };
    }

    await prisma.guiaDespacho.update({
      where: { id },
      data: { estado: 'ANULADA', motivo_anulacion: motivo.trim() },
    });

    revalidatePath('/admin/guias');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'No se pudo anular la guía.' };
  }
}

// ────────────────────────────────────────────────────────────────
// Exportación SQL
// ────────────────────────────────────────────────────────────────
function escapeSQL(v: any): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

function generarInsertGuiaSQL(guia: any): string {
  const lines: string[] = [];
  lines.push(
    `-- Guía N° ${guia.numero_correlativo} — Cliente: ${guia.cliente.nombre} — Estado: ${guia.estado}`
  );
  lines.push(
    `INSERT INTO guias_despacho (id, numero_correlativo, fecha_emision, cliente_id, cliente_nombre, direccion_entrega, repartidor, estado, nombre_receptor, rut_receptor, hora_entrega, metodo_pago, botellones_prestados_entrega, total) VALUES (`
  );
  lines.push(
    `  ${escapeSQL(guia.id)}, ${escapeSQL(guia.numero_correlativo)}, ${escapeSQL(
      guia.fecha_emision
    )}, ${escapeSQL(guia.cliente_id)}, ${escapeSQL(guia.cliente.nombre)}, ${escapeSQL(
      guia.direccion_entrega
    )}, ${escapeSQL(
      guia.usuario_repartidor ? `${guia.usuario_repartidor.nombre} ${guia.usuario_repartidor.apellido || ''}`.trim() : null
    )}, ${escapeSQL(guia.estado)}, ${escapeSQL(guia.nombre_receptor)}, ${escapeSQL(
      guia.rut_receptor
    )}, ${escapeSQL(guia.hora_entrega)}, ${escapeSQL(guia.metodo_pago)}, ${escapeSQL(
      guia.botellones_prestados_entrega
    )}, ${escapeSQL(guia.total)}`
  );
  lines.push(`);`);

  guia.items.forEach((it: any) => {
    lines.push(
      `INSERT INTO items_guia (id, guia_id, producto_id, producto_nombre, tipo_transaccion, cantidad, precio_unitario, subtotal) VALUES (`
    );
    lines.push(
      `  ${escapeSQL(it.id)}, ${escapeSQL(it.guia_id)}, ${escapeSQL(it.producto_id)}, ${escapeSQL(
        it.producto.nombre
      )}, ${escapeSQL(it.tipo_transaccion)}, ${escapeSQL(it.cantidad)}, ${escapeSQL(
        it.precio_unitario
      )}, ${escapeSQL(it.subtotal)}`
    );
    lines.push(`);`);
  });

  return lines.join('\n');
}

export async function exportarGuiaSQLAction(id: string) {
  try {
    const guia = await prisma.guiaDespacho.findUnique({
      where: { id },
      include: { cliente: true, usuario_repartidor: true, items: { include: { producto: true } } },
    });
    if (!guia) return { success: false, message: 'La guía no existe.' };

    const sql = [
      `-- Exportación individual — Guía N° ${guia.numero_correlativo}`,
      `-- Generado: ${new Date().toISOString()}`,
      '',
      generarInsertGuiaSQL(guia),
    ].join('\n');

    return { success: true, sql, filename: `guia_${guia.numero_correlativo}.sql` };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al exportar la guía.' };
  }
}

// Cierre mensual: agrupa guías ENTREGADA_CREDITO de clientes MENSUAL dentro del
// periodo indicado que aún no se hayan cerrado, genera el SQL consolidado por
// cliente y las marca como incluidas en el cierre.
export async function exportarCierreMensualAction(mes: number, anio: number) {
  try {
    const inicio = new Date(anio, mes - 1, 1);
    const fin = new Date(anio, mes, 1);

    const guias = await prisma.guiaDespacho.findMany({
      where: {
        estado: 'ENTREGADA_CREDITO',
        incluida_en_cierre: false,
        fecha_emision: { gte: inicio, lt: fin },
        cliente: { modalidad_pago: 'MENSUAL' },
      },
      include: { cliente: true, usuario_repartidor: true, items: { include: { producto: true } } },
      orderBy: { cliente: { nombre: 'asc' } },
    });

    if (guias.length === 0) {
      return {
        success: false,
        message: 'No hay guías a crédito pendientes de facturar en ese periodo.',
      };
    }

    const porCliente = new Map<string, typeof guias>();
    guias.forEach((g) => {
      const arr = porCliente.get(g.cliente_id) || [];
      arr.push(g);
      porCliente.set(g.cliente_id, arr);
    });

    const lines: string[] = [];
    lines.push(`-- Cierre mensual de guías a crédito — ${String(mes).padStart(2, '0')}/${anio}`);
    lines.push(`-- Generado: ${new Date().toISOString()}`);
    lines.push(`-- Clientes incluidos: ${porCliente.size} — Guías incluidas: ${guias.length}`);

    for (const [, arr] of porCliente) {
      const cliente = arr[0].cliente;
      const totalCliente = Number(arr.reduce((acc, g) => acc + g.total, 0).toFixed(2));
      lines.push('');
      lines.push(`-- ═══ Cliente: ${cliente.nombre} — ${arr.length} guía(s) — Total: $${totalCliente} ═══`);
      arr.forEach((g) => lines.push(generarInsertGuiaSQL(g)));
    }

    // Marcamos como incluidas en el cierre para que no vuelvan a salir en el
    // próximo. El estado sigue siendo ENTREGADA_CREDITO (solo refleja cómo se
    // entregó); la facturación real la asigna el sistema externo.
    await prisma.$transaction(
      guias.map((g) =>
        prisma.guiaDespacho.update({
          where: { id: g.id },
          data: { incluida_en_cierre: true, fecha_cierre: new Date() },
        })
      )
    );

    revalidatePath('/admin/guias');
    return {
      success: true,
      sql: lines.join('\n'),
      filename: `cierre_mensual_${anio}_${String(mes).padStart(2, '0')}.sql`,
      totalGuias: guias.length,
      totalClientes: porCliente.size,
    };
  } catch (error: any) {
    console.error('Error en cierre mensual:', error);
    return { success: false, message: error.message || 'Error al generar el cierre mensual.' };
  }
}