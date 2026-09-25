'use server';

import { auth } from '@/lib/auth'; 
import { headers } from 'next/headers';
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
              cliente: {
                include: { sector: true }   // ← agregado
              },
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
            estado: EstadoParada.PENDIENTE,
            bot20_esperado: cf.bot20_default,
            bot10_esperado: cf.bot10_default,
            soda_esperada: cf.soda_default
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

export async function buscarClientePorCriterioAction(criterio: string) {
  try {
    if (!criterio || criterio.trim().length < 2) return { success: true, clientes: [] };

    const clientes = await prisma.cliente.findMany({
      where: {
        OR: [
          { nombre: { contains: criterio } },
          { rut_empresa: { contains: criterio } },
          { telefono: { contains: criterio } },
          { direccion: { contains: criterio } }
        ]
      },
      include: { sector: { include: { comuna: true } } },
      take: 7
    });
    return { success: true, clientes };
  } catch (error: any) {
    console.error('Error en buscarClientePorCriterioAction:', error);
    return { success: false, clientes: [] };
  }
}
export async function obtenerComunasYSectoresAction() {
  try {
    const comunas = await prisma.comuna.findMany({
      where: { activa: true },
      include: { sectores: { where: { activo: true }, orderBy: { nombre: 'asc' } } },
      orderBy: { nombre: 'asc' }
    });
    return { success: true, comunas };
  } catch (error: any) {
    console.error('Error en obtenerComunasYSectoresAction:', error);
    return { success: false, comunas: [] };
  }
}

export async function guardarPedidoRapidoAction(data: {
  fecha_solicitada: string;
  canal_origen: string;
  cliente_id?: string;
  editando_existente?: boolean;
  nuevo_cliente?: {
    nombre: string;
    telefono: string;
    direccion: string;
    sector_id?: string;
    tipo: string; // TipoCliente
    email?: string;
    rut_empresa?: string;
    giro?: string;
    preferencia_factura?: string; // PreferenciaFacturacion
  };
  items: { producto_id: string; cantidad: number; tipo_transaccion: string }[];
  ruta_dia_id?: string;
}) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return { success: false, message: 'No autenticado.' };
    }

    if (!data.items || data.items.length === 0) {
      return { success: false, message: 'Debe agregar al menos un producto.' };
    }

    let finalClienteId = data.cliente_id;

    if (!finalClienteId || data.editando_existente) {
      if (!data.nuevo_cliente) {
        return { success: false, message: 'Faltan datos del cliente.' };
      }

      const esEmpresa = data.nuevo_cliente.tipo === 'EMPRESA';
      const clienteData: any = {
        nombre: data.nuevo_cliente.nombre,
        telefono: data.nuevo_cliente.telefono,
        direccion: data.nuevo_cliente.direccion,
        tipo: data.nuevo_cliente.tipo as any,
        sector_id: data.nuevo_cliente.sector_id || null,
        email: data.nuevo_cliente.email || null,
        rut_empresa: esEmpresa ? (data.nuevo_cliente.rut_empresa || null) : null,
        giro: esEmpresa ? (data.nuevo_cliente.giro || null) : null,
        preferencia_factura: (data.nuevo_cliente.preferencia_factura as any) || (esEmpresa ? 'FACTURA' : 'BOLETA'),
      };

      if (data.editando_existente && data.cliente_id) {
        await prisma.cliente.update({ where: { id: data.cliente_id }, data: clienteData });
        finalClienteId = data.cliente_id;
      } else {
        const nuevoCliente = await prisma.cliente.create({ data: clienteData });
        finalClienteId = nuevoCliente.id;
      }
    }

    // Traer categoría y precios de todos los productos del carrito en una sola consulta
    const productoIds = [...new Set(data.items.map(i => i.producto_id))];
    const productos = await prisma.producto.findMany({
      where: { id: { in: productoIds } },
      select: { id: true, categoria: true, precio_venta_nueva: true, precio_recarga: true }
    });
    const productoPorId = new Map(productos.map(p => [p.id, p]));

    const expectativa = { bot20_esperado: 0, bot10_esperado: 0, soda_esperada: 0 };
    for (const item of data.items) {
      const prod = productoPorId.get(item.producto_id);
      if (!prod) continue;
      if (prod.categoria === 'BOTELLON20') expectativa.bot20_esperado += item.cantidad;
      else if (prod.categoria === 'BOTELLON10') expectativa.bot10_esperado += item.cantidad;
      else if (prod.categoria === 'SODA') expectativa.soda_esperada += item.cantidad;
    }

    const fechaSolicitada = new Date(`${data.fecha_solicitada}T12:00:00.000Z`);

    await prisma.$transaction(async (tx) => {
      const nuevoPedido = await tx.pedido.create({
        data: {
          cliente_id: finalClienteId!,
          fecha_solicitada: fechaSolicitada,
          estado: data.ruta_dia_id ? EstadoPedido.ASIGNADO : EstadoPedido.PENDIENTE_CONFIRMACION,
          canal_origen: data.canal_origen as any,
          usuario_registro_id: session.user.id,
          items: {
            create: data.items.map(item => {
              const prod = productoPorId.get(item.producto_id);
              const precio = item.tipo_transaccion === 'RECARGA'
                ? (prod?.precio_recarga ?? prod?.precio_venta_nueva ?? 0)
                : (prod?.precio_venta_nueva ?? 0);
              return {
                producto_id: item.producto_id,
                cantidad: item.cantidad,
                tipo_transaccion: item.tipo_transaccion as any,
                precio_historico: precio
              };
            })
          }
        }
      });

      if (data.ruta_dia_id) {
        const ultimaParada = await tx.paradaDia.findFirst({
          where: { ruta_dia_id: data.ruta_dia_id },
          orderBy: { orden: 'desc' }
        });
        const proximoOrden = ultimaParada ? ultimaParada.orden + 1 : 1;

        await tx.paradaDia.create({
          data: {
            ruta_dia_id: data.ruta_dia_id,
            cliente_id: finalClienteId!,
            pedido_id: nuevoPedido.id,
            orden: proximoOrden,
            estado: EstadoParada.PENDIENTE,
            ...expectativa
          }
        });
      }
    });

    revalidatePath('/admin/rutas');
    return { success: true, message: 'Pedido creado y asignado con éxito.' };
  } catch (error: any) {
    console.error('Error en guardarPedidoRapidoAction:', error);
    return { success: false, message: error.message || 'Error al registrar el pedido.' };
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

/**
 * Actualiza SOLO la expectativa (esperado) de una parada puntual del día,
 * sin tocar la plantilla habitual (ClienteRutaBase). Solo permitido
 * mientras la parada sigue PENDIENTE.
 */
export async function actualizarEsperadoParadaAction(
  paradaId: string,
  cantidades: { bot20_esperado: number; bot10_esperado: number; soda_esperada: number }
) {
  try {
    const parada = await prisma.paradaDia.findUnique({ where: { id: paradaId } });
    if (!parada) return { success: false, message: 'Parada no encontrada.' };

    if (parada.estado !== EstadoParada.PENDIENTE) {
      return { success: false, message: 'Solo se puede editar la expectativa mientras la parada está pendiente.' };
    }

    await prisma.paradaDia.update({
      where: { id: paradaId },
      data: {
        bot20_esperado: Math.max(0, cantidades.bot20_esperado),
        bot10_esperado: Math.max(0, cantidades.bot10_esperado),
        soda_esperada: Math.max(0, cantidades.soda_esperada)
      }
    });

    revalidatePath('/admin/rutas');
    return { success: true };
  } catch (error: any) {
    console.error('Error en actualizarEsperadoParadaAction:', error);
    return { success: false, message: error.message || 'Error al actualizar la expectativa.' };
  }
}

/**
 * Cuando una parada queda FALLIDA o POSTERGADA, genera automáticamente
 * una nueva parada PENDIENTE en la RutaDia de la semana siguiente
 * (misma plantilla, mismo cliente, mismo esperado). Si esa RutaDia
 * todavía no existe, la crea. No hace nada si la parada ya fue reprogramada
 * o si no proviene de una plantilla (ruta ad-hoc).
 */
async function reprogramarParadaSemanaSiguiente(paradaId: string) {
  const parada = await prisma.paradaDia.findUnique({
    where: { id: paradaId },
    include: { ruta_dia: true }
  });
  if (!parada || parada.reprogramada) return;

  const rutaBase = await prisma.rutaBase.findUnique({
    where: { id: parada.ruta_dia.ruta_base_id }
  });
  if (!rutaBase) return; // ruta ad-hoc sin plantilla, no aplica reprogramación

  const fechaSiguiente = new Date(parada.ruta_dia.fecha);
  fechaSiguiente.setUTCDate(fechaSiguiente.getUTCDate() + 7);

  const inicioDia = new Date(fechaSiguiente);
  inicioDia.setUTCHours(0, 0, 0, 0);
  const finDia = new Date(fechaSiguiente);
  finDia.setUTCHours(23, 59, 59, 999);

  let rutaDiaSiguiente = await prisma.rutaDia.findFirst({
    where: {
      ruta_base_id: rutaBase.id,
      fecha: { gte: inicioDia, lte: finDia }
    }
  });

  if (!rutaDiaSiguiente) {
    rutaDiaSiguiente = await prisma.rutaDia.create({
      data: {
        fecha: fechaSiguiente,
        estado: EstadoRuta.ACTIVA,
        usuario_id: rutaBase.usuario_id,
        vehiculo_id: rutaBase.vehiculo_id,
        ruta_base_id: rutaBase.id
      }
    });
  }

  const ultimaParada = await prisma.paradaDia.findFirst({
    where: { ruta_dia_id: rutaDiaSiguiente.id },
    orderBy: { orden: 'desc' }
  });
  const proximoOrden = ultimaParada ? ultimaParada.orden + 1 : 1;

  await prisma.$transaction([
    prisma.paradaDia.create({
      data: {
        ruta_dia_id: rutaDiaSiguiente.id,
        cliente_id: parada.cliente_id,
        orden: proximoOrden,
        estado: EstadoParada.PENDIENTE,
        bot20_esperado: parada.bot20_esperado,
        bot10_esperado: parada.bot10_esperado,
        soda_esperada: parada.soda_esperada,
        observaciones: `Reprogramado automáticamente (parada ${parada.estado.toLowerCase()} del ${parada.ruta_dia.fecha.toLocaleDateString('es-CL')}).`
      }
    }),
    prisma.paradaDia.update({
      where: { id: parada.id },
      data: { reprogramada: true }
    })
  ]);
}

export async function actualizarEstadoParadaAction(paradaId: string, estado: string) {
  return actualizarParadaCompletaAction(paradaId, { estado });
}

export async function actualizarParadaCompletaAction(paradaId: string, datos: any) {
  try {
    if (!paradaId || !datos.estado) return { success: false, message: 'Parámetros inválidos.' };

    const updateData: any = {
      estado: datos.estado,
      foto_url: datos.foto_url || null,
    };

    // Al cambiar a cualquier estado, limpiar motivos previos por defecto
    updateData.motivo_postergacion = null;
    updateData.motivo_fallo = null;

    // Luego asignar solo el motivo que corresponde al estado actual
    if (datos.estado === 'POSTERGADO' && datos.observacion) {
      updateData.motivo_postergacion = datos.observacion;
    } else if (datos.estado === 'FALLIDO' && datos.observacion) {
      updateData.motivo_fallo = datos.observacion;
      updateData.foto_url = datos.foto_url || null;
    }

    // Cantidades solo al confirmar entrega
    if (datos.cantidades) {
      updateData.bot20_entregado = datos.cantidades.bot20 || 0;
      updateData.bot10_entregado = datos.cantidades.bot10 || 0;
      updateData.soda_entregada  = datos.cantidades.soda  || 0;
    }

    // Observaciones generales (input libre en la fila)
    if (datos.observaciones !== undefined) {
      updateData.observaciones = datos.observaciones || null;
    }

    await prisma.paradaDia.update({
      where: { id: paradaId },
      data: updateData
    });

    // ── Reprogramación automática si el pedido no se concretó ──
    if (datos.estado === 'FALLIDO' || datos.estado === 'POSTERGADO') {
      await reprogramarParadaSemanaSiguiente(paradaId);
    }

    revalidatePath('/admin/rutas');
    return { success: true };
  } catch (error: any) {
    console.error('Error en actualizarParadaCompletaAction:', error);
    return { success: false, message: error.message || "Error al actualizar estado de la parada." };
  }
}


// ============================================================================
// INCIDENCIAS Y DRAG & DROP
// ============================================================================
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

    revalidatePath('/admin/rutas');
    return { success: true };
  } catch (error: any) {
    console.error('[registrarIncidenciaAction] Error:', error);
    return { success: false, message: error.message || "Error al registrar la incidencia" };
  }
}
/**
 * Elimina completamente una RutaDia y todas sus paradas asociadas.
 * Uso: limpiar hojas de ruta de prueba, o rutas mal generadas.
 */
export async function eliminarRutaDiaAction(rutaDiaId: string) {
  try {
    await prisma.$transaction([
      prisma.paradaDia.deleteMany({ where: { ruta_dia_id: rutaDiaId } }),
      prisma.rutaDia.delete({ where: { id: rutaDiaId } })
    ]);
    revalidatePath('/admin/rutas');
    return { success: true };
  } catch (error: any) {
    console.error('Error en eliminarRutaDiaAction:', error);
    return { success: false, message: error.message || 'Error al eliminar la hoja de ruta.' };
  }
}

export async function actualizarOrdenParadasAction(paradasReordenadas: { id: string; orden_nuevo: number }[]) {
  try {
    if (!paradasReordenadas || paradasReordenadas.length === 0) return { success: true };

    await prisma.$transaction(
      paradasReordenadas.map((parada) =>
        prisma.paradaDia.update({
          where: { id: parada.id },
          data: { 
            orden: parada.orden_nuevo,
            orden_ajustado: true
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