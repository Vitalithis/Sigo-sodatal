import * as React from 'react';
import { auth } from './auth';
import { headers } from 'next/headers';
import { prisma } from '../../lib/prisma';

const cacheFn = typeof (React as any).cache === 'function' ? (React as any).cache : ((fn: any) => fn);

export const getSession = cacheFn(async () => {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });
    return session;
  } catch (e) {
    return null;
  }
});

export const getUsuarioActual = cacheFn(async () => {
  const session = await getSession();
  if (session?.user?.email) {
    return prisma.usuario.findUnique({
      where: { email: session.user.email },
    });
  }

  if (process.env.ADMIN_TEST_USER_EMAIL) {
    return prisma.usuario.findUnique({
      where: { email: process.env.ADMIN_TEST_USER_EMAIL },
    });
  }

  return null;
});