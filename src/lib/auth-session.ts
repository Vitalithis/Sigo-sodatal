import { cache } from 'react';
import { auth } from './auth';
import { headers } from 'next/headers';
import { prisma } from '../../lib/prisma';

export const getSession = cache(async () => {
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
});

export const getUsuarioActual = cache(async () => {
  const session = await getSession();
  if (!session?.user?.email) return null;

  return prisma.usuario.findUnique({
    where: { email: session.user.email },
  });
});