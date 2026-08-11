'use server';

import { prisma } from '@/lib/prisma';
import { TipoCliente, PreferenciaFacturacion } from '@/lib/prisma/generated';
import { revalidatePath } from 'next/cache';

export interface ClienteInput {
  nombre: string;
  tipo: TipoCliente;
  direccion: string;
  telefono: string;
  email?: string;
  rut_empresa?: string;
  giro?: string;
  preferencia_factura: PreferenciaFacturacion;
  notas?: string;
  activo: boolean;
  botellones_prestados: number;
}

// 1. Crear Cliente
export async function crearClienteAction(data: ClienteInput) {
  try {
    await prisma.cliente.create({ data });
    revalidatePath('/admin/clientes');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al crear cliente.' };
  }
}

// 2. Editar Cliente
export async function editarClienteAction(id: string, data: ClienteInput) {
  try {
    await prisma.cliente.update({
      where: { id },
      data,
    });
    revalidatePath('/admin/clientes');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al actualizar cliente.' };
  }
}

// 3. Desactivar / Dar de baja Cliente
export async function desactivarClienteAction(id: string) {
  try {
    await prisma.cliente.update({
      where: { id },
      data: { activo: false },
    });
    revalidatePath('/admin/clientes');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: 'No se pudo desactivar el cliente.' };
  }
}

// 4. Eliminar Cliente Físicamente
export async function eliminarClienteAction(id: string) {
  try {
    await prisma.cliente.delete({ where: { id } });
    revalidatePath('/admin/clientes');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: 'No se puede eliminar un cliente con historial activo.' };
  }
}

// 5. Asignar Dispensador (CORREGIDO Y MAPEADO EL PRECIO DE ARRIENDO)
export async function asignarDispensadorAction(clienteId: string, payload: any) {
  try {
    const numeroSerieLimpio = payload.numeroSerie || payload.numero_serie || null;

    if (numeroSerieLimpio) {
      // Validamos si la serie ya existe en la BD para evitar el error único de Prisma
      const existeSerie = await prisma.dispensador.findUnique({
        where: { numero_serie: numeroSerieLimpio }
      });

      if (existeSerie) {
        return {
          success: false,
          message: `El número de serie "${numeroSerieLimpio}" ya está registrado en el sistema. Verifica la placa.`
        };
      }
    }

    // CORRECCIÓN: Rescatamos el precio de arriendo y nos aseguramos de que sea un entero puro
    const precioFinal = parseInt(payload.precioArriendo || payload.precio_arriendo) || 0;

    await prisma.dispensador.create({
      data: {
        marca: payload.marca || payload.tipo,
        modelo: payload.modelo || "Estándar",        
        numero_serie: numeroSerieLimpio,
        foto_url: payload.fotoUrl || payload.foto_url || null,
        cliente_id: clienteId,      
        precio_arriendo: precioFinal, 
        estado: payload.estado || "EN_CLIENTE"
      }
    });

    revalidatePath('/admin/clientes');
    return { success: true };
  } catch (error: any) {
    console.error("Error al asignar dispensador:", error);
    return { success: false, message: 'Error interno al guardar el dispensador.' };
  }
}

// 6. Registrar Mantención (CORREGIDO EXACTO A TU MANTENCIONDISPENSADOR)
export async function registrarMantencionAction(clienteId: string, payload: any) {
  try {
    // 1. Buscamos primero un dispensador activo de este cliente para asociar la mantención
    const dispensador = await prisma.dispensador.findFirst({
      where: { cliente_id: clienteId }
    });

    if (!dispensador) {
      return {
        success: false,
        message: "No se encontró ningún dispensador asociado a este cliente para enviarlo a taller."
      };
    }

    // 2. Insertamos la orden técnica en el modelo real
    await prisma.mantencionDispensador.create({
      data: {
        dispensador_id: dispensador.id,
        problema_reportated: payload.motivoFalla || "Revisión técnica general", // Machea tu campo real
        foto_ingreso_url: payload.fotoUrl || "https://placeholder.com/no-image.png", // Obligatorio en tu schema
        diagnostico: "Pendiente de revisión en taller",
        costo_total: 0,
        mano_de_obra: 0,
        costo_repuestos: 0
      }
    });
    
    revalidatePath('/admin/clientes');
    return { success: true };
  } catch (error: any) {
    console.error("Error en taller:", error);
    return { success: false, message: 'Error al registrar la orden técnica en el taller.' };
  }
}

// 7. Registrar Movimiento Financiero (CORREGIDO EXACTO A TU HISTORIALFINANCIERO)
export async function registrarMovimientoFinancieroAction(clienteId: string, payload: any) {
  try {
    await prisma.historialFinanciero.create({
      data: {
        cliente_id: clienteId,
        tipo: payload.tipo,        // ENUMS: COMPRA_BOTELLON, ARRIENDO_DISPENSADOR, PAGO_RECIBIDO, AJUSTE_CREDITO
        descripcion: payload.descripcion || "Movimiento de caja",
        monto: parseFloat(payload.monto) || 0,
        sincronizado_facturacion: false
      }
    });
    
    revalidatePath('/admin/clientes');
    return { success: true };
  } catch (error: any) {
    console.error("Error en finanzas:", error);
    return { success: false, message: 'Error al procesar el registro de caja.' };
  }
}

// 8. Modificar un Dispensador Existente (ACTUALIZADO CON SOPORTE PARA CAMBIO DE FOTO)
export async function editarDispensadorAction(dispensadorId: string, payload: any) {
  try {
    await prisma.dispensador.update({
      where: { id: dispensadorId },
      data: {
        marca: payload.marca,
        modelo: payload.modelo || "Estándar",
        numero_serie: payload.numeroSerie || payload.numero_serie || null,
        estado: payload.estado, // EN_CLIENTE, EN_TALLER, REEMPLAZADO_TEMPORALMENTE
        precio_arriendo: parseInt(payload.precioArriendo || payload.precio_arriendo) || 0,
        foto_url: payload.fotoUrl || payload.foto_url || undefined // Guardamos la nueva foto si viene en el payload
      }
    });

    revalidatePath('/admin/clientes');
    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { success: false, message: 'Error al actualizar los datos del dispensador.' };
  }
}

// 9. Quitar/Eliminar Dispensador
export async function eliminarDispensadorAction(dispensadorId: string) {
  try {
    // Primero borramos sus mantenciones asociadas para evitar errores de llave foránea (Constraint)
    await prisma.mantencionDispensador.deleteMany({
      where: { dispensador_id: dispensadorId }
    });

    // Ahora sí eliminamos el dispensador de forma segura
    await prisma.dispensador.delete({
      where: { id: dispensadorId }
    });

    revalidatePath('/admin/clientes');
    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { success: false, message: 'No se pudo eliminar el dispensador.' };
  }
}

// ----------------------------------------------------------------
// BLOQUE 2.4 y 2.5: INCIDENCIAS E HISTORIAL
// ----------------------------------------------------------------

// 10. Obtener Historial Completo del Cliente (Mejorado para el plan 2.4)
export async function obtenerHistorialClienteAction(clienteId: string) {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      include: {
        incidencias: {
          orderBy: { created_at: 'desc' },
          include: {
            usuario: { select: { nombre: true, apellido: true } }
          }
        },
        pedidos: {
          orderBy: { fecha_solicitada: 'desc' },
          take: 10,
          include: {
            items: { include: { producto: true } }
          }
        },
        historial_financiero: {
          orderBy: { fecha: 'desc' },
          take: 10
        }
      }
    });

    if (!cliente) return { success: false, message: 'Cliente no encontrado.' };

    return { success: true, cliente };
  } catch (error: any) {
    console.error("Error al obtener historial:", error);
    return { success: false, message: error.message || 'Error interno al cargar el historial.' };
  }
}

// 11. Resolver Incidencia (Nuevo para el plan 2.5)
export async function resolverIncidenciaAction(
  incidenciaId: string, 
  payload?: { cantidad_faltante_entregada?: number; pedido_item_id?: string }
) {
  try {
    await prisma.$transaction(async (tx) => {
      const incidencia = await tx.incidencia.findUnique({
        where: { id: incidenciaId },
        include: { cliente: true }
      });

      if (!incidencia) throw new Error("Incidencia no encontrada.");
      if (incidencia.resuelta) throw new Error("Esta incidencia ya fue resuelta anteriormente.");

      // Marcar la incidencia como resuelta
      await tx.incidencia.update({
        where: { id: incidenciaId },
        data: { resuelta: true }
      });

      // Lógica de negocio 1: Si recuperamos un botellón prestado, rebajamos la deuda del cliente
      if (incidencia.tipo === "PRESTAMO_BOTELLON") {
        const nuevosPrestados = Math.max(0, incidencia.cliente.botellones_prestados - 1);
        await tx.cliente.update({
          where: { id: incidencia.cliente_id },
          data: { botellones_prestados: nuevosPrestados }
        });
      }

      // Lógica de negocio 2: Si era entrega parcial y traen el resto, actualizamos el item del pedido
      if (
        incidencia.tipo === "CANTIDAD_PARCIAL" && 
        payload?.pedido_item_id && 
        payload?.cantidad_faltante_entregada
      ) {
        await tx.pedidoItem.update({
          where: { id: payload.pedido_item_id },
          data: {
            cantidad_entregada: {
              increment: payload.cantidad_faltante_entregada
            }
          }
        });
      }
    });

    revalidatePath('/admin/clientes');
    return { success: true };
  } catch (error: any) {
    console.error("Error al resolver incidencia:", error);
    return { success: false, message: error.message || "Error al procesar la resolución de la incidencia." };
  }
}