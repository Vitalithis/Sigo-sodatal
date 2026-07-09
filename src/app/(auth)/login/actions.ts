'use server';

import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function loginAction(rut: string, clave: string) {
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

    // 1. Ejecutar validación contra Supabase
    // Aquí asumo que usas el RUT como email en supabase (ej. 12345678-9@sodatal.cl) 
    // o que tienes una lógica adaptada. Ajusta el campo email según tu BD.
    const { data, error } = await supabase.auth.signInWithPassword({
      email: rut, // o el identificador que uses
      password: clave,
    });

    if (error) {
      throw new Error(error.message);
    }

    // 2. Determinar la ruta según el rol en los metadatos
    const rol = data.user?.user_metadata?.rol;

    if (rol === 'REPARTIDOR') {
      rutaDestino = '/repartidor';
    } else {
      // Para ADMIN y OFICINA
      rutaDestino = '/admin';
    }
    
  } catch (error: any) {
    // Solo manejamos errores reales de autenticación aquí, retornando al cliente
    console.error("Error en login:", error.message);
    return { success: false, error: 'Credenciales inválidas o error de red.' };
  }

  // 3. Ejecutar la redirección estrictamente FUERA del try/catch
  if (rutaDestino) {
    redirect(rutaDestino);
  }
}