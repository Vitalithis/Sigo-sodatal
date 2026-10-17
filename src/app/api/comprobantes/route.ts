import { NextRequest, NextResponse } from 'next/server';
import { listarComprobantesDb } from '@/services/comprobantes/comprobante-db.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get('estado') || 'PENDIENTE';

    const comprobantes = await listarComprobantesDb(estado);

    return NextResponse.json({ success: true, data: comprobantes });
  } catch (error: any) {
    console.error('Error al listar comprobantes:', error);
    return NextResponse.json(
      { error: 'Error al obtener comprobantes', detalles: error.message },
      { status: 500 }
    );
  }
}
