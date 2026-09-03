import { auth } from './auth';
import { headers } from 'next/headers';
import { prisma } from '../../lib/prisma';

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function getUsuarioActual() {
  const session = await getSession();
  if (!session?.user?.email) return null;

  return prisma.usuario.findUnique({
    where: { email: session.user.email },
  });
}