import { NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const clientes = await prisma.cliente.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        rut_empresa: true,
        direccion: true,
        deuda: true
      },
      orderBy: { nombre: 'asc' },
      take: 1000
    });

    return NextResponse.json(clientes);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    return NextResponse.json([], { status: 500 });
  }
}
