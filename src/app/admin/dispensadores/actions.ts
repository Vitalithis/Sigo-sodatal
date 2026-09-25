'use server';

import { prisma } from '../../../../lib/prisma';
import { EstadoDispensador } from '../../../../lib/prisma/generated';
import { revalidatePath } from 'next/cache';

export interface DispensadorInput {
  marca: string;
  modelo: string;
  numero_serie?: string | null;
  precio_arriendo: number;
  estado: EstadoDispensador;
  cliente_id?: string | null;
  foto_url?: string | null;
}

// 1. Obtener todos los dispensadores
export async function obtenerDispensadoresAction() {
  try {
    const dispensadores = await prisma.dispensador.findMany({
      orderBy: { marca: 'asc' },
      include: {
        cliente: { select: { id: true, nombre: true, direccion: true } },
        mantenciones: { orderBy: { fecha_ingreso: 'desc' }, take: 1 }
      }
    });

    const clientes = await prisma.cliente.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, direccion: true },
      orderBy: { nombre: 'asc' }
    });

    return { success: true, dispensadores, clientes };
  } catch (error: any) {
    console.error('Error al obtener dispensadores:', error);
    return { success: false, dispensadores: [], clientes: [], message: error.message };
  }
}

// 2. Crear Dispensador Independiente
export async function crearDispensadorIndependienteAction(data: DispensadorInput) {
  try {
    const serieLimpia = data.numero_serie?.trim() || null;
    if (serieLimpia && serieLimpia !== 'S/N') {
      const existe = await prisma.dispensador.findUnique({ where: { numero_serie: serieLimpia } });
      if (existe) return { success: false, message: `El número de serie "${serieLimpia}" ya existe.` };
    }

    let estadoFinal = data.estado || EstadoDispensador.DISPONIBLE;
    let clienteIdFinal = data.cliente_id || null;

    // Si tiene un cliente asignado y su estado era DISPONIBLE, pasa a EN_CLIENTE
    if (clienteIdFinal && estadoFinal === EstadoDispensador.DISPONIBLE) {
      estadoFinal = EstadoDispensador.EN_CLIENTE;
    }

    // Si el estado final es libre o inactivo, desasociar cliente
    if (estadoFinal === EstadoDispensador.DISPONIBLE || estadoFinal === EstadoDispensador.RETIRADO || estadoFinal === EstadoDispensador.BAJA) {
      clienteIdFinal = null;
    }

    const dispensador = await prisma.dispensador.create({
      data: {
        marca: data.marca,
        modelo: data.modelo || 'Estándar',
        numero_serie: serieLimpia,
        precio_arriendo: Number(data.precio_arriendo) || 0,
        estado: estadoFinal,
        cliente_id: clienteIdFinal,
        foto_url: data.foto_url || null,
      },
      include: {
        cliente: { select: { id: true, nombre: true, direccion: true } }
      }
    });

    revalidatePath('/admin/dispensadores');
    revalidatePath('/admin/clientes');
    return { success: true, data: dispensador };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al registrar dispensador.' };
  }
}

// 3. Editar Dispensador
export async function editarDispensadorIndependienteAction(id: string, data: DispensadorInput) {
  try {
    const serieLimpia = data.numero_serie?.trim() || null;
    let estadoFinal = data.estado;
    let clienteIdFinal = data.cliente_id || null;

    // Si se asignó un cliente y el estado estaba en DISPONIBLE, pasa a EN_CLIENTE
    if (clienteIdFinal && estadoFinal === EstadoDispensador.DISPONIBLE) {
      estadoFinal = EstadoDispensador.EN_CLIENTE;
    }

    // Solo se elimina el cliente si el estado cambia explícitamente a DISPONIBLE, RETIRADO o BAJA.
    // Si está en EN_TALLER, REEMPLAZADO_TEMPORALMENTE o EN_CLIENTE, conserva el cliente.
    if (estadoFinal === EstadoDispensador.DISPONIBLE || estadoFinal === EstadoDispensador.RETIRADO || estadoFinal === EstadoDispensador.BAJA) {
      clienteIdFinal = null;
    }

    const dispensadorActualizado = await prisma.dispensador.update({
      where: { id },
      data: {
        marca: data.marca,
        modelo: data.modelo,
        numero_serie: serieLimpia,
        precio_arriendo: Number(data.precio_arriendo) || 0,
        estado: estadoFinal,
        cliente_id: clienteIdFinal,
        foto_url: data.foto_url || null,
      },
      include: {
        cliente: { select: { id: true, nombre: true, direccion: true } }
      }
    });

    revalidatePath('/admin/dispensadores');
    revalidatePath('/admin/clientes');
    return { success: true, data: dispensadorActualizado };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al actualizar dispensador.' };
  }
}

// 4. Asignar Dispensador a Cliente
export async function asignarDispensadorAClienteAction(dispensadorId: string, clienteId: string, precioArriendo: number) {
  try {
    const dispensadorActualizado = await prisma.dispensador.update({
      where: { id: dispensadorId },
      data: {
        cliente_id: clienteId,
        estado: EstadoDispensador.EN_CLIENTE,
        precio_arriendo: Number(precioArriendo) || 0,
      },
      include: {
        cliente: { select: { id: true, nombre: true, direccion: true } }
      }
    });

    revalidatePath('/admin/dispensadores');
    revalidatePath('/admin/clientes');
    return { success: true, data: dispensadorActualizado };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al asignar dispensador al cliente.' };
  }
}

// 5. Retirar Dispensador de Cliente
export async function retirarDispensadorDeClienteAction(dispensadorId: string, nuevoEstado: EstadoDispensador = EstadoDispensador.DISPONIBLE) {
  try {
    const dispensadorActualizado = await prisma.dispensador.update({
      where: { id: dispensadorId },
      data: {
        cliente_id: null,
        estado: nuevoEstado,
      },
      include: {
        cliente: { select: { id: true, nombre: true, direccion: true } }
      }
    });

    revalidatePath('/admin/dispensadores');
    revalidatePath('/admin/clientes');
    return { success: true, data: dispensadorActualizado };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al retirar el dispensador.' };
  }
}

// 6. Dar de baja Dispensador
export async function darDeBajaDispensadorAction(dispensadorId: string) {
  try {
    const dispensadorActualizado = await prisma.dispensador.update({
      where: { id: dispensadorId },
      data: {
        cliente_id: null,
        estado: EstadoDispensador.BAJA,
      },
      include: {
        cliente: { select: { id: true, nombre: true, direccion: true } }
      }
    });

    revalidatePath('/admin/dispensadores');
    revalidatePath('/admin/clientes');
    return { success: true, data: dispensadorActualizado };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al dar de baja el dispensador.' };
  }
}

// 7. Eliminar Dispensador Físicamente
export async function eliminarDispensadorIndependienteAction(id: string) {
  try {
    await prisma.mantencionDispensador.deleteMany({ where: { dispensador_id: id } });
    await prisma.dispensador.delete({ where: { id } });

    revalidatePath('/admin/dispensadores');
    revalidatePath('/admin/clientes');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'No se puede eliminar un dispensador con registros activos.' };
  }
}

// 8. Enviar Dispensador a Taller (con opción de asignar equipo de reemplazo temporal)
export async function enviarATallerConReemplazoAction(
  dispensadorId: string, 
  reemplazoDispensadorId?: string | null
) {
  try {
    const original = await prisma.dispensador.findUnique({ where: { id: dispensadorId } });
    if (!original) return { success: false, message: 'Dispensador no encontrado.' };

    // Pasar el dispensador original a EN_TALLER
    const dispensadorActualizado = await prisma.dispensador.update({
      where: { id: dispensadorId },
      data: {
        estado: EstadoDispensador.EN_TALLER,
      },
      include: {
        cliente: { select: { id: true, nombre: true, direccion: true } }
      }
    });

    // Si se especificó una máquina de reemplazo y el original tiene cliente
    let reemplazoActualizado = null;
    if (reemplazoDispensadorId && original.cliente_id) {
      reemplazoActualizado = await prisma.dispensador.update({
        where: { id: reemplazoDispensadorId },
        data: {
          cliente_id: original.cliente_id,
          estado: EstadoDispensador.REEMPLAZADO_TEMPORALMENTE,
        },
        include: {
          cliente: { select: { id: true, nombre: true, direccion: true } }
        }
      });
    }

    revalidatePath('/admin/dispensadores');
    revalidatePath('/admin/clientes');
    return { 
      success: true, 
      data: dispensadorActualizado, 
      reemplazo: reemplazoActualizado 
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al enviar dispensador a taller.' };
  }
}

// 9. Finalizar Taller (Devolver dispensador reparado y liberar equipo de reemplazo si existía)
export async function finalizarTallerAction(
  dispensadorId: string, 
  reemplazoDispensadorId?: string | null
) {
  try {
    const original = await prisma.dispensador.findUnique({ where: { id: dispensadorId } });
    if (!original) return { success: false, message: 'Dispensador no encontrado.' };

    const nuevoEstado = original.cliente_id ? EstadoDispensador.EN_CLIENTE : EstadoDispensador.DISPONIBLE;

    const dispensadorActualizado = await prisma.dispensador.update({
      where: { id: dispensadorId },
      data: {
        estado: nuevoEstado,
      },
      include: {
        cliente: { select: { id: true, nombre: true, direccion: true } }
      }
    });

    // Si había un reemplazo, devolverlo a Bodega (DISPONIBLE) y desasociarlo del cliente
    let reemplazoActualizado = null;
    if (reemplazoDispensadorId) {
      reemplazoActualizado = await prisma.dispensador.update({
        where: { id: reemplazoDispensadorId },
        data: {
          cliente_id: null,
          estado: EstadoDispensador.DISPONIBLE,
        },
        include: {
          cliente: { select: { id: true, nombre: true, direccion: true } }
        }
      });
    }

    revalidatePath('/admin/dispensadores');
    revalidatePath('/admin/clientes');
    return { 
      success: true, 
      data: dispensadorActualizado, 
      reemplazo: reemplazoActualizado 
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al finalizar taller.' };
  }
}
