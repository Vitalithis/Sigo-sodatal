'use server';

import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function login(rut: string, clave: string) {
  let rutaDestino = '';

  try {
    const cookieStore = cookies();
    
    // Instanciar el cliente de Supabase para Server Actions
    const supabase = createServerClient(
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

    // Solución viable: Limpieza de caracteres y formateo a email
    // Elimina puntos, guiones y espacios, conservando solo números y la letra K
    const rutLimpio = rut.replace(/[^0-9kK]/g, '').toLowerCase();
    const emailFormateado = `${rutLimpio}@sodatal.cl`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailFormateado,
      password: clave,
    });

    if (error) {
      throw new Error(error.message);
    }

    // Determinar la ruta según el rol en los metadatos
    const rol = data.user?.user_metadata?.rol;

    if (rol === 'REPARTIDOR') {
      rutaDestino = '/repartidor';
    } else {
      rutaDestino = '/admin';
    }
    
  } catch (error: any) {
    console.error("Error en login:", error.message);
    return { success: false, error: 'Credenciales inválidas o error de red.' };
  }

  // Ejecutar la redirección estrictamente FUERA del try/catch
  if (rutaDestino) {
    redirect(rutaDestino);
  }
}