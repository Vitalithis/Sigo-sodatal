'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { DiaSemana } from '@prisma/client'; 

/**
 * Obtiene todas las rutas base configuradas en el sistema con sus choferes, 
 * camiones habituales y la lista de paradas fijas ordenadas.
 */
export async function obtenerRutasBaseAction() {
  try {
    const rutasBase = await prisma.rutaBase.findMany({
      include: {
        usuario: true,
        vehiculo: true,
        clientes: {
          orderBy: { orden: 'asc' },
          include: { cliente: true }
        }
      },
      orderBy: { dia_semana: 'asc' }
    });
    return { success: true, rutasBase };
  } catch (error: any) {
    console.error('Error al obtener rutas base:', error);
    return { success: false, message: error.message, rutasBase: [] };
  }
}

/**
 * Crea una nueva cabecera de plantilla (Ruta Base) enlazando el día de la semana estricto
 */
export async function crearRutaBaseAction(datos: {
  nombre: string;
  dia_semana: DiaSemana;
  usuario_id: string;
  vehiculo_id: string;
}) {
  try {
    await prisma.rutaBase.create({
      data: {
        nombre: datos.nombre,
        dia_semana: datos.dia_semana,
        usuario_id: datos.usuario_id,
        vehiculo_id: datos.vehiculo_id
      }
    });

    revalidatePath('/admin/rutas-base');
    return { success: true };
  } catch (error: any) {
    console.error('Error al crear ruta base:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Busca clientes rápidamente para proponerlos en el buscador de clientes fijos
 */
export async function buscarClientesBaseAction(criterio: string) {
  try {
    if (!criterio.trim()) return { success: true, clientes: [] };
    
    const clientes = await prisma.cliente.findMany({
      where: {
        OR: [
          { nombre: { contains: criterio, mode: 'insensitive' } },
          { direccion: { contains: criterio, mode: 'insensitive' } }
        ]
      },
      take: 5
    });
    return { success: true, clientes };
  } catch (error: any) {
    console.error('Error al buscar clientes para ruta base:', error);
    return { success: false, clientes: [] };
  }
}

/**
 * Agrega un cliente permanente al esqueleto de la ruta usando el modelo exacto ClienteRutaBase
 */
export async function agregarClienteARutaBaseAction(rutaBaseId: string, clienteId: string) {
  try {
    // Cuenta cuántos clientes ya tiene la plantilla usando el modelo correcto ClienteRutaBase
    const conteo = await prisma.clienteRutaBase.count({
      where: { ruta_base_id: rutaBaseId }
    });

    // Inserta la paridad en la tabla intermedia
    await prisma.clienteRutaBase.create({
      data: {
        ruta_base_id: rutaBaseId,
        cliente_id: clienteId,
        orden: conteo + 1
      }
    });

    revalidatePath('/admin/rutas-base');
    return { success: true };
  } catch (error: any) {
    console.error('Error al agregar cliente a ruta base:', error);
    return { success: false, message: error.message };
  }
}