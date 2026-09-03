import { NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Obtener y validar parámetros
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const mes = parseInt(searchParams.get('mes') || '0');
  const anio = parseInt(searchParams.get('anio') || '0');

  // 2. Seguridad estricta
  if (!process.env.EXPORT_API_KEY || token !== process.env.EXPORT_API_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // 3. Validación lógica de fechas
  if (mes < 1 || mes > 12 || anio < 2000) {
    return NextResponse.json({ error: 'Parámetros mes o anio inválidos' }, { status: 400 });
  }

  try {
    const inicio = new Date(anio, mes - 1, 1);
    const fin = new Date(anio, mes, 1);

    // 4. Consulta optimizada
    // Nota: Solo seleccionamos los campos necesarios para reducir el tamaño del payload
    const guias = await prisma.guiaDespacho.findMany({
      where: {
        estado: 'ENTREGADA_CREDITO',
        incluida_en_cierre: false,
        fecha_emision: { gte: inicio, lt: fin },
        cliente: { modalidad_pago: 'MENSUAL' },
      },
      select: {
        id: true,
        numero_correlativo: true,
        total: true,
        fecha_emision: true,
        nombre_receptor: true,
        cliente: { select: { nombre: true, rut: true } },
        items: { 
          select: { 
            cantidad: true, 
            precio_unitario: true, 
            subtotal: true,
            producto: { select: { nombre: true } } 
          } 
        }
      },
    });

    // 5. Respuesta exitosa
    return NextResponse.json({
      success: true,
      data: guias,
      meta: {
        periodo: `${mes}/${anio}`,
        totalRegistros: guias.length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error en API exportar-guias:', error);
    // No devolvemos el detalle del error al cliente por seguridad
    return NextResponse.json(
      { error: 'Error interno al procesar la exportación' }, 
      { status: 500 }
    );
  }
}
