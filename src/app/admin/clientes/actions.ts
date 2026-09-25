'use server';

import { prisma } from '../../../../lib/prisma';
import { TipoCliente, PreferenciaFacturacion, Frecuencia } from '../../../../lib/prisma/generated';
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
  sector_id?: string | null;
  frecuencia?: Frecuencia;
  deuda?: number;
}

// 1. Crear Cliente
export async function crearClienteAction(data: ClienteInput) {
  try {
    await prisma.cliente.create({
      data: {
        ...data,
        frecuencia: data.frecuencia || 'SEMANAL',
        deuda: data.deuda ?? 0,
      }
    });
    revalidatePath('/admin/clientes');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al crear cliente.' };
  }
}

// 2. Editar Cliente (Sanitizado para ignorar relaciones anidadas accidentales)
export async function editarClienteAction(id: string, data: ClienteInput) {
  try {
    await prisma.cliente.update({
      where: { id },
      data: {
        nombre: data.nombre,
        tipo: data.tipo,
        direccion: data.direccion,
        telefono: data.telefono,
        email: data.email || null,
        rut_empresa: data.rut_empresa || null,
        giro: data.giro || null,
        preferencia_factura: data.preferencia_factura,
        notas: data.notas || null,
        activo: data.activo,
        botellones_prestados: data.botellones_prestados ?? 0,
        sector_id: data.sector_id || null,
        frecuencia: data.frecuencia || 'SEMANAL',
        deuda: data.deuda !== undefined ? Number(data.deuda) : undefined,
      },
    });
    revalidatePath('/admin/clientes');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al actualizar cliente.' };
  }
}

// 3. Desactivar / Activar Cliente
export async function desactivarClienteAction(id: string, estado: boolean = false) {
  try {
    await prisma.cliente.update({
      where: { id },
      data: { activo: estado },
    });
    revalidatePath('/admin/clientes');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: 'No se pudo actualizar el estado del cliente.' };
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

// 5. Asignar Dispensador (Corregido: sin campo 'tipo' en create)
export async function asignarDispensadorAction(clienteId: string, payload: any) {
  try {
    const numeroSerieLimpio = payload.numeroSerie || payload.numero_serie || null;

    if (numeroSerieLimpio && numeroSerieLimpio !== 'S/N') {
      const existeSerie = await prisma.dispensador.findUnique({
        where: { numero_serie: numeroSerieLimpio }
      });
      if (existeSerie) {
        return {
          success: false,
          message: `El número de serie "${numeroSerieLimpio}" ya está registrado en el sistema.`
        };
      }
    }

    const precioFinal = parseInt(payload.precioArriendo || payload.precio_arriendo, 10) || 0;

    const dispensador = await prisma.dispensador.create({
      data: {
        marca: payload.marca,
        modelo: payload.modelo || 'Estándar',
        numero_serie: numeroSerieLimpio,
        foto_url: payload.fotoUrl || payload.foto_url || null,
        cliente_id: clienteId,
        precio_arriendo: precioFinal,
        estado: payload.estado || 'EN_CLIENTE',
      }
    });

    revalidatePath('/admin/clientes');
    return { success: true, data: dispensador };
  } catch (error: any) {
    console.error('Error al asignar dispensador:', error);
    return { success: false, message: error.message || 'Error interno al guardar el dispensador.' };
  }
}

// 6. Registrar Mantención
export async function registrarMantencionAction(clienteId: string, payload: any) {
  try {
    const dispensador = await prisma.dispensador.findFirst({
      where: { cliente_id: clienteId }
    });

    if (!dispensador) {
      return {
        success: false,
        message: 'No se encontró ningún dispensador asociado a este cliente para enviarlo a taller.'
      };
    }

    await prisma.mantencionDispensador.create({
      data: {
        dispensador_id: dispensador.id,
        problema_reportated: payload.motivoFalla || 'Revisión técnica general',
        foto_ingreso_url: payload.fotoUrl || 'https://placeholder.com/no-image.png',
        diagnostico: 'Pendiente de revisión en taller',
        costo_total: 0,
        mano_de_obra: 0,
        costo_repuestos: 0
      }
    });

    revalidatePath('/admin/clientes');
    return { success: true };
  } catch (error: any) {
    console.error('Error en taller:', error);
    return { success: false, message: 'Error al registrar la orden técnica en el taller.' };
  }
}

// 7. Registrar Movimiento Financiero (Recalcula Deuda Automáticamente)
export async function registrarMovimientoFinancieroAction(clienteId: string, payload: any) {
  try {
    const montoNum = parseFloat(payload.monto) || 0;
    const esPago = payload.tipo === 'PAGO_RECIBIDO' || payload.tipo === 'AJUSTE_CREDITO';

    await prisma.$transaction(async (tx) => {
      await tx.historialFinanciero.create({
        data: {
          cliente_id: clienteId,
          tipo: payload.tipo,
          descripcion: payload.descripcion || 'Movimiento de caja',
          monto: montoNum,
          documento_ref: payload.documentoRef || payload.documento_ref || null,
          sincronizado_facturacion: false
        }
      });

      const cliente = await tx.cliente.findUnique({ where: { id: clienteId } });
      const deudaActual = cliente?.deuda ?? 0;
      const nuevaDeuda = esPago ? Math.max(0, deudaActual - montoNum) : deudaActual + montoNum;

      await tx.cliente.update({
        where: { id: clienteId },
        data: { deuda: nuevaDeuda }
      });
    });

    revalidatePath('/admin/clientes');
    return { success: true };
  } catch (error: any) {
    console.error('Error en finanzas:', error);
    return { success: false, message: 'Error al procesar el registro de caja.' };
  }
}

// 7b. Registrar Pago o Transferencia de Cliente (Recalcula Deuda Automáticamente)
export async function registrarPagoOTransferenciaAction(clienteId: string, payload: { monto: number; descripcion: string; documento_ref?: string; esTransferencia?: boolean }) {
  try {
    const montoNum = parseFloat(String(payload.monto)) || 0;
    if (montoNum <= 0) return { success: false, message: 'El monto ingresado debe ser mayor a 0.' };

    await prisma.$transaction(async (tx) => {
      await tx.historialFinanciero.create({
        data: {
          cliente_id: clienteId,
          tipo: 'PAGO_RECIBIDO',
          descripcion: payload.descripcion || (payload.esTransferencia ? 'Pago mediante Transferencia Bancaria' : 'Pago de cliente'),
          monto: montoNum,
          documento_ref: payload.documento_ref || null,
          sincronizado_facturacion: false
        }
      });

      const cliente = await tx.cliente.findUnique({ where: { id: clienteId } });
      const deudaActual = cliente?.deuda ?? 0;
      const nuevaDeuda = Math.max(0, deudaActual - montoNum);

      await tx.cliente.update({
        where: { id: clienteId },
        data: { deuda: nuevaDeuda }
      });
    });

    revalidatePath('/admin/clientes');
    return { success: true };
  } catch (error: any) {
    console.error('Error al registrar pago:', error);
    return { success: false, message: error.message || 'Error al registrar el pago.' };
  }
}

// 8. Modificar un Dispensador Existente
export async function editarDispensadorAction(dispensadorId: string, payload: any) {
  try {
    await prisma.dispensador.update({
      where: { id: dispensadorId },
      data: {
        marca: payload.marca,
        modelo: payload.modelo || 'Estándar',
        numero_serie: payload.numeroSerie || payload.numero_serie || null,
        estado: payload.estado,
        precio_arriendo: parseInt(payload.precioArriendo || payload.precio_arriendo, 10) || 0,
        foto_url: payload.fotoUrl || payload.foto_url || undefined
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
    await prisma.mantencionDispensador.deleteMany({
      where: { dispensador_id: dispensadorId }
    });
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

// 10. Obtener Historial Completo del Cliente
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
    console.error('Error al obtener historial:', error);
    return { success: false, message: error.message || 'Error interno al cargar el historial.' };
  }
}

// 11. Resolver Incidencia
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

      if (!incidencia) throw new Error('Incidencia no encontrada.');
      if (incidencia.resuelta) throw new Error('Esta incidencia ya fue resuelta anteriormente.');

      await tx.incidencia.update({
        where: { id: incidenciaId },
        data: { resuelta: true }
      });

      if (incidencia.tipo === 'PRESTAMO_BOTELLON') {
        const nuevosPrestados = Math.max(0, incidencia.cliente.botellones_prestados - 1);
        await tx.cliente.update({
          where: { id: incidencia.cliente_id },
          data: { botellones_prestados: nuevosPrestados }
        });
      }

      if (
        incidencia.tipo === 'CANTIDAD_PARCIAL' &&
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
    console.error('Error al resolver incidencia:', error);
    return { success: false, message: error.message || 'Error al procesar la resolución de la incidencia.' };
  }
}

// 12. Obtener Comunas con sus Sectores
export async function obtenerComunasConSectoresAction() {
  try {
    const comunas = await prisma.comuna.findMany({
      where: { activa: true },
      orderBy: { nombre: 'asc' },
      include: {
        sectores: {
          where: { activo: true },
          orderBy: { nombre: 'asc' },
          select: { id: true, nombre: true },
        },
      },
    });
    return { success: true, comunas };
  } catch (error: any) {
    return { success: false, comunas: [], message: error.message };
  }
}