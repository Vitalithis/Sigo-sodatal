'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { auth } from '../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

async function getRolActual() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email) return null;
  const usuario = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { rol: true },
  });
  return usuario?.rol ?? null;
}

// ── Comunas ──────────────────────────────────────────────
export async function listComunas() {
  return prisma.comuna.findMany({
    orderBy: { nombre: 'asc' },
    include: { _count: { select: { sectores: true } } },
  });
}

export async function crearComuna(nombre: string) {
  if ((await getRolActual()) !== 'ADMIN') {
    return { success: false, error: 'No autorizado.' };
  }
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) return { success: false, error: 'Nombre requerido.' };

  try {
    await prisma.comuna.create({ data: { nombre: nombreLimpio } });
    revalidatePath('/admin/sectores');
    return { success: true, error: '' };
  } catch {
    return { success: false, error: 'Ya existe una comuna con ese nombre.' };
  }
}

export async function toggleComuna(id: string, activa: boolean) {
  if ((await getRolActual()) !== 'ADMIN') {
    return { success: false, error: 'No autorizado.' };
  }
  await prisma.comuna.update({ where: { id }, data: { activa } });
  revalidatePath('/admin/sectores');
  return { success: true, error: '' };
}

// ── Sectores ─────────────────────────────────────────────
export async function listSectores(comuna_id: string) {
  return prisma.sector.findMany({
    where: { comuna_id },
    orderBy: { nombre: 'asc' },
    include: { _count: { select: { clientes: true } } },
  });
}

export async function crearSector(nombre: string, comuna_id: string) {
  if ((await getRolActual()) !== 'ADMIN') {
    return { success: false, error: 'No autorizado.' };
  }
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) return { success: false, error: 'Nombre requerido.' };

  try {
    await prisma.sector.create({ data: { nombre: nombreLimpio, comuna_id } });
    revalidatePath('/admin/sectores');
    return { success: true, error: '' };
  } catch {
    return { success: false, error: 'Ya existe ese sector en esta comuna.' };
  }
}

export async function toggleSector(id: string, activo: boolean) {
  if ((await getRolActual()) !== 'ADMIN') {
    return { success: false, error: 'No autorizado.' };
  }
  await prisma.sector.update({ where: { id }, data: { activo } });
  revalidatePath('/admin/sectores');
  return { success: true, error: '' };
}
export async function editarComuna(id: string, nombre: string) {
  if ((await getRolActual()) !== 'ADMIN') {
    return { success: false, error: 'No autorizado.' };
  }
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) return { success: false, error: 'Nombre requerido.' };

  try {
    await prisma.comuna.update({ where: { id }, data: { nombre: nombreLimpio } });
    revalidatePath('/admin/sectores');
    return { success: true, error: '' };
  } catch {
    return { success: false, error: 'Ya existe una comuna con ese nombre.' };
  }
}

export async function eliminarComuna(id: string) {
  if ((await getRolActual()) !== 'ADMIN') {
    return { success: false, error: 'No autorizado.' };
  }
  const sectores = await prisma.sector.count({ where: { comuna_id: id } });
  if (sectores > 0) {
    return { success: false, error: 'No se puede eliminar una comuna con sectores.' };
  }
  await prisma.comuna.delete({ where: { id } });
  revalidatePath('/admin/sectores');
  return { success: true, error: '' };
}

export async function editarSector(id: string, nombre: string) {
  if ((await getRolActual()) !== 'ADMIN') {
    return { success: false, error: 'No autorizado.' };
  }
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) return { success: false, error: 'Nombre requerido.' };

  try {
    await prisma.sector.update({ where: { id }, data: { nombre: nombreLimpio } });
    revalidatePath('/admin/sectores');
    return { success: true, error: '' };
  } catch {
    return { success: false, error: 'Ya existe ese sector en esta comuna.' };
  }
}

export async function eliminarSector(id: string) {
  if ((await getRolActual()) !==  'ADMIN') {
    return { success: false, error: 'No autorizado.' };
  }
  const clientes = await prisma.cliente.count({ where: { sector_id: id } });
  if (clientes > 0) {
    return { success: false, error: `No se puede eliminar, tiene ${clientes} cliente(s) asignado(s).` };
  }
  await prisma.sector.delete({ where: { id } });
  revalidatePath('/admin/sectores');
  return { success: true, error: '' };
}