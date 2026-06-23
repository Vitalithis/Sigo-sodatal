import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // 💡 Movemos el "new PrismaClient()" AQUÍ ADENTRO.
  // Al estar dentro de la función, Next.js NO lo ejecutará en frío al compilar el proyecto.
  const prisma = new PrismaClient();

  try {
    const body = await request.json();
    const { cliente_id, marca, modelo, numero_serie, foto_url } = body;

    if (!cliente_id || !marca || !modelo) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const nuevoDispensador = await prisma.dispensador.create({
      data: {
        cliente_id,
        marca,
        modelo,
        numero_serie: numero_serie || null,
        foto_url: foto_url || null,
        estado: 'EN_CLIENTE',
      },
    });

    return NextResponse.json({ success: true, data: nuevoDispensador }, { status: 201 });
  } catch (error: unknown) {
    console.error('ERROR CRÍTICO EN API DISPENSADORES:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: 'Error interno del servidor', details: errorMessage }, { status: 500 });
  } finally {
    // Cerramos la conexión al terminar la petición para evitar fugas en la base de datos
    await prisma.$disconnect();
  }
}