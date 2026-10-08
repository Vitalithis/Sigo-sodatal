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
  firma_digital?: string;
  botellones_prestados_entrega?: number;
  items: ItemGuiaInput[];
  pedido_id?: string;
  parada_id?: string;
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
  if (!criterio || criterio.trim().length < 2) return { success: true, clientes: [] };
  const rawQ = criterio.trim();
  const qSinTildes = rawQ.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const normalizar = (txt?: string | null) =>
    (txt || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const qNorm = normalizar(rawQ);

  // Variantes de búsqueda para asegurar coincidencia en MySQL independiente de collation
  const terminosNombre = [{ nombre: { contains: rawQ } }];
  if (qSinTildes !== rawQ) {
    terminosNombre.push({ nombre: { contains: qSinTildes } });
  }

  const terminosRut = [{ rut_empresa: { contains: rawQ } }];
  if (qSinTildes !== rawQ) {
    terminosRut.push({ rut_empresa: { contains: qSinTildes } });
  }

  const terminosDir = [{ direccion: { contains: rawQ } }];
  if (qSinTildes !== rawQ) {
    terminosDir.push({ direccion: { contains: qSinTildes } });
  }

  // Buscamos en paralelo:
  // 1) Clientes coincidentes por NOMBRE o RUT (máxima prioridad)
  // 2) Clientes coincidentes por DIRECCIÓN o TELÉFONO (menor prioridad)
  // De esta manera, calles como "San Martín" nunca desplazan a personas llamadas "Martín".
  const [porNombreORut, porOtros] = await Promise.all([
    prisma.cliente.findMany({
      where: {
        activo: true,
        OR: [...terminosNombre, ...terminosRut],
      },
      take: 30,
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        telefono: true,
        modalidad_pago: true,
        rut_empresa: true,
        giro: true,
      },
    }),
    prisma.cliente.findMany({
      where: {
        activo: true,
        OR: [...terminosDir, { telefono: { contains: rawQ } }],
      },
      take: 20,
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        telefono: true,
        modalidad_pago: true,
        rut_empresa: true,
        giro: true,
      },
    }),
  ]);

  // Combinar y deduplicar por ID
  const mapa = new Map<string, (typeof porNombreORut)[0]>();
  for (const c of porNombreORut) mapa.set(c.id, c);
  for (const c of porOtros) {
    if (!mapa.has(c.id)) mapa.set(c.id, c);
  }
  const todos = Array.from(mapa.values());

  // Función de puntuación de relevancia: menor puntuación = mayor prioridad
  const calcularRelevancia = (c: (typeof porNombreORut)[0]) => {
    const nombreNorm = normalizar(c.nombre);
    const rutNorm = normalizar(c.rut_empresa);
    const dirNorm = normalizar(c.direccion);
    const telNorm = normalizar(c.telefono);

    // 1. El nombre empieza exactamente con el criterio (ej: "Martín...")
    if (nombreNorm.startsWith(qNorm)) return 1;

    // 2. Alguna palabra del nombre empieza con el criterio (ej: "Don Martín", "Comercial Martín")
    const palabrasNom = nombreNorm.split(/\s+/);
    if (palabrasNom.some((p) => p.startsWith(qNorm))) return 2;

    // 3. El nombre contiene el criterio en cualquier parte
    if (nombreNorm.includes(qNorm)) return 3;

    // 4. El RUT contiene el criterio
    if (rutNorm && rutNorm.includes(qNorm)) return 4;

    // 5. La dirección empieza con el criterio
    if (dirNorm.startsWith(qNorm)) return 5;

    // 6. Alguna palabra de la dirección empieza con el criterio (ej: "Calle San Martín")
    const palabrasDir = dirNorm.split(/\s+/);
    if (palabrasDir.some((p) => p.startsWith(qNorm))) return 6;

    // 7. La dirección contiene el criterio
    if (dirNorm.includes(qNorm)) return 7;

    // 8. El teléfono contiene el criterio
    if (telNorm.includes(qNorm)) return 8;

    return 9;
  };

  todos.sort((a, b) => {
    const relA = calcularRelevancia(a);
    const relB = calcularRelevancia(b);
    if (relA !== relB) return relA - relB;
    // Si tienen la misma relevancia, ordenar estrictamente alfabético por nombre
    return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
  });

  return { success: true, clientes: todos.slice(0, 15) };
}

export async function crearGuiaAction(data: NuevaGuiaInput) {
  try {
    const { metodo_pago, items, pedido_id, parada_id, ...restData } = data;
    const cliente = await prisma.cliente.findUnique({ where: { id: restData.cliente_id } });
    if (!cliente) throw new Error('Cliente no encontrado.');

    const itemsData = items.map(it => ({ ...it, subtotal: Number((it.cantidad * it.precio_unitario).toFixed(2)) }));
    const total = itemsData.reduce((acc, i) => acc + i.subtotal, 0);

    const guia = await prisma.guiaDespacho.create({
      data: {
        ...restData,
        pedido_id: pedido_id || undefined,
        total,
        hora_entrega: new Date(),
        estado: derivarEstadoEntrega(metodo_pago, cliente.modalidad_pago),
        items: { create: itemsData }
      }
    });

    if (parada_id) {
      // Sumar cantidades de items para la parada
      let bot20 = 0;
      let bot10 = 0;
      let soda = 0;

      for (const item of items) {
        const prod = await prisma.producto.findUnique({ where: { id: item.producto_id } });
        if (prod?.categoria === 'BOTELLON20') bot20 += item.cantidad;
        else if (prod?.categoria === 'BOTELLON10') bot10 += item.cantidad;
        else if (prod?.categoria === 'SODA') soda += item.cantidad;
      }

      await prisma.paradaDia.update({
        where: { id: parada_id },
        data: {
          estado: 'ENTREGADO',
          bot20_entregado: bot20,
          bot10_entregado: bot10,
          soda_entregada: soda,
        }
      });

      if (pedido_id) {
        await prisma.pedido.update({
          where: { id: pedido_id },
          data: {
            metodo_pago_web: metodo_pago,
            pagado: metodo_pago !== 'GUIA_MENSUAL',
            estado: 'ENTREGADO',
          }
        });
      }
      revalidatePath('/repartidor/ruta');
      revalidatePath('/admin/rutas');
    }

    revalidatePath('/admin/guias');
    return { success: true, numero_correlativo: guia.numero_correlativo, guia_id: guia.id };
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

// ────────────────────────────────────────────────────────────────
// Guardar Firma Digital Posterior (Para Guías sin firma previa)
// ────────────────────────────────────────────────────────────────
export async function guardarFirmaGuiaAction(id: string, firma_digital: string) {
  try {
    if (!firma_digital || !firma_digital.trim()) {
      return { success: false, message: 'Se requiere el trazo de la firma digital.' };
    }

    const guia = await prisma.guiaDespacho.findUnique({ where: { id } });
    if (!guia) return { success: false, message: 'La guía no existe.' };

    await prisma.guiaDespacho.update({
      where: { id },
      data: {
        firma_digital: firma_digital.trim(),
      },
    });

    revalidatePath('/admin/guias');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al guardar la firma digital' };
  }
}

// ────────────────────────────────────────────────────────────────
// Obtener Guía Completa por ID (Para VerGuiaModal)
// ────────────────────────────────────────────────────────────────
export async function obtenerGuiaPorIdAction(id: string) {
  try {
    const guia = await prisma.guiaDespacho.findUnique({
      where: { id },
      include: {
        cliente: true,
        usuario_repartidor: true,
        items: { include: { producto: true } },
      },
    });

    if (!guia) return { success: false, message: 'Guía de despacho no encontrada.' };
    return { success: true, guia };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al obtener los datos de la guía' };
  }
}

// ────────────────────────────────────────────────────────────────
// Obtener Guías por Cliente y Rango de Fechas (Para Descarga de Lote / Dossier)
// ────────────────────────────────────────────────────────────────
export interface FiltroDescargaGuiasInput {
  cliente_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  solo_firmadas?: boolean;
  incluir_anuladas?: boolean;
}

export async function obtenerGuiasPorClienteYRangoAction(filtros: FiltroDescargaGuiasInput) {
  try {
    const { cliente_id, fecha_desde, fecha_hasta, solo_firmadas, incluir_anuladas } = filtros;

    const whereClause: any = {};

    if (cliente_id && cliente_id !== 'TODOS') {
      whereClause.cliente_id = cliente_id;
    }

    if (!incluir_anuladas) {
      whereClause.estado = { not: 'ANULADA' };
    }

    if (solo_firmadas) {
      whereClause.firma_digital = { not: null };
    }

    if (fecha_desde || fecha_hasta) {
      whereClause.fecha_emision = {};
      if (fecha_desde) {
        whereClause.fecha_emision.gte = new Date(`${fecha_desde}T00:00:00`);
      }
      if (fecha_hasta) {
        whereClause.fecha_emision.lte = new Date(`${fecha_hasta}T23:59:59`);
      }
    }

    const guias = await prisma.guiaDespacho.findMany({
      where: whereClause,
      include: {
        cliente: true,
        usuario_repartidor: true,
        items: { include: { producto: true } },
      },
      orderBy: { fecha_emision: 'asc' },
    });

    let cliente = null;
    if (cliente_id && cliente_id !== 'TODOS') {
      cliente = await prisma.cliente.findUnique({ where: { id: cliente_id } });
    }

    return { success: true, guias, cliente };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al consultar guías por rango' };
  }
}


