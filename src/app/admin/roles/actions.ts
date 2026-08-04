'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/src/lib/supabase/admin';

const ROLES_VALIDOS = ['ADMIN', 'OFICINA', 'REPARTIDOR', 'PENDIENTE'];

async function getRolActual() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n: string) => cookieStore.get(n)?.value,
        set() {},
        remove() {},
      },
    }
  );
  const { data } = await supabase.auth.getUser();
  return data.user?.user_metadata?.rol as string | undefined;
}

export async function listUsuarios() {
  if ((await getRolActual()) !== 'ADMIN') {
    throw new Error('No autorizado.');
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw new Error(error.message);

  return data.users.map((u) => ({
    id: u.id,
    email: u.email,
    rol: u.user_metadata?.rol ?? 'PENDIENTE',
    nombre: u.user_metadata?.nombre ?? null,
    creadoEn: u.created_at,
  }));
}

export async function actualizarRol(userId: string, nuevoRol: string) {
  if ((await getRolActual()) !== 'ADMIN') {
    return { success: false, error: 'No autorizado.' };
  }
  if (!ROLES_VALIDOS.includes(nuevoRol)) {
    return { success: false, error: 'Rol inválido.' };
  }

  const admin = createAdminClient();
  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const metadataActual = userData?.user?.user_metadata ?? {};

  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { ...metadataActual, rol: nuevoRol },
  });

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/roles');
  return { success: true, error: '' };
}