import { execFile } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface MovimientoCartola {
  origen_documento: 'TRANSFERENCIA_BANCARIA' | 'VOUCHER_POS' | 'DEPOSITO_VENTANILLA';
  banco_origen: string;
  monto: number;
  fecha_transaccion: string;
  num_operacion: string;
  rut_emisor: string | null;
  metodo_pago: 'TRANSFERENCIA' | 'TARJETA' | 'EFECTIVO';
  observaciones: string;
  pagina?: number;
  linea_original?: string;
}

export interface ExtractedComprobanteData {
  es_cartola?: boolean;
  total_movimientos?: number;
  movimientos?: MovimientoCartola[];
  origen_documento?: 'TRANSFERENCIA_BANCARIA' | 'VOUCHER_POS' | 'DEPOSITO_VENTANILLA' | 'OTRO';
  banco_origen?: string | null;
  monto?: number;
  fecha_transaccion?: string | null;
  num_operacion?: string;
  rut_emisor?: string | null;
  metodo_pago?: 'TRANSFERENCIA' | 'TARJETA' | 'EFECTIVO';
  confianza?: number;
  advertencias?: string[];
  es_legible: boolean;
  texto_extraido?: string;
}

export async function extraerDatosComprobanteLocal(
  filePathAbsoluto: string
): Promise<ExtractedComprobanteData> {
  const scriptPath = path.join(process.cwd(), 'scripts', 'extractor_comprobantes.py');

  try {
    const { stdout, stderr } = await execFileAsync('python', [scriptPath, filePathAbsoluto], {
      windowsHide: true,
      maxBuffer: 50 * 1024 * 1024, // 50 MB buffer para cartolas de cientos de páginas
      encoding: 'utf-8'
    });

    if (stderr && !stdout) {
      console.error('Stderr del script de Python:', stderr);
    }

    const cleaned = stdout.trim();
    if (!cleaned) {
      throw new Error('El script de extracción no devolvió ninguna salida.');
    }

    const resultado = JSON.parse(cleaned);

    if (resultado.error) {
      throw new Error(resultado.error);
    }

    if (resultado.es_cartola) {
      return {
        es_cartola: true,
        banco_origen: resultado.banco_origen || 'BancoEstado',
        total_movimientos: resultado.total_movimientos || (resultado.movimientos ? resultado.movimientos.length : 0),
        movimientos: resultado.movimientos || [],
        es_legible: resultado.es_legible !== false,
        advertencias: resultado.advertencias || []
      };
    }

    return {
      es_cartola: false,
      origen_documento: resultado.origen_documento || 'TRANSFERENCIA_BANCARIA',
      banco_origen: resultado.banco_origen || null,
      monto: Number(resultado.monto) || 0,
      fecha_transaccion: resultado.fecha_transaccion || null,
      num_operacion: String(resultado.num_operacion || '').trim(),
      rut_emisor: resultado.rut_emisor || null,
      metodo_pago: resultado.metodo_pago === 'TARJETA' ? 'TARJETA' : 'TRANSFERENCIA',
      confianza: typeof resultado.confianza === 'number' ? resultado.confianza : 0.8,
      advertencias: Array.isArray(resultado.advertencias) ? resultado.advertencias : [],
      es_legible: resultado.es_legible !== false,
      texto_extraido: resultado.texto_extraido || ''
    };
  } catch (error: any) {
    console.error('Error al ejecutar extractor de comprobantes en Python:', error);
    throw new Error(`Error en extractor local: ${error.message}`);
  }
}
