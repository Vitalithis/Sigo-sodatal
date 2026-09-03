'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@lib/prisma';
import { headers } from 'next/headers';

export type LoginState = { success: boolean; error: string };

export async function login(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email') as string;
  const clave = formData.get('clave') as string;

  if (!email || !clave) {
    return { success: false, error: 'Debes ingresar correo y contraseña.' };
  }

  try {
    await auth.api.signInEmail({
      body: { email, password: clave },
      headers: await headers(),
    });
  } catch (error: any) {
    console.error('Error en login:', error.message);
    return { success: false, error: 'Correo o contraseña incorrectos.' };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { rol: true },
  });

  const rol = usuario?.rol;

  if (!rol) redirect('/pendiente');
  if (rol === 'REPARTIDOR') redirect('/repartidor');
  redirect('/admin');
}

export async function signup(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email') as string;
  const rut = formData.get('rut') as string;
  const clave = formData.get('clave') as string;
  const nombre = formData.get('nombre') as string;

  if (!email || !rut || !clave) {
    return { success: false, error: 'Debes ingresar correo, RUT y contraseña.' };
  }
  if (clave.length < 6) {
    return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  const rutLimpio = rut.replace(/[^0-9kK]/g, '').toLowerCase();

  try {
    await auth.api.signUpEmail({
      body: {
        email,
        password: clave,
        name: nombre || email,
        rut: rutLimpio,
      } as any,
      headers: await headers(),
    });
  } catch (error: any) {
    console.error('Error en signup:', error.message);
    if (error.message?.includes('already exists')) {
      return { success: false, error: 'Ya existe una cuenta con ese correo.' };
    }
    return { success: false, error: 'No se pudo crear la cuenta. Verifica los datos.' };
  }

  redirect('/pendiente');
}

export async function logout() {
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect('/login');
}
