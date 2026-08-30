'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { DiaSemana } from '@/lib/prisma/generated';

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
 * Crea una nueva cabecera de plantilla (Ruta Base)
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
 * Busca clientes para el buscador, excluyendo los ya asignados a la ruta
 */
export async function buscarClientesBaseAction(criterio: string, rutaBaseId?: string) {
  try {
    if (!criterio.trim()) return { success: true, clientes: [] };

    const yaAsignados = rutaBaseId
      ? await prisma.clienteRutaBase.findMany({
          where: { ruta_base_id: rutaBaseId },
          select: { cliente_id: true }
        })
      : [];

    const idsExcluidos = yaAsignados.map(r => r.cliente_id);

    const clientes = await prisma.cliente.findMany({
      where: {
        AND: [
          {
            OR: [
              { nombre: { contains: criterio, mode: 'insensitive' } },
              { direccion: { contains: criterio, mode: 'insensitive' } }
            ]
          },
          idsExcluidos.length > 0 ? { id: { notIn: idsExcluidos } } : {}
        ]
      },
      take: 8,
      select: {
        id: true,
        nombre: true,
        direccion: true,
        sector: true,
        tipo: true,
      }
    });

    return { success: true, clientes };
  } catch (error: any) {
    console.error('Error al buscar clientes para ruta base:', error);
    return { success: false, clientes: [], message: error.message };
  }
}

/**
 * Agrega un cliente a la ruta base
 */
export async function agregarClienteARutaBaseAction(rutaBaseId: string, clienteId: string) {
  try {
    const conteo = await prisma.clienteRutaBase.count({
      where: { ruta_base_id: rutaBaseId }
    });

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

/**
 * Elimina un cliente de la ruta base y reordena los restantes
 */
export async function eliminarClienteDeRutaBaseAction(clienteRutaBaseId: string, rutaBaseId: string) {
  try {
    // Obtiene el orden del que se va a eliminar
    const registro = await prisma.clienteRutaBase.findUnique({
      where: { id: clienteRutaBaseId }
    });

    if (!registro) return { success: false, message: 'Registro no encontrado' };

    // Elimina el registro
    await prisma.clienteRutaBase.delete({
      where: { id: clienteRutaBaseId }
    });

    // Reordena los que quedaron después del eliminado
    const restantes = await prisma.clienteRutaBase.findMany({
      where: {
        ruta_base_id: rutaBaseId,
        orden: { gt: registro.orden }
      },
      orderBy: { orden: 'asc' }
    });

    for (const r of restantes) {
      await prisma.clienteRutaBase.update({
        where: { id: r.id },
        data: { orden: r.orden - 1 }
      });
    }

    revalidatePath('/admin/rutas-base');
    return { success: true };
  } catch (error: any) {
    console.error('Error al eliminar cliente de ruta base:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Mueve un cliente hacia arriba o abajo en el orden de la ruta
 */
export async function reordenarClienteRutaBaseAction(
  clienteRutaBaseId: string,
  rutaBaseId: string,
  direccion: 'subir' | 'bajar'
) {
  try {
    const actual = await prisma.clienteRutaBase.findUnique({
      where: { id: clienteRutaBaseId }
    });

    if (!actual) return { success: false, message: 'Registro no encontrado' };

    const ordenObjetivo = direccion === 'subir' ? actual.orden - 1 : actual.orden + 1;

    // Busca el vecino con el que hay que intercambiar
    const vecino = await prisma.clienteRutaBase.findFirst({
      where: {
        ruta_base_id: rutaBaseId,
        orden: ordenObjetivo
      }
    });

    if (!vecino) return { success: false, message: 'No se puede mover en esa dirección' };

    // Intercambia los órdenes
    await prisma.$transaction([
      prisma.clienteRutaBase.update({
        where: { id: actual.id },
        data: { orden: ordenObjetivo }
      }),
      prisma.clienteRutaBase.update({
        where: { id: vecino.id },
        data: { orden: actual.orden }
      })
    ]);

    revalidatePath('/admin/rutas-base');
    return { success: true };
  } catch (error: any) {
    console.error('Error al reordenar cliente:', error);
    return { success: false, message: error.message };
  }
}