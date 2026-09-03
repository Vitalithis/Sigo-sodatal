'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '../../../../lib/prisma';
import { Rol } from '../../../../lib/prisma/generated';

const ROLES_VALIDOS: Rol[] = ['ADMIN', 'OFICINA', 'REPARTIDOR'];

async function getRolActual() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email) return null;
  const usuario = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { rol: true },
  });
  return usuario?.rol ?? null;
}

export async function listUsuarios() {
  if ((await getRolActual()) !== 'ADMIN') {
    throw new Error('No autorizado.');
  }

  const usuarios = await prisma.usuario.findMany({
    select: {
      id: true,
      email: true,
      rol: true,
      nombre: true,
      created_at: true,
    },
    orderBy: { created_at: 'asc' },
  });

  return usuarios.map((u) => ({
    id: u.id,
    email: u.email,
    rol: u.rol,
    nombre: u.nombre,
    creadoEn: u.created_at.toISOString(),
  }));
}

export async function actualizarRol(userId: string, nuevoRol: string) {
  if ((await getRolActual()) !== 'ADMIN') {
    return { success: false, error: 'No autorizado.' };
  }
  if (!ROLES_VALIDOS.includes(nuevoRol as Rol)) {
    return { success: false, error: 'Rol inválido.' };
  }

  await prisma.usuario.update({
    where: { id: userId },
    data: { rol: nuevoRol as Rol },
  });

  revalidatePath('/admin/roles');
  return { success: true, error: '' };
}