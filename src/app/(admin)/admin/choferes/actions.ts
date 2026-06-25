'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Obtener vehículos
export async function obtenerVehiculosAction() {
  try {
    const vehiculos = await prisma.vehiculo.findMany({
      orderBy: { patente: 'asc' }
    });
    return { success: true, vehiculos };
  } catch (error: any) {
    return { success: false, message: error.message, vehiculos: [] };
  }
}

// Obtener choferes (Usuarios con rol REPARTIDOR)
export async function obtenerChoferesAction() {
  try {
    const choferes = await prisma.usuario.findMany({
      where: { rol: 'REPARTIDOR' },
      include: { vehiculo: true },
      orderBy: { nombre: 'asc' }
    });
    return { success: true, choferes };
  } catch (error: any) {
    return { success: false, message: error.message, choferes: [] };
  }
}

// Crear Chofer
export async function crearChoferAction(datos: {
  nombre: string;
  apellido: string;
  rut: string;
  telefono: string;
  email: string;
  vehiculo_id?: string;
  licencia_tipo?: string;
}) {
  try {
    await prisma.usuario.create({
      data: {
        nombre: datos.nombre,
        apellido: datos.apellido,
        rut: datos.rut,
        telefono: datos.telefono,
        email: datos.email,
        rol: 'REPARTIDOR',
        vehiculo_id: datos.vehiculo_id || null,
        licencia_tipo: datos.licencia_tipo || 'Clase B',
        fecha_ingreso: new Date(),
        activo: true
      }
    });

    revalidatePath('/admin/choferes');
    return { success: true };
  } catch (error: any) {
    console.error("Error al crear chofer:", error);
    return { success: false, message: error.message };
  }
}

// Crear Vehículo
export async function crearVehiculoAction(datos: {
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  kilometraje_actual: number;
}) {
  try {
    await prisma.vehiculo.create({
      data: {
        patente: datos.patente.toUpperCase().trim(),
        marca: datos.marca,
        modelo: datos.modelo,
        anio: Number(datos.anio),
        kilometraje_actual: Number(datos.kilometraje_actual),
        estado: 'ACTIVO'
      }
    });

    revalidatePath('/admin/choferes');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}