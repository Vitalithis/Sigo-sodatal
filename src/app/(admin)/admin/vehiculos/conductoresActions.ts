'use server';

import { prisma } from '@/lib/prisma'; // Ajusta la ruta a tu cliente Prisma
import { revalidatePath } from 'next/cache';

export interface usuarioInput {
  rut: string;
  nombre: string; // Se usará para el nombre completo (ya que 'apellido' no existe en el esquema)
  email: string;  // Agregado porque es obligatorio (@unique) en tu schema.prisma
  telefono?: string;
  licencia_tipo?: string;
  vencimiento_lic?: string; // Recibido como string YYYY-MM-DD del input HTML
  activo: boolean; // Cambiado de 'estado' (string) a 'activo' (boolean) según tu esquema
}

export async function obtenerusuarioesAction() {
  try {
    const usuarioes = await prisma.usuario.findMany({
      where: {
        rol: 'REPARTIDOR' // Filtramos opcionalmente para traer solo repartidores/conductores
      },
      orderBy: { nombre: 'asc' }, // 👈 Corregido: Ordenamos por 'nombre' ya que 'apellido' no existe
    });
    return { success: true, data: usuarioes };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function crearusuarioAction(input: usuarioInput) {
  try {
    const rutNormalizado = input.rut.trim().toUpperCase();

    // Validar RUT único básico
    const existe = await prisma.usuario.findUnique({ where: { rut: rutNormalizado } });
    if (existe) {
      return { success: false, message: 'Ya existe un usuario registrado con este RUT.' };
    }

    await prisma.usuario.create({
      data: {
        rut: rutNormalizado,
        nombre: input.nombre.trim(),
        email: input.email.trim().toLowerCase(), // Obligatorio en el esquema
        telefono: input.telefono?.trim() || '',  // No permite null directo si es String obligatorio, se deja vacío
        rol: 'REPARTIDOR',                       // Enum obligatorio en tu esquema (ADMIN, OFICINA, REPARTIDOR)
        fecha_ingreso: new Date(),               // DateTime obligatorio en tu esquema
        licencia_tipo: input.licencia_tipo || null,
        vencimiento_lic: input.vencimiento_lic ? new Date(input.vencimiento_lic + 'T00:00:00Z') : null,
        activo: input.activo ?? true,            // Booleano según tu esquema
      },
    });

    revalidatePath('/vehiculos');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function editarusuarioAction(id: string, input: Partial<usuarioInput>) {
  try {
    await prisma.usuario.update({
      where: { id },
      data: {
        ...(input.nombre && { nombre: input.nombre.trim() }),
        ...(input.email && { email: input.email.trim().toLowerCase() }),
        ...(input.telefono !== undefined && { telefono: input.telefono.trim() }),
        ...(input.licencia_tipo !== undefined && { licencia_tipo: input.licencia_tipo }),
        ...(input.vencimiento_lic && { vencimiento_lic: new Date(input.vencimiento_lic + 'T00:00:00Z') }),
        ...(input.activo !== undefined && { activo: input.activo }),
      },
    });

    revalidatePath('/vehiculos');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}