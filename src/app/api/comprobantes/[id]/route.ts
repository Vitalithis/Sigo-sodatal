import { NextRequest, NextResponse } from 'next/server';
import { getUsuarioActual } from '@/lib/auth-session';
import {
  buscarComprobantePorId,
  actualizarEstadoDb,
  buscarComprobanteDuplicado
} from '@/services/comprobantes/comprobante-db.service';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioActual();
    const id = params.id;
    const body = await req.json();
    const { accion, cliente_id, monto, num_operacion, motivo_rechazo, banco_origen, rut_emisor } = body;

    const comprobante = await buscarComprobantePorId(id);
    if (!comprobante) {
      return NextResponse.json({ error: 'El comprobante solicitado no existe.' }, { status: 404 });
    }

    if (accion === 'CONCILIAR') {
      const nuevoMonto = monto !== undefined ? Number(monto) : comprobante.monto;
      const nuevoNumOp = num_operacion !== undefined ? String(num_operacion).trim() : comprobante.num_operacion;

      // Validar anti-duplicados si los campos clave fueron editados por el operador
      if (nuevoNumOp && nuevoMonto > 0) {
        const duplicado = await buscarComprobanteDuplicado(nuevoNumOp, nuevoMonto);
        if (duplicado && duplicado.id !== id) {
          return NextResponse.json(
            { error: `Existe otro comprobante con la operación ${nuevoNumOp} y monto $${nuevoMonto}.` },
            { status: 409 }
          );
        }
      }

      const actualizado = await actualizarEstadoDb(
        id,
        'CONCILIAR',
        {
          monto: nuevoMonto,
          num_operacion: nuevoNumOp,
          banco_origen,
          rut_emisor,
          cliente_id
        },
        usuario?.id || null
      );

      return NextResponse.json({ success: true, data: actualizado });
    }

    if (accion === 'RECHAZAR') {
      const actualizado = await actualizarEstadoDb(
        id,
        'RECHAZAR',
        { motivo_rechazo },
        usuario?.id || null
      );

      return NextResponse.json({ success: true, data: actualizado });
    }

    return NextResponse.json({ error: 'Acción inválida. Debe ser CONCILIAR o RECHAZAR.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error al conciliar/rechazar comprobante:', error);
    return NextResponse.json({ error: 'Error del servidor al procesar el comprobante.' }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const comprobante = await buscarComprobantePorId(params.id);
    if (!comprobante) {
      return NextResponse.json({ error: 'Comprobante no encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: comprobante });
  } catch (err: any) {
    return NextResponse.json({ error: 'Error al consultar comprobante.' }, { status: 500 });
  }
}
