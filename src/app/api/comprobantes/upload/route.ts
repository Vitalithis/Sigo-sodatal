import { NextRequest, NextResponse } from 'next/server';
import { extraerDatosComprobanteLocal } from '@/services/comprobantes/ai-extractor.service';
import {
  insertarComprobantesLote,
  insertarComprobanteIndividual,
  buscarComprobanteDuplicado,
  obtenerPrimerPendiente
} from '@/services/comprobantes/comprobante-db.service';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Hasta 2 minutos para cartolas masivas

const TIPOS_VALIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se adjuntó ningún archivo en la petición.' }, { status: 400 });
    }

    if (!TIPOS_VALIDOS.includes(file.type)) {
      return NextResponse.json(
        { error: `Formato (${file.type}) no compatible. Utiliza archivos JPG, PNG, WEBP o PDF.` },
        { status: 400 }
      );
    }

    // 1. Guardar copia del archivo original en disco para trazabilidad y auditoría
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'comprobantes');
    await mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(file.name) || (file.type === 'application/pdf' ? '.pdf' : '.png');
    const safeFilename = `${Date.now()}-${uuidv4()}${ext}`;
    const filePath = path.join(uploadsDir, safeFilename);

    await writeFile(filePath, buffer);
    const urlArchivo = `/uploads/comprobantes/${safeFilename}`;

    // 2. Extraer datos con el script local de Python (100% GRATIS)
    let extraccion;
    try {
      extraccion = await extraerDatosComprobanteLocal(filePath);
    } catch (errorLocal: any) {
      console.error('Error durante la extracción local:', errorLocal);
      return NextResponse.json(
        {
          error: 'No fue posible extraer los datos del documento. Si es una foto, procura que el texto esté enfocado y con buena iluminación.',
          detalles: errorLocal?.message
        },
        { status: 422 }
      );
    }

    if (!extraccion.es_legible) {
      return NextResponse.json(
        {
          error: 'El archivo subido es ilegible o no contiene movimientos/comprobantes financieros reconocibles.',
          advertencias: extraccion.advertencias,
          url_archivo: urlArchivo
        },
        { status: 422 }
      );
    }

    // CASO A: CARTOLA BANCARIA CON MÚLTIPLES MOVIMIENTOS
    if (extraccion.es_cartola && extraccion.movimientos && extraccion.movimientos.length > 0) {
      const movimientosAbono = extraccion.movimientos;

      const registros = movimientosAbono.map((m, idx) => ({
        id: uuidv4(),
        origen_documento: m.origen_documento,
        banco_origen: m.banco_origen,
        monto: m.monto,
        fecha_transaccion: m.fecha_transaccion,
        num_operacion: m.num_operacion || `CT-${Date.now()}-${idx + 1}`,
        rut_emisor: m.rut_emisor,
        metodo_pago: m.metodo_pago,
        estado: 'PENDIENTE',
        url_archivo: urlArchivo,
        nombre_archivo: file.name,
        mime_type: file.type,
        confianza_ia: 1.0,
        observaciones_ia: m.observaciones || null
      }));

      // Inserción segura y masiva con anti-duplicados garantizada
      const totalInsertados = await insertarComprobantesLote(registros);

      // Obtener el primer comprobante disponible para la vista previa
      const primerComprobante = await obtenerPrimerPendiente(urlArchivo);

      return NextResponse.json({
        success: true,
        es_cartola: true,
        total_movimientos: registros.length,
        importados: totalInsertados,
        duplicados_omitidos: Math.max(0, registros.length - totalInsertados),
        data: primerComprobante
      });
    }

    // CASO B: COMPROBANTE INDIVIDUAL / VOUCHER POS
    const numOp = extraccion.num_operacion || '';
    const montoNum = extraccion.monto || 0;

    // Regla estricta Anti-Duplicados
    if (numOp && montoNum > 0) {
      const comprobanteExistente = await buscarComprobanteDuplicado(numOp, montoNum);
      if (comprobanteExistente) {
        return NextResponse.json(
          {
            error: `Comprobante duplicado: La operación ${numOp} con monto $${montoNum.toLocaleString('es-CL')} ya se encuentra registrada en el sistema.`,
            codigo: 'RECEIPT_ALREADY_EXISTS',
            duplicado: comprobanteExistente
          },
          { status: 409 }
        );
      }
    }

    const nuevoComprobante = await insertarComprobanteIndividual({
      origen_documento: extraccion.origen_documento || 'TRANSFERENCIA_BANCARIA',
      banco_origen: extraccion.banco_origen || null,
      monto: montoNum,
      fecha_transaccion: extraccion.fecha_transaccion || null,
      num_operacion: numOp || `S-NUM-${Date.now()}`,
      rut_emisor: extraccion.rut_emisor || null,
      metodo_pago: extraccion.metodo_pago === 'TARJETA' ? 'TARJETA' : 'TRANSFERENCIA',
      estado: 'PENDIENTE',
      url_archivo: urlArchivo,
      nombre_archivo: file.name,
      mime_type: file.type,
      confianza_ia: extraccion.confianza ?? 1.0,
      observaciones_ia: extraccion.advertencias?.join(', ') || null
    });

    return NextResponse.json({
      success: true,
      es_cartola: false,
      data: nuevoComprobante,
      iaResult: extraccion
    });
  } catch (err: any) {
    console.error('Error en /api/comprobantes/upload:', err);
    return NextResponse.json(
      { error: 'Error del servidor al registrar el comprobante.', detalles: err.message },
      { status: 500 }
    );
  }
}
