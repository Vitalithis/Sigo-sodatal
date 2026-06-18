import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fuerza a Next.js a permitir payloads gigantes en esta API
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cliente_id, marca, modelo, numero_serie, foto_url } = body;

    if (!cliente_id || !marca || !modelo) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Guardado directo en Supabase mediante el Prisma corregido
    const nuevoDispensador = await prisma.dispensador.create({
      data: {
        cliente_id,
        marca,
        modelo,
        numero_serie: numero_serie || null,
        foto_url: foto_url || null, // Aquí cae el Base64 puro
        estado: 'EN_CLIENTE',
      },
    });

    return NextResponse.json({ success: true, data: nuevoDispensador }, { status: 201 });
  } catch (error: any) {
    console.error('ERROR CRÍTICO EN API DISPENSADORES:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}