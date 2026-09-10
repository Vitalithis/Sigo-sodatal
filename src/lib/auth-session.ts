import { auth } from './auth';
import { headers } from 'next/headers';
import { prisma } from '../../lib/prisma';

export async function getSession() {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });
    return session;
  } catch (e) {
    console.error('getSession error:', e);
    return null;
  }
}

export async function getUsuarioActual() {
  const session = await getSession();
  if (!session?.user?.email) return null;

  return prisma.usuario.findUnique({
    where: { email: session.user.email },
  });
}