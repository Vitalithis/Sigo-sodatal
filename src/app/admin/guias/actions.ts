'use server';

import { prisma } from '../../../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { auth } from '../../../lib/auth';
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
  // Soporte para guía de reemplazo
  reemplaza_a_guia_id?: string;
  conservar_entrega?: boolean;
  hora_entrega?: Date | string;
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
        OR: terminosDir,
      },
      take: 20,
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

  const mapa = new Map<string, any>();
  for (const c of porNombreORut) mapa.set(c.id, c);
  for (const c of porOtros) {
    if (!mapa.has(c.id)) mapa.set(c.id, c);
  }
  const todos = Array.from(mapa.values());

  const calcularRelevancia = (cli: any): number => {
    const nomNorm = normalizar(cli.nombre);
    const rutNorm = normalizar(cli.rut_empresa);
    const dirNorm = normalizar(cli.direccion);
    const telNorm = normalizar(cli.telefono);

    if (nomNorm === qNorm) return 0;
    if (nomNorm.startsWith(qNorm)) return 1;

    const palabrasNom = nomNorm.split(/\s+/);
    if (palabrasNom.some((p) => p.startsWith(qNorm))) return 2;
    if (nomNorm.includes(qNorm)) return 3;
    if (rutNorm.includes(qNorm)) return 4;
    if (dirNorm.startsWith(qNorm)) return 5;

    const palabrasDir = dirNorm.split(/\s+/);
    if (palabrasDir.some((p) => p.startsWith(qNorm))) return 6;
    if (dirNorm.includes(qNorm)) return 7;
    if (telNorm.includes(qNorm)) return 8;

    return 9;
  };

  todos.sort((a, b) => {
    const relA = calcularRelevancia(a);
    const relB = calcularRelevancia(b);
    if (relA !== relB) return relA - relB;
    return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
  });

  return { success: true, clientes: todos.slice(0, 15) };
}

export async function crearGuiaAction(data: NuevaGuiaInput) {
  try {
    const { metodo_pago, items, pedido_id, parada_id, ...restData } = data;
    const cliente = await prisma.cliente.findUnique({ where: { id: restData.cliente_id } });
    if (!cliente) throw new Error('Cliente no encontrado.');

    const itemsData = items.map((it) => ({ ...it, subtotal: Number((it.cantidad * it.precio_unitario).toFixed(2)) }));
    const total = itemsData.reduce((acc, i) => acc + i.subtotal, 0);

    // Derivar forma_pago clara y legible
    let formaPagoTexto = 'EFECTIVO';
    if (metodo_pago === 'TARJETA') formaPagoTexto = 'TARJETA';
    else if (metodo_pago === 'TRANSFERENCIA') formaPagoTexto = 'TRANSFERENCIA';
    else if (metodo_pago === 'GUIA_MENSUAL' || cliente.modalidad_pago === 'MENSUAL') formaPagoTexto = 'CREDITO';

    // Determinar hora de entrega (conservada si es reemplazo con confirmación)
    let horaEntregaFinal = new Date();
    if (restData.conservar_entrega && restData.hora_entrega) {
      horaEntregaFinal = new Date(restData.hora_entrega);
    }

    // Ejecutar creación y vinculación bidireccional en una transacción atómica
    const guia = await prisma.$transaction(async (tx) => {
      const nueva = await tx.guiaDespacho.create({
        data: {
          cliente_id: restData.cliente_id,
          direccion_entrega: restData.direccion_entrega,
          usuario_repartidor_id: restData.usuario_repartidor_id,
          nombre_receptor: restData.nombre_receptor,
          rut_receptor: restData.rut_receptor || undefined,
          observaciones: restData.observaciones || undefined,
          firma_digital: restData.firma_digital || undefined,
          botellones_prestados_entrega: restData.botellones_prestados_entrega || 0,
          pedido_id: pedido_id || undefined,
          total,
          hora_entrega: horaEntregaFinal,
          estado: derivarEstadoEntrega(metodo_pago, cliente.modalidad_pago),
          estado_documento: 'VIGENTE',
          forma_pago: formaPagoTexto,
          reemplaza_a_guia_id: restData.reemplaza_a_guia_id || undefined,
          items: { create: itemsData },
        },
      });

      // Vincular guía anulada origen con la nueva de reemplazo
      if (restData.reemplaza_a_guia_id) {
        await tx.guiaDespacho.update({
          where: { id: restData.reemplaza_a_guia_id },
          data: {
            reemplazada_por_guia_id: nueva.id,
          },
        });
      }

      return nueva;
    });

    if (parada_id) {
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
        },
      });

      if (pedido_id) {
        await prisma.pedido.update({
          where: { id: pedido_id },
          data: {
            metodo_pago_web: metodo_pago,
            pagado: metodo_pago !== 'GUIA_MENSUAL',
            estado: 'ENTREGADO',
          },
        });
      }
      revalidatePath('/repartidor/ruta');
      revalidatePath('/admin/rutas');
    }

    revalidatePath('/admin/guias');
    return { success: true, numero_correlativo: guia.numero_correlativo, guia_id: guia.id };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Error al crear comprobante' };
  }
}

// ────────────────────────────────────────────────────────────────
// Exportación SQL (Para GuiasManager.tsx)
// ────────────────────────────────────────────────────────────────
export async function exportarGuiaSQLAction(id: string) {
  try {
    const guia = await prisma.guiaDespacho.findUnique({
      where: { id },
      include: {
        cliente: true,
        usuario_repartidor: true,
        items: { include: { producto: true } },
      },
    });
    if (!guia) return { success: false, message: 'La guía no existe.' };

    const sqlLines = [
      `-- Exportación Comprobante de Entrega #${guia.numero_correlativo} - SODATAL`,
      `-- Generado el: ${new Date().toISOString()}`,
      `START TRANSACTION;`,
      ``,
      `-- Inserción de la Guía / Comprobante`,
      `INSERT INTO \`GuiaDespacho\` (`,
      `  \`id\`, \`numero_correlativo\`, \`fecha_emision\`, \`cliente_id\`, \`pedido_id\`,`,
      `  \`direccion_entrega\`, \`usuario_repartidor_id\`, \`estado\`, \`estado_documento\`, \`forma_pago\`, \`nombre_receptor\`,`,
      `  \`rut_receptor\`, \`hora_entrega\`, \`observaciones\`, \`total\`, \`firma_digital\`,`,
      `  \`botellones_prestados_entrega\`, \`incluida_en_cierre\`, \`fecha_cierre\`, \`motivo_anulacion\`, \`anulada_motivo\`, \`anulada_at\`, \`reemplaza_a_guia_id\`, \`reemplazada_por_guia_id\``,
      `) VALUES (`,
      `  ${escapeSQL(guia.id)},`,
      `  ${guia.numero_correlativo},`,
      `  ${escapeSQL(guia.fecha_emision)},`,
      `  ${escapeSQL(guia.cliente_id)},`,
      `  ${escapeSQL(guia.pedido_id)},`,
      `  ${escapeSQL(guia.direccion_entrega)},`,
      `  ${escapeSQL(guia.usuario_repartidor_id)},`,
      `  ${escapeSQL(guia.estado)},`,
      `  ${escapeSQL(guia.estado_documento || 'VIGENTE')},`,
      `  ${escapeSQL(guia.forma_pago)},`,
      `  ${escapeSQL(guia.nombre_receptor)},`,
      `  ${escapeSQL(guia.rut_receptor)},`,
      `  ${escapeSQL(guia.hora_entrega)},`,
      `  ${escapeSQL(guia.observaciones)},`,
      `  ${guia.total},`,
      `  ${escapeSQL(guia.firma_digital)},`,
      `  ${guia.botellones_prestados_entrega},`,
      `  ${escapeSQL(guia.incluida_en_cierre)},`,
      `  ${escapeSQL(guia.fecha_cierre)},`,
      `  ${escapeSQL(guia.motivo_anulacion)},`,
      `  ${escapeSQL(guia.anulada_motivo)},`,
      `  ${escapeSQL(guia.anulada_at)},`,
      `  ${escapeSQL(guia.reemplaza_a_guia_id)},`,
      `  ${escapeSQL(guia.reemplazada_por_guia_id)}`,
      `);`,
      ``,
      `-- Inserción de Items del Comprobante`,
      ...guia.items.map(
        (it) =>
          `INSERT INTO \`ItemGuia\` (\`id\`, \`guia_id\`, \`producto_id\`, \`tipo_transaccion\`, \`cantidad\`, \`precio_unitario\`, \`subtotal\`) ` +
          `VALUES (${escapeSQL(it.id)}, ${escapeSQL(it.guia_id)}, ${escapeSQL(it.producto_id)}, ${escapeSQL(it.tipo_transaccion)}, ${it.cantidad}, ${it.precio_unitario}, ${it.subtotal});`
      ),
      ``,
      `COMMIT;`,
    ];

    return {
      success: true,
      sql: sqlLines.join('\n'),
      filename: `comprobante_${String(guia.numero_correlativo).padStart(6, '0')}.sql`,
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Error al exportar SQL' };
  }
}

// ────────────────────────────────────────────────────────────────
// Cierre Mensual de Guías a Crédito (Exportación SQL y CSV)
// ────────────────────────────────────────────────────────────────
function generarInsertGuiaSQL(guia: any): string {
  const lines: string[] = [];
  const folioStr = String(guia.numero_correlativo || '').padStart(6, '0');
  lines.push(
    `-- Guía N° #${folioStr} — Cliente: ${guia.cliente?.nombre || 'S/N'} — Total: $${Number(guia.total || 0).toLocaleString('es-CL')}`
  );
  lines.push(
    `INSERT INTO guias_despacho (id, numero_correlativo, fecha_emision, cliente_id, cliente_nombre, direccion_entrega, repartidor, estado, nombre_receptor, rut_receptor, hora_entrega, metodo_pago, botellones_prestados_entrega, total) VALUES (`
  );
  const repartidorNombre = guia.usuario_repartidor
    ? `${guia.usuario_repartidor.nombre} ${guia.usuario_repartidor.apellido || ''}`.trim()
    : null;
  lines.push(
    `  ${escapeSQL(guia.id)}, ${escapeSQL(guia.numero_correlativo)}, ${escapeSQL(
      guia.fecha_emision
    )}, ${escapeSQL(guia.cliente_id)}, ${escapeSQL(guia.cliente?.nombre || null)}, ${escapeSQL(
      guia.direccion_entrega || guia.cliente?.direccion || null
    )}, ${escapeSQL(repartidorNombre)}, ${escapeSQL(guia.estado)}, ${escapeSQL(
      guia.nombre_receptor
    )}, ${escapeSQL(guia.rut_receptor)}, ${escapeSQL(guia.hora_entrega)}, ${escapeSQL(
      guia.forma_pago || 'CREDITO'
    )}, ${escapeSQL(guia.botellones_prestados_entrega || 0)}, ${escapeSQL(guia.total)}`
  );
  lines.push(`);`);

  (guia.items || []).forEach((it: any) => {
    lines.push(
      `INSERT INTO items_guia (id, guia_id, producto_id, producto_nombre, tipo_transaccion, cantidad, precio_unitario, subtotal) VALUES (`
    );
    lines.push(
      `  ${escapeSQL(it.id)}, ${escapeSQL(it.guia_id)}, ${escapeSQL(it.producto_id)}, ${escapeSQL(
        it.producto?.nombre || 'Producto'
      )}, ${escapeSQL(it.tipo_transaccion)}, ${escapeSQL(it.cantidad)}, ${escapeSQL(
        it.precio_unitario
      )}, ${escapeSQL(it.subtotal)}`
    );
    lines.push(`);`);
  });

  return lines.join('\n');
}

export interface ExportarSqlInput {
  mes?: number;
  anio?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  cliente_id?: string;
  solo_credito?: boolean;
}

export async function exportarGuiasSQLAction(input: ExportarSqlInput | number, anioFallback?: number) {
  try {
    let mes: number;
    let anio: number;
    let soloCredito = true;
    let clienteId: string | undefined;

    if (typeof input === 'object') {
      mes = input.mes || new Date().getMonth() + 1;
      anio = input.anio || new Date().getFullYear();
      soloCredito = input.solo_credito !== false;
      clienteId = input.cliente_id;
    } else {
      mes = input;
      anio = anioFallback || new Date().getFullYear();
    }

    const inicio = new Date(anio, mes - 1, 1);
    const fin = new Date(anio, mes, 1);

    // Condición base: no anuladas
    const baseWhere: any = {
      fecha_emision: { gte: inicio, lt: fin },
      estado: { not: 'ANULADA' },
      OR: [
        { estado_documento: null },
        { estado_documento: 'VIGENTE' },
      ],
    };

    // Filtro estricto por forma de pago
    if (soloCredito) {
      baseWhere.AND = [
        {
          OR: [
            { estado: 'ENTREGADA_CREDITO' },
            { forma_pago: 'CREDITO' },
          ],
        },
      ];
    }

    if (clienteId && clienteId !== 'TODOS') {
      baseWhere.cliente_id = clienteId;
    }

    const guias = await prisma.guiaDespacho.findMany({
      where: baseWhere,
      include: { 
        cliente: true, 
        usuario_repartidor: true, 
        items: { include: { producto: true } } 
      },
      orderBy: [{ cliente: { nombre: 'asc' } }, { numero_correlativo: 'asc' }],
    });

    if (guias.length === 0) {
      const tipoTxt = soloCredito ? 'a crédito' : '';
      return {
        success: false,
        message: `No se encontraron comprobantes ${tipoTxt} en el período ${String(mes).padStart(2, '0')}/${anio}.`.trim(),
      };
    }

    // Agrupación por cliente
    const porCliente = new Map<string, typeof guias>();
    guias.forEach((g) => {
      const arr = porCliente.get(g.cliente_id) || [];
      arr.push(g);
      porCliente.set(g.cliente_id, arr);
    });

    const totalMonto = guias.reduce((acc, g) => acc + (g.total || 0), 0);
    const mesStr = String(mes).padStart(2, '0');

    // ────────────────────────────────────────────────────────────
    // Construcción del archivo SQL consolidado
    // ────────────────────────────────────────────────────────────
    const sqlLines: string[] = [
      `-- ====================================================================`,
      `-- SODATAL - EXPORTACIÓN SQL PARA SOFTWARE DE FACTURACIÓN`,
      `-- Período: ${mesStr}/${anio}`,
      `-- Generado el: ${new Date().toISOString()}`,
      `-- Clientes incluidos: ${porCliente.size} | Total Guías: ${guias.length} | Monto Total: $${Math.round(totalMonto).toLocaleString('es-CL')}`,
      `-- Modo: ${soloCredito ? 'Solo Crédito / Cuenta Mensual' : 'Todas las Formas de Pago'}`,
      `-- ====================================================================`,
      ``,
      `START TRANSACTION;`,
      ``,
    ];

    for (const [, arr] of porCliente) {
      const cli = arr[0].cliente;
      const totalCli = arr.reduce((acc, g) => acc + (g.total || 0), 0);
      sqlLines.push(`-- ────────────────────────────────────────────────────────────────────`);
      sqlLines.push(`-- Cliente: ${cli?.nombre || 'Sin Nombre'} | RUT: ${cli?.rut_empresa || 'S/R'} | Total: $${Math.round(totalCli).toLocaleString('es-CL')} (${arr.length} guías)`);
      sqlLines.push(`-- ────────────────────────────────────────────────────────────────────`);
      for (const g of arr) {
        sqlLines.push(generarInsertGuiaSQL(g));
        sqlLines.push(``);
      }
    }

    sqlLines.push(`COMMIT;`);

    // ────────────────────────────────────────────────────────────
    // Construcción del archivo CSV consolidado (1 fila por guía, sin duplicar montos)
    // ────────────────────────────────────────────────────────────
    const sanitizar = (val: any) => {
      if (val === null || val === undefined) return '';
      let s = String(val).replace(/"/g, '""');
      if (s.length > 0 && ['=', '+', '-', '@', '\t', '\r'].includes(s[0])) {
        s = `'` + s;
      }
      return s;
    };

    const csvFilas: string[] = [];
    csvFilas.push(
      [
        'N° Guía',
        'Fecha Emisión',
        'Hora Entrega',
        'Cliente',
        'RUT Cliente',
        'Dirección Entrega',
        'Repartidor',
        'Forma Pago',
        'Receptor',
        'RUT Receptor',
        'Total ($)',
        'Envases Prestados',
        'Detalle Ítems',
      ].map((h) => `"${h}"`).join(';')
    );

    for (const g of guias) {
      const repNombre = g.usuario_repartidor
        ? `${g.usuario_repartidor.nombre} ${g.usuario_repartidor.apellido || ''}`.trim()
        : 'Sin asignar';
      const fechaEmisionStr = g.fecha_emision ? new Date(g.fecha_emision).toLocaleDateString('es-CL') : '';
      const horaEntregaStr = g.hora_entrega ? new Date(g.hora_entrega).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '';
      const folioFormatted = String(g.numero_correlativo || '').padStart(6, '0');

      const itemsDetalle = (g.items || [])
        .map((it: any) => `${it.cantidad}x ${it.producto?.nombre || 'Prod'} (${it.tipo_transaccion} - $${it.subtotal})`)
        .join(' | ');

      csvFilas.push(
        [
          `#${folioFormatted}`,
          fechaEmisionStr,
          horaEntregaStr,
          g.cliente?.nombre || '',
          g.cliente?.rut_empresa || '',
          g.direccion_entrega || g.cliente?.direccion || '',
          repNombre,
          g.forma_pago || 'CREDITO',
          g.nombre_receptor || '',
          g.rut_receptor || '',
          g.total || 0,
          g.botellones_prestados_entrega || 0,
          itemsDetalle,
        ]
          .map((val) => `"${sanitizar(val)}"`)
          .join(';')
      );
    }

    const csvContent = '\uFEFF' + csvFilas.join('\r\n');

    return {
      success: true,
      sql: sqlLines.join('\n'),
      csv: csvContent,
      filenameSql: `facturacion_sodatal_${anio}_${mesStr}.sql`,
      filenameCsv: `facturacion_sodatal_${anio}_${mesStr}.csv`,
      totalGuias: guias.length,
      totalClientes: porCliente.size,
      totalMonto,
      count: guias.length,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al exportar SQL para facturación',
    };
  }
}

export const exportarCierreMensualAction = exportarGuiasSQLAction;
export const procesarCierreMensualAction = exportarGuiasSQLAction;

// ────────────────────────────────────────────────────────────────
// Anulación de Guía (Flujo Robusto con Motivo Obligatorio y Auditoría)
// ────────────────────────────────────────────────────────────────
export async function anularGuiaAction(id: string, motivo: string, confirmacionFactura: boolean = false) {
  try {
    const motivoLimpio = motivo ? motivo.trim() : '';
    if (!motivoLimpio || motivoLimpio.length < 5) {
      return { success: false, message: 'Debes indicar un motivo de anulación detallado (mínimo 5 caracteres).' };
    }

    const guia = await prisma.guiaDespacho.findUnique({
      where: { id },
      include: {
        cliente: true,
        usuario_repartidor: true,
        items: { include: { producto: true } },
      },
    });

    if (!guia) return { success: false, message: 'El comprobante no existe.' };
    if (guia.estado === 'ANULADA' || guia.estado_documento === 'ANULADA') {
      return { success: false, message: 'Este documento ya se encuentra anulado.' };
    }

    // Advertencia obligatoria si ya tiene factura asociada
    if (guia.numero_factura && !confirmacionFactura) {
      return {
        success: false,
        requiereConfirmacionFactura: true,
        message: 'Esta guía ya está facturada; la corrección tributaria requiere nota de crédito.',
      };
    }

    // Identificar usuario que ejecuta la acción para auditoría
    let usuarioId: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (session?.user?.email) {
        const u = await prisma.usuario.findFirst({
          where: { OR: [{ email: session.user.email }, { user_id: session.user.id }] },
          select: { id: true },
        });
        if (u) usuarioId = u.id;
      }
    } catch {
      // Continuar si la sesión no está disponible
    }

    const guiaAnulada = await prisma.guiaDespacho.update({
      where: { id },
      data: {
        estado: 'ANULADA',
        estado_documento: 'ANULADA',
        motivo_anulacion: motivoLimpio,
        anulada_motivo: motivoLimpio,
        anulada_at: new Date(),
        anulada_por_id: usuarioId,
      },
      include: {
        cliente: true,
        usuario_repartidor: true,
        items: { include: { producto: true } },
      },
    });

    revalidatePath('/admin/guias');
    return { success: true, guia: guiaAnulada };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Error al anular el documento' };
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
    if (!guia) return { success: false, message: 'El comprobante no existe.' };

    if (guia.estado === 'ANULADA' || guia.estado_documento === 'ANULADA') {
      return { success: false, message: 'No se puede editar ni firmar un documento anulado.' };
    }

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

    if (!guia) return { success: false, message: 'Comprobante de entrega no encontrado.' };

    const g: any = guia;
    let reemplaza_a = null;
    let reemplazada_por = null;
    let anulada_por = null;

    if (g.reemplaza_a_guia_id) {
      const orig = await prisma.guiaDespacho.findUnique({
        where: { id: g.reemplaza_a_guia_id },
        select: { id: true, numero_correlativo: true },
      });
      if (orig) reemplaza_a = orig;
    }
    if (g.reemplazada_por_guia_id) {
      const reemp = await prisma.guiaDespacho.findUnique({
        where: { id: g.reemplazada_por_guia_id },
        select: { id: true, numero_correlativo: true },
      });
      if (reemp) reemplazada_por = reemp;
    }
    if (g.anulada_por_id) {
      const u = await prisma.usuario.findUnique({
        where: { id: g.anulada_por_id },
        select: { id: true, nombre: true, email: true },
      });
      if (u) anulada_por = u;
    }

    return {
      success: true,
      guia: {
        ...guia,
        reemplaza_a,
        reemplazada_por,
        anulada_por,
      },
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al obtener los datos del comprobante' };
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
  forma_pago?: string;
}

export async function obtenerGuiasPorClienteYRangoAction(filtros: FiltroDescargaGuiasInput) {
  try {
    const { cliente_id, fecha_desde, fecha_hasta, solo_firmadas, incluir_anuladas, forma_pago } = filtros;

    const whereClause: any = {};

    if (cliente_id && cliente_id !== 'TODOS') {
      whereClause.cliente_id = cliente_id;
    }

    // Por defecto se excluyen las guías anuladas
    if (!incluir_anuladas) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        { estado: { not: 'ANULADA' } },
        { OR: [{ estado_documento: null }, { estado_documento: 'VIGENTE' }] },
      ];
    }

    // Filtro por forma de pago
    if (forma_pago && forma_pago !== 'TODAS') {
      if (forma_pago === 'CREDITO') {
        whereClause.AND = [
          ...(whereClause.AND || []),
          {
            OR: [
              { estado: 'ENTREGADA_CREDITO' },
              { forma_pago: 'CREDITO' },
            ],
          },
        ];
      } else {
        whereClause.AND = [
          ...(whereClause.AND || []),
          { forma_pago },
        ];
      }
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

    const correlativoMap = new Map<string, number>();
    guias.forEach((g: any) => correlativoMap.set(g.id, g.numero_correlativo));

    const missingIds = new Set<string>();
    guias.forEach((g: any) => {
      if (g.reemplaza_a_guia_id && !correlativoMap.has(g.reemplaza_a_guia_id)) missingIds.add(g.reemplaza_a_guia_id);
      if (g.reemplazada_por_guia_id && !correlativoMap.has(g.reemplazada_por_guia_id)) missingIds.add(g.reemplazada_por_guia_id);
    });

    if (missingIds.size > 0) {
      const extras = await prisma.guiaDespacho.findMany({
        where: { id: { in: Array.from(missingIds) } },
        select: { id: true, numero_correlativo: true },
      });
      extras.forEach((eg) => correlativoMap.set(eg.id, eg.numero_correlativo));
    }

    const guiasEnriquecidas = guias.map((g: any) => ({
      ...g,
      reemplaza_a: g.reemplaza_a_guia_id && correlativoMap.has(g.reemplaza_a_guia_id)
        ? { id: g.reemplaza_a_guia_id, numero_correlativo: correlativoMap.get(g.reemplaza_a_guia_id)! }
        : null,
      reemplazada_por: g.reemplazada_por_guia_id && correlativoMap.has(g.reemplazada_por_guia_id)
        ? { id: g.reemplazada_por_guia_id, numero_correlativo: correlativoMap.get(g.reemplazada_por_guia_id)! }
        : null,
    }));

    let cliente = null;
    if (cliente_id && cliente_id !== 'TODOS') {
      cliente = await prisma.cliente.findUnique({ where: { id: cliente_id } });
    }

    return { success: true, guias: guiasEnriquecidas, cliente };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al consultar comprobantes por rango' };
  }
}
