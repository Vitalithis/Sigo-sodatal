'use server';

import { prisma } from '../../../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { 
  EstadoRuta, 
  EstadoParada, 
  EstadoPedido, 
  Rol, 
  EstadoVehiculo, 
  DiaSemana,
  TipoIncidencia 
} from '../../../../lib/prisma/generated';
/**
 * Obtiene todas las rutas reales y los pedidos flotantes para una fecha específica
 */
export async function obtenerRutasPorFechaAction(fechaStr: string) {
  try {
    const inicioDia = new Date(`${fechaStr}T00:00:00.000Z`);
    const finDia = new Date(`${fechaStr}T23:59:59.999Z`);

    const rutasDia = await prisma.rutaDia.findMany({
      where: {
        fecha: { gte: inicioDia, lte: finDia }
      },
      include: {
        usuario: true,
        vehiculo: true,
        paradas: {
          orderBy: { orden: 'asc' },
          include: {
            cliente: true,
            pedido: {
              include: { items: { include: { producto: true } } }
            }
          }
        }
      }
    });

    const pedidosDia = await prisma.pedido.findMany({
      where: {
        fecha_solicitada: { gte: inicioDia, lte: finDia },
        estado: { not: EstadoPedido.CANCELADO } 
      },
      include: {
        cliente: true,
        items: true
      }
    });

    return { success: true, rutas: rutasDia, pedidos: pedidosDia };
  } catch (error) {
    console.error('Error en obtenerRutasPorFechaAction:', error);
    return { success: false, rutas: [], pedidos: [], message: "No se pudieron cargar las rutas diarias." };
  }
}

/**
 * Genera las Hojas de Ruta del Día basándose en las Plantillas Base (RutaBase).
 */
export async function generarRutasDesdeBaseAction(fechaStr: string, diaSemana: DiaSemana) {
  try {
    const fechaDestino = new Date(`${fechaStr}T12:00:00.000Z`);
    const inicioDia = new Date(`${fechaStr}T00:00:00.000Z`);
    const finDia = new Date(`${fechaStr}T23:59:59.999Z`);

    const plantillasBase = await prisma.rutaBase.findMany({
      where: { dia_semana: diaSemana }
    });

    if (plantillasBase.length === 0) {
      return { 
        success: false, 
        message: `No existen plantillas de rutas base configuradas para el día ${diaSemana}.` 
      };
    }

    let rutasCreadasContador = 0;

    for (const plantilla of plantillasBase) {
      const rutaExistente = await prisma.rutaDia.findFirst({
        where: {
          fecha: { gte: inicioDia, lte: finDia },
          OR: [
            { vehiculo_id: plantilla.vehiculo_id },
            { usuario_id: plantilla.usuario_id }
          ]
        }
      });

      if (rutaExistente) {
        continue; 
      }

      const nuevaRutaDia = await prisma.rutaDia.create({
        data: {
          fecha: fechaDestino,
          estado: EstadoRuta.ACTIVA,
          usuario_id: plantilla.usuario_id,
          vehiculo_id: plantilla.vehiculo_id,
          ruta_base_id: plantilla.id
        }
      });

      rutasCreadasContador++;

      const clientesFijos = await prisma.clienteRutaBase.findMany({
        where: { ruta_base_id: plantilla.id },
        orderBy: { orden: 'asc' }
      });

      for (const cf of clientesFijos) {
        await prisma.paradaDia.create({
          data: {
            ruta_dia_id: nuevaRutaDia.id,
            cliente_id: cf.cliente_id,
            orden: cf.orden,
            estado: EstadoParada.PENDIENTE
          }
        });
      }
    }

    revalidatePath('/admin/rutas');

    if (rutasCreadasContador === 0) {
      return { 
        success: true, 
        message: "Las hojas de ruta para los furgones y choferes de hoy ya se encontraban iniciadas." 
      };
    }

    return { 
      success: true, 
      message: `Se han generado exitosamente ${rutasCreadasContador} nueva(s) hoja(s) de ruta para la jornada.` 
    };

  } catch (error: any) {
    console.error('Error en generarRutasDesdeBaseAction:', error);
    return { success: false, message: error.message || "Error al generar las hojas de ruta diarias." };
  }
}

/**
 * ✨ Trae el catálogo completo de productos activos
 */
export async function obtenerProductosAction() {
  try {
    const productos = await prisma.producto.findMany({
      orderBy: { nombre: 'asc' }
    });
    return { success: true, productos };
  } catch (error: any) {
    console.error('Error en obtenerProductosAction:', error);
    return { success: false, productos: [], message: error.message };
  }
}

/**
 * ✨ Busca clientes por coincidencia de nombre o RUT en el modal rápido
 */
export async function buscarClientePorCriterioAction(criterio: string) {
  try {
    if (!criterio || criterio.trim().length < 2) return { success: true, clientes: [] };
    
    const clientes = await prisma.cliente.findMany({
      where: {
        OR: [
          { nombre: { contains: criterio, mode: 'insensitive' } },
          { rut_empresa: { contains: criterio, mode: 'insensitive' } } // 👈 Corrección: 'rut' no existe en Cliente, es 'rut_empresa' según tu schema
        ]
      },
      take: 7
    });
    return { success: true, clientes };
  } catch (error: any) {
    console.error('Error en buscarClientePorCriterioAction:', error);
    return { success: false, clientes: [] };
  }
}

export async function guardarPedidoRapidoAction(data: {
  fecha: string;
  clienteId?: string;
  nombre: string;
  telefono: string;
  direccion: string;
  sector: string;
  productoId: string;
  cantidad: number;
  usuarioRegistroId: string;
}) {
  try {
    let finalClienteId = data.clienteId;

    if (!finalClienteId) {
      const nuevoCliente = await prisma.cliente.create({
        data: {
          nombre: data.nombre,
          telefono: data.telefono,
          direccion: data.direccion,
          sector: data.sector,
          tipo: "DOMICILIO",
        }
      });
      finalClienteId = nuevoCliente.id;
    }

    const fechaSolicitada = new Date(`${data.fecha}T12:00:00.000Z`);

    await prisma.pedido.create({
      data: {
        cliente_id: finalClienteId,
        fecha_solicitada: fechaSolicitada,
        estado: EstadoPedido.PENDIENTE_CONFIRMACION, 
        canal_origen: "LLAMADO", 
        usuario_registro_id: data.usuarioRegistroId, 
        items: {
          create: {
            producto_id: data.productoId,
            cantidad: data.cantidad,
            tipo_transaccion: "VENTA", 
            precio_historico: 0 
          }
        }
      }
    });

    revalidatePath('/admin/rutas');
    return { success: true, message: "Pedido rápido creado con éxito." };
  } catch (error: any) {
    console.error('Error en guardarPedidoRapidoAction:', error);
    return { success: false, message: error.message || "Error al registrar el pedido rápido." };
  }
}

export async function cambiarOrdenParadaAction(paradaId: string, nuevoOrden: number) {
  try {
    await prisma.paradaDia.update({
      where: { id: paradaId },
      data: { orden: nuevoOrden }
    });
    revalidatePath('/admin/rutas');
    return { success: true };
  } catch (error: any) {
    console.error('Error en cambiarOrdenParadaAction:', error);
    return { success: false, message: error.message };
  }
}

export async function asignarPedidoARutaAction(pedidoId: string, rutaDiaId: string, orden: number) {
  try {
    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    if (!pedido) return { success: false, message: "Pedido no encontrado." };

    await prisma.paradaDia.create({
      data: {
        ruta_dia_id: rutaDiaId,
        cliente_id: pedido.cliente_id,
        pedido_id: pedidoId,
        orden: orden,
        estado: EstadoParada.PENDIENTE
      }
    });

    revalidatePath('/admin/rutas');
    return { success: true };
  } catch (error: any) {
    console.error('Error en asignarPedidoARutaAction:', error);
    return { success: false, message: error.message };
  }
}

export async function getFormularioRutaBaseData() {
  try {
    const choferes = await prisma.usuario.findMany({
      where: { rol: Rol.REPARTIDOR }, 
      select: { id: true, nombre: true, apellido: true }
    });

    const vehiculos = await prisma.vehiculo.findMany({
      where: { estado: EstadoVehiculo.ACTIVO },
      select: { id: true, marca: true, modelo: true, patente: true }
    });

    return { success: true, choferes, vehiculos };
  } catch (error) {
    console.error('Error en getFormularioRutaBaseData:', error);
    return { success: false, choferes: [], vehiculos: [], message: "Error al cargar datos dinámicos." };
  }
}

export async function guardarRutaBaseAction(data: {
  nombre: string;
  dia_semana: DiaSemana;
  usuario_id: string;
  vehiculo_id: string;
}) {
  try {
    const nuevaRuta = await prisma.rutaBase.create({
      data: {
        nombre: data.nombre,
        dia_semana: data.dia_semana,
        usuario_id: data.usuario_id,
        vehiculo_id: data.vehiculo_id,
        frecuencia: "SEMANAL"
      }
    });

    revalidatePath('/admin/rutas');
    return { success: true, data: nuevaRuta };
  } catch (error: any) {
    console.error('Error al guardar ruta base:', error);
    return { success: false, message: error.message || "Error al crear la plantilla base." };
  }
}

export async function actualizarEstadoParadaAction(paradaId: string, nuevoEstado: EstadoParada) {
  try {
    if (!paradaId || !nuevoEstado) return { success: false, message: 'Parámetros inválidos.' };

    await prisma.paradaDia.update({
      where: { id: paradaId },
      data: { estado: nuevoEstado }
    });

    revalidatePath('/admin/rutas');
    return { success: true };
  } catch (error: any) {
    console.error('Error en actualizarEstadoParadaAction:', error);
    return { success: false, message: error.message || "Error al actualizar estado de la parada." };
  }
}


// ============================================================================
// 👇 BLOQUE 2 - NUEVAS ACTIONS REQUERIDAS SEGÚN EL PLAN
// ============================================================================

/**
 * 2.1 — Registrar Incidencia
 */
export interface RegistrarIncidenciaInput {
  cliente_id: string;
  parada_id?: string;
  cuadratura_id?: string;
  usuario_id: string;
  tipo: TipoIncidencia;
  descripcion?: string;
  pedido_item_id?: string;
  cantidad_entregada?: number;
}

export async function registrarIncidenciaAction(data: RegistrarIncidenciaInput) {
  try {
    await prisma.$transaction(async (tx) => {
      
      // 1. Crear la Incidencia
      await tx.incidencia.create({
        data: {
          cliente_id: data.cliente_id,
          parada_id: data.parada_id,
          cuadratura_id: data.cuadratura_id,
          usuario_id: data.usuario_id,
          tipo: data.tipo,
          descripcion: data.descripcion,
          resuelta: false, 
        },
      });

      // 2. Regla de negocio: Si es préstamo, incrementar deuda del cliente
      if (data.tipo === "PRESTAMO_BOTELLON") {
        await tx.cliente.update({
          where: { id: data.cliente_id },
          data: {
            botellones_prestados: {
              increment: 1,
            },
          },
        });
      }

      // 3. Regla de negocio: Si es entrega parcial, actualizar el ítem del pedido
      if (data.tipo === "CANTIDAD_PARCIAL") {
        if (!data.pedido_item_id || data.cantidad_entregada === undefined) {
          throw new Error("Faltan datos (pedido_item_id o cantidad_entregada) para registrar la entrega parcial.");
        }
        
        await tx.pedidoItem.update({
          where: { id: data.pedido_item_id },
          data: {
            cantidad_entregada: data.cantidad_entregada,
          },
        });
      }
    });

    revalidatePath('/admin/rutas'); // Asumo que querrás refrescar las rutas tras la incidencia
    return { success: true };
  } catch (error: any) {
    console.error('[registrarIncidenciaAction] Error:', error);
    return { success: false, message: error.message || "Error al registrar la incidencia" };
  }
}


/**
 * 2.3 — Actualizar Orden de Paradas Masivamente (Drag & Drop)
 */
export async function actualizarOrdenParadasAction(paradasReordenadas: { id: string; orden_nuevo: number }[]) {
  try {
    if (!paradasReordenadas || paradasReordenadas.length === 0) return { success: true };

    // Usamos transacción para que se actualicen todas juntas
    await prisma.$transaction(
      paradasReordenadas.map((parada) =>
        prisma.paradaDia.update({
          where: { id: parada.id },
          data: { 
            orden: parada.orden_nuevo,
            orden_ajustado: true // 👈 Registramos que el repartidor alteró el orden sugerido
          }
        })
      )
    );

    revalidatePath('/admin/rutas');
    return { success: true };
  } catch (error: any) {
    console.error('Error en actualizarOrdenParadasAction:', error);
    return { success: false, message: error.message || "Error al reordenar las paradas." };
  }
}
