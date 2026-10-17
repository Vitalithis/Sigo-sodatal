import { prisma } from '@lib/prisma';
import { v4 as uuidv4 } from 'uuid';

function escapeSqlString(str: string | null | undefined): string {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

function escapeSqlDate(date: Date | string | null | undefined): string {
  if (!date) return 'NULL';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'NULL';
  return `'${d.toISOString().slice(0, 19).replace('T', ' ')}'`;
}

export interface RegistroComprobanteInput {
  id?: string;
  origen_documento: string;
  banco_origen: string | null;
  monto: number;
  fecha_transaccion: Date | string | null;
  num_operacion: string;
  rut_emisor: string | null;
  metodo_pago: string;
  estado?: string;
  url_archivo: string;
  nombre_archivo: string;
  mime_type: string;
  confianza_ia?: number;
  observaciones_ia?: string | null;
}

/**
 * Inserta un lote de comprobantes con soporte anti-duplicados (INSERT IGNORE).
 * Funciona de manera inmediata tanto con el cliente Prisma activo como con fallback Raw SQL.
 */
export async function insertarComprobantesLote(registros: RegistroComprobanteInput[]): Promise<number> {
  if (registros.length === 0) return 0;

  // Intento 1: Prisma Client ORM si está disponible en memoria
  if ((prisma as any).comprobantePago?.createMany) {
    try {
      const res = await (prisma as any).comprobantePago.createMany({
        data: registros,
        skipDuplicates: true
      });
      return res.count;
    } catch (err) {
      console.warn('Prisma ORM falló en createMany, usando inserción directa SQL:', err);
    }
  }

  // Intento 2: Inserción directa SQL por bloques (INSERT IGNORE)
  let totalInsertados = 0;
  const CHUNK_SIZE = 300;

  for (let i = 0; i < registros.length; i += CHUNK_SIZE) {
    const chunk = registros.slice(i, i + CHUNK_SIZE);
    const valueTuples = chunk.map((r) => {
      const id = escapeSqlString(r.id || uuidv4());
      const origen = escapeSqlString(r.origen_documento || 'TRANSFERENCIA_BANCARIA');
      const banco = escapeSqlString(r.banco_origen);
      const monto = Number(r.monto) || 0;
      const fTrans = escapeSqlDate(r.fecha_transaccion);
      const numOp = escapeSqlString(r.num_operacion);
      const rut = escapeSqlString(r.rut_emisor);
      const metodo = escapeSqlString(r.metodo_pago || 'TRANSFERENCIA');
      const estado = escapeSqlString(r.estado || 'PENDIENTE');
      const url = escapeSqlString(r.url_archivo);
      const nom = escapeSqlString(r.nombre_archivo);
      const mime = escapeSqlString(r.mime_type);
      const conf = typeof r.confianza_ia === 'number' ? r.confianza_ia : 1.0;
      const obs = escapeSqlString(r.observaciones_ia);

      return `(${id}, ${origen}, ${banco}, ${monto}, ${fTrans}, ${numOp}, ${rut}, ${metodo}, ${estado}, ${url}, ${nom}, ${mime}, ${conf}, ${obs}, NOW(3), NOW(3))`;
    });

    const sql = `
      INSERT IGNORE INTO ComprobantePago 
      (id, origen_documento, banco_origen, monto, fecha_transaccion, num_operacion, rut_emisor, metodo_pago, estado, url_archivo, nombre_archivo, mime_type, confianza_ia, observaciones_ia, created_at, updated_at)
      VALUES ${valueTuples.join(', ')}
    `;

    const count = await prisma.$executeRawUnsafe(sql);
    totalInsertados += Number(count) || 0;
  }

  return totalInsertados;
}

/**
 * Inserta un comprobante individual.
 */
export async function insertarComprobanteIndividual(r: RegistroComprobanteInput): Promise<any> {
  const id = r.id || uuidv4();

  if ((prisma as any).comprobantePago?.create) {
    try {
      return await (prisma as any).comprobantePago.create({
        data: {
          id,
          origen_documento: r.origen_documento,
          banco_origen: r.banco_origen,
          monto: r.monto,
          fecha_transaccion: r.fecha_transaccion ? new Date(r.fecha_transaccion) : null,
          num_operacion: r.num_operacion,
          rut_emisor: r.rut_emisor,
          metodo_pago: r.metodo_pago,
          estado: r.estado || 'PENDIENTE',
          url_archivo: r.url_archivo,
          nombre_archivo: r.nombre_archivo,
          mime_type: r.mime_type,
          confianza_ia: r.confianza_ia ?? 1.0,
          observaciones_ia: r.observaciones_ia || null
        }
      });
    } catch (e) {
      console.warn('Prisma ORM create falló, ejecutando con SQL directo:', e);
    }
  }

  await insertarComprobantesLote([{ ...r, id }]);
  return await buscarComprobantePorId(id);
}

/**
 * Busca si existe un comprobante duplicado por num_operacion y monto.
 */
export async function buscarComprobanteDuplicado(num_operacion: string, monto: number): Promise<any | null> {
  if ((prisma as any).comprobantePago?.findFirst) {
    try {
      return await (prisma as any).comprobantePago.findFirst({
        where: { num_operacion, monto }
      });
    } catch {}
  }

  const sql = `
    SELECT id, num_operacion, monto, estado, created_at, url_archivo 
    FROM ComprobantePago 
    WHERE num_operacion = ${escapeSqlString(num_operacion)} AND monto = ${Number(monto)} 
    LIMIT 1
  `;
  const rows: any[] = await prisma.$queryRawUnsafe(sql);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Obtiene un comprobante por ID.
 */
export async function buscarComprobantePorId(id: string): Promise<any | null> {
  if ((prisma as any).comprobantePago?.findUnique) {
    try {
      return await (prisma as any).comprobantePago.findUnique({
        where: { id }
      });
    } catch {}
  }

  const sql = `SELECT * FROM ComprobantePago WHERE id = ${escapeSqlString(id)} LIMIT 1`;
  const rows: any[] = await prisma.$queryRawUnsafe(sql);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Obtiene el primer comprobante pendiente de un archivo.
 */
export async function obtenerPrimerPendiente(url_archivo: string): Promise<any | null> {
  if ((prisma as any).comprobantePago?.findFirst) {
    try {
      return await (prisma as any).comprobantePago.findFirst({
        where: { url_archivo, estado: 'PENDIENTE' },
        orderBy: { created_at: 'desc' }
      });
    } catch {}
  }

  const sql = `
    SELECT * FROM ComprobantePago 
    WHERE url_archivo = ${escapeSqlString(url_archivo)} AND estado = 'PENDIENTE' 
    ORDER BY created_at DESC 
    LIMIT 1
  `;
  const rows: any[] = await prisma.$queryRawUnsafe(sql);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Lista comprobantes por estado.
 */
export async function listarComprobantesDb(estado?: string): Promise<any[]> {
  if ((prisma as any).comprobantePago?.findMany) {
    try {
      return await (prisma as any).comprobantePago.findMany({
        where: estado === 'TODOS' ? undefined : { estado },
        orderBy: { created_at: 'desc' },
        take: 50,
        include: {
          cliente: { select: { id: true, nombre: true, rut_empresa: true } }
        }
      });
    } catch {}
  }

  let sql = `
    SELECT cp.*, c.nombre as cliente_nombre, c.rut_empresa as cliente_rut 
    FROM ComprobantePago cp
    LEFT JOIN Cliente c ON cp.cliente_id = c.id
  `;
  if (estado && estado !== 'TODOS') {
    sql += ` WHERE cp.estado = ${escapeSqlString(estado)}`;
  }
  sql += ` ORDER BY cp.created_at DESC LIMIT 50`;

  const rows: any[] = await prisma.$queryRawUnsafe(sql);
  return rows.map((r) => ({
    ...r,
    cliente: r.cliente_id ? { id: r.cliente_id, nombre: r.cliente_nombre, rut_empresa: r.cliente_rut } : null
  }));
}

/**
 * Actualiza estado a CONCILIADO o RECHAZADO.
 */
export async function actualizarEstadoDb(
  id: string,
  accion: 'CONCILIAR' | 'RECHAZAR',
  datos: any,
  usuarioId: string | null
): Promise<any> {
  if ((prisma as any).comprobantePago?.update) {
    try {
      if (accion === 'CONCILIAR') {
        return await (prisma as any).comprobantePago.update({
          where: { id },
          data: {
            estado: 'CONCILIADO',
            monto: datos.monto ? Number(datos.monto) : undefined,
            num_operacion: datos.num_operacion || undefined,
            banco_origen: datos.banco_origen,
            rut_emisor: datos.rut_emisor,
            cliente_id: datos.cliente_id || null,
            conciliado_por_id: usuarioId,
            fecha_conciliacion: new Date()
          }
        });
      }
      if (accion === 'RECHAZAR') {
        return await (prisma as any).comprobantePago.update({
          where: { id },
          data: {
            estado: 'RECHAZADO',
            motivo_rechazo: datos.motivo_rechazo || 'Rechazado manualmente',
            conciliado_por_id: usuarioId,
            fecha_conciliacion: new Date()
          }
        });
      }
    } catch {}
  }

  // Fallback SQL
  if (accion === 'CONCILIAR') {
    const setClauses = [
      `estado = 'CONCILIADO'`,
      `fecha_conciliacion = NOW(3)`,
      `conciliado_por_id = ${escapeSqlString(usuarioId)}`
    ];
    if (datos.monto) setClauses.push(`monto = ${Number(datos.monto)}`);
    if (datos.num_operacion) setClauses.push(`num_operacion = ${escapeSqlString(datos.num_operacion)}`);
    if (datos.banco_origen !== undefined) setClauses.push(`banco_origen = ${escapeSqlString(datos.banco_origen)}`);
    if (datos.rut_emisor !== undefined) setClauses.push(`rut_emisor = ${escapeSqlString(datos.rut_emisor)}`);
    if (datos.cliente_id !== undefined) setClauses.push(`cliente_id = ${escapeSqlString(datos.cliente_id)}`);

    await prisma.$executeRawUnsafe(`UPDATE ComprobantePago SET ${setClauses.join(', ')} WHERE id = ${escapeSqlString(id)}`);
  } else {
    const setClauses = [
      `estado = 'RECHAZADO'`,
      `fecha_conciliacion = NOW(3)`,
      `conciliado_por_id = ${escapeSqlString(usuarioId)}`,
      `motivo_rechazo = ${escapeSqlString(datos.motivo_rechazo || 'Rechazado manualmente')}`
    ];
    await prisma.$executeRawUnsafe(`UPDATE ComprobantePago SET ${setClauses.join(', ')} WHERE id = ${escapeSqlString(id)}`);
  }

  return await buscarComprobantePorId(id);
}
