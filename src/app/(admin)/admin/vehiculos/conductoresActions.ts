'use server';

import { prisma } from '@/lib/prisma'; // Ajusta la ruta a tu cliente Prisma
import { revalidatePath } from 'next/cache';

export interface ConductorInput {
  rut: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  licencia_tipo: string;
  vencimiento_lic: string; // Recibido como string YYYY-MM-DD del input HTML
  estado: string;
}

export async function obtenerConductoresAction() {
  try {
    const conductores = await prisma.conductor.findMany({
      orderBy: { apellido: 'asc' },
    });
    return { success: true, data: conductores };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function crearConductorAction(input: ConductorInput) {
  try {
    // Validar RUT único básico
    const existe = await prisma.conductor.findUnique({ where: { rut: input.rut.trim().toUpperCase() } });
    if (existe) {
      return { success: false, message: 'Ya existe un conductor registrado con este RUT.' };
    }

    await prisma.conductor.create({
      data: {
        rut: input.rut.trim().toUpperCase(),
        nombre: input.nombre.trim(),
        apellido: input.apellido.trim(),
        telefono: input.telefono?.trim() || null,
        licencia_tipo: input.licencia_tipo,
        vencimiento_lic: new Date(input.vencimiento_lic + 'T00:00:00Z'),
        estado: input.estado,
      },
    });

    revalidatePath('/vehiculos');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function editarConductorAction(id: string, input: Partial<ConductorInput>) {
  try {
    await prisma.conductor.update({
      where: { id },
      data: {
        nombre: input.nombre?.trim(),
        apellido: input.apellido?.trim(),
        telefono: input.telefono?.trim() || null,
        licencia_tipo: input.licencia_tipo,
        vencimiento_lic: input.vencimiento_lic ? new Date(input.vencimiento_lic + 'T00:00:00Z') : undefined,
        estado: input.estado,
      },
    });

    revalidatePath('/vehiculos');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}