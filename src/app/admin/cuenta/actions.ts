'use server';

import { prisma } from '../../../../lib/prisma';
import { auth } from '@/lib/auth';
import { getUsuarioActual } from '@/lib/auth-session';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export interface DatosMiPerfil {
  id: string;
  nombre: string;
  apellido: string;
  rut: string;
  email: string;
  telefono: string;
  rol: string;
  fecha_ingreso: string | null;
  activo: boolean;
}

// 1. Obtener la información del perfil del usuario en sesión
export async function obtenerMiPerfilAction(): Promise<{
  success: boolean;
  usuario?: DatosMiPerfil;
  message?: string;
}> {
  try {
    const usuario = await getUsuarioActual();
    if (!usuario) {
      return { success: false, message: 'No hay una sesión activa.' };
    }

    return {
      success: true,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre || '',
        apellido: (usuario as any).apellido || '',
        rut: usuario.rut || '',
        email: usuario.email || '',
        telefono: usuario.telefono || '',
        rol: usuario.rol || 'OFICINA',
        fecha_ingreso: usuario.fecha_ingreso ? usuario.fecha_ingreso.toISOString() : null,
        activo: usuario.activo,
      },
    };
  } catch (error: any) {
    console.error('Error al obtener perfil:', error);
    return { success: false, message: error.message || 'Error al obtener datos del perfil.' };
  }
}

// 2. Actualizar datos personales básicos (nombre, apellido, teléfono)
export async function actualizarMiPerfilAction(data: {
  nombre: string;
  apellido?: string;
  telefono?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const usuario = await getUsuarioActual();
    if (!usuario) {
      return { success: false, message: 'No hay una sesión activa.' };
    }

    const nombreLimpio = data.nombre?.trim();
    if (!nombreLimpio || nombreLimpio.length < 2) {
      return { success: false, message: 'El nombre debe tener al menos 2 caracteres.' };
    }

    const apellidoLimpio = data.apellido?.trim() || null;
    const telefonoLimpio = data.telefono?.trim() || '';

    // Actualizar registro en Usuario
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        nombre: nombreLimpio,
        apellido: apellidoLimpio,
        telefono: telefonoLimpio,
      },
    });

    // Actualizar nombre en tabla auth User si está vinculado
    if (usuario.user_id) {
      try {
        await prisma.user.update({
          where: { id: usuario.user_id },
          data: {
            name: `${nombreLimpio}${apellidoLimpio ? ' ' + apellidoLimpio : ''}`,
          },
        });
      } catch (authErr) {
        console.warn('No se pudo sincronizar nombre con better-auth user:', authErr);
      }
    }

    revalidatePath('/', 'layout');
    return { success: true, message: 'Tus datos han sido actualizados correctamente.' };
  } catch (error: any) {
    console.error('Error al actualizar perfil:', error);
    return { success: false, message: error.message || 'No se pudo actualizar el perfil.' };
  }
}

// 3. Cambiar contraseña de la cuenta personal
export async function cambiarMiClaveAction(data: {
  claveActual: string;
  claveNueva: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const usuario = await getUsuarioActual();
    if (!usuario) {
      return { success: false, message: 'No hay una sesión activa.' };
    }

    const { claveActual, claveNueva } = data;

    if (!claveActual || !claveNueva) {
      return { success: false, message: 'Debes ingresar tu contraseña actual y la nueva.' };
    }

    if (claveNueva.length < 6) {
      return { success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' };
    }

    if (claveActual === claveNueva) {
      return { success: false, message: 'La nueva contraseña no puede ser igual a la actual.' };
    }

    try {
      await auth.api.changePassword({
        body: {
          currentPassword: claveActual,
          newPassword: claveNueva,
          revokeOtherSessions: false,
        },
        headers: await headers(),
      });
      return { success: true, message: 'Contraseña actualizada correctamente.' };
    } catch (authError: any) {
      console.error('Error better-auth al cambiar password:', authError);
      const msg = authError?.message || '';
      if (msg.toLowerCase().includes('current') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('incorrect')) {
        return { success: false, message: 'La contraseña actual ingresada es incorrecta.' };
      }
      return { success: false, message: 'No se pudo cambiar la contraseña. Verifica tu contraseña actual.' };
    }
  } catch (error: any) {
    console.error('Error en cambiarMiClaveAction:', error);
    return { success: false, message: error.message || 'Error al procesar el cambio de contraseña.' };
  }
}
