'use server';

import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export type LoginState = { success: boolean; error: string };

function getSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

export async function login(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const rut = formData.get('rut') as string;
  const clave = formData.get('clave') as string;

  if (!rut || !clave) {
    return { success: false, error: 'Debes ingresar RUT y contraseña.' };
  }

  let rutaDestino = '';

  try {
    const supabase = getSupabase();
    const rutLimpio = rut.replace(/[^0-9kK]/g, '').toLowerCase();
    const emailFormateado = `${rutLimpio}@sodatal.cl`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailFormateado,
      password: clave,
    });

    if (error) throw new Error(error.message);

    const rol = data.user?.user_metadata?.rol;

    if (!rol || rol === 'PENDIENTE') {
      rutaDestino = '/pendiente';
    } else if (rol === 'REPARTIDOR') {
      rutaDestino = '/repartidor';
    } else {
      rutaDestino = '/admin';
    }
  } catch (error: any) {
    console.error('Error en login:', error.message);
    return { success: false, error: 'RUT o contraseña incorrectos.' };
  }

  redirect(rutaDestino);
}

export async function signup(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const rut = formData.get('rut') as string;
  const clave = formData.get('clave') as string;
  const nombre = formData.get('nombre') as string;

  if (!rut || !clave) {
    return { success: false, error: 'Debes ingresar RUT y contraseña.' };
  }
  if (clave.length < 6) {
    return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  try {
    const supabase = getSupabase();
    const rutLimpio = rut.replace(/[^0-9kK]/g, '').toLowerCase();
    const emailFormateado = `${rutLimpio}@sodatal.cl`;

    const { error } = await supabase.auth.signUp({
      email: emailFormateado,
      password: clave,
      options: {
        data: {
          rol: 'PENDIENTE',
          rut: rutLimpio,
          nombre: nombre || null,
        },
      },
    });

    if (error) throw new Error(error.message);
  } catch (error: any) {
    console.error('Error en signup:', error.message);
    return { success: false, error: 'No se pudo crear la cuenta. Verifica los datos.' };
  }

  redirect('/pendiente');
}

export async function logout() {
  const supabase = getSupabase();
  await supabase.auth.signOut();
  redirect('/login');
}