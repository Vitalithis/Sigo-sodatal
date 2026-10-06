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

    const [rutasDia, pedidosDia, choferes, vehiculos] = await Promise.all([
      prisma.rutaDia.findMany({
        where: {
          fecha: { gte: inicioDia, lte: finDia }
        },
        include: {
          usuario: {
            include: { vehiculo: true }
          },
          vehiculo: true,
          ruta_base: true,
          paradas: {
            orderBy: { orden: 'asc' },
            include: {
              cliente: {
                include: { sector: { include: { comuna: true } } }
              },
              pedido: {
                include: { items: { include: { producto: true } } }
              }
            }
          }
        }
      }),
      prisma.pedido.findMany({
        where: {
          fecha_solicitada: { gte: inicioDia, lte: finDia },
          estado: { not: EstadoPedido.CANCELADO } 
        },
        include: {
          cliente: true,
          items: true
        }
      }),
      prisma.usuario.findMany({
        where: { rol: Rol.REPARTIDOR, activo: true },
        include: { vehiculo: true },
        orderBy: { nombre: 'asc' }
      }),
      prisma.vehiculo.findMany({
        where: { estado: EstadoVehiculo.ACTIVO },
        orderBy: { patente: 'asc' }
      })
    ]);

    return { success: true, rutas: rutasDia, pedidos: pedidosDia, choferes, vehiculos };
  } catch (error) {
    console.error('Error en obtenerRutasPorFechaAction:', error);
    return { success: false, rutas: [], pedidos: [], choferes: [], vehiculos: [], message: "No se pudieron cargar las rutas diarias." };
  }
}

function evaluarVisitaCliente(
  frecuencia: string = 'SEMANAL',
  fechaDestino: Date,
  ultimaVisita: Date | null
): { debeVisitar: boolean; diasDesdeUltima: number | null; explicacion: string } {
  const freq = (frecuencia || 'SEMANAL').toUpperCase();

  // Clientes a pedido no se cargan automáticamente en rutas fijas de calendario
  if (freq === 'A_PEDIDO') {
    return {
      debeVisitar: false,
      diasDesdeUltima: null,
      explicacion: 'Frecuencia A Pedido (no se incluye automáticamente en rutas fijas)'
    };
  }

  // Si no registra visitas anteriores, se incluye para iniciar su ciclo
  if (!ultimaVisita) {
    return {
      debeVisitar: true,
      diasDesdeUltima: null,
      explicacion: 'Primera visita (sin entregas previas registradas)'
    };
  }

  const msPorDia = 1000 * 60 * 60 * 24;
  const utcDestino = Date.UTC(fechaDestino.getFullYear(), fechaDestino.getMonth(), fechaDestino.getDate());
  const utcUltima = Date.UTC(ultimaVisita.getFullYear(), ultimaVisita.getMonth(), ultimaVisita.getDate());
  const diasDesdeUltima = Math.round((utcDestino - utcUltima) / msPorDia);

  if (diasDesdeUltima <= 0) {
    return {
      debeVisitar: false,
      diasDesdeUltima,
      explicacion: 'Ya atendido en esta misma fecha o posterior'
    };
  }

  if (freq === 'QUINCENAL' || freq === 'ALTERNA') {
    // Quincenal: ciclo de 14 días. Corresponde si han pasado al menos 11 días
    if (diasDesdeUltima >= 11) {
      return {
        debeVisitar: true,
        diasDesdeUltima,
        explicacion: `Última visita hace ${diasDesdeUltima} días (cumple ciclo quincenal)`
      };
    }
    return {
      debeVisitar: false,
      diasDesdeUltima,
      explicacion: `Última visita hace ${diasDesdeUltima} días (próxima estimada en ${14 - diasDesdeUltima} días)`
    };
  }

  if (freq === 'MENSUAL') {
    // Mensual: ciclo de 28 días. Corresponde si han pasado al menos 25 días
    if (diasDesdeUltima >= 25) {
      return {
        debeVisitar: true,
        diasDesdeUltima,
        explicacion: `Última visita hace ${diasDesdeUltima} días (cumple ciclo mensual)`
      };
    }
    return {
      debeVisitar: false,
      diasDesdeUltima,
      explicacion: `Última visita hace ${diasDesdeUltima} días (próxima estimada en ${28 - diasDesdeUltima} días)`
    };
  }

  // SEMANAL (o por defecto)
  // Ciclo de 7 días. Corresponde si pasaron al menos 5 días desde la última visita
  if (diasDesdeUltima >= 5) {
    return {
      debeVisitar: true,
      diasDesdeUltima,
      explicacion: `Última visita hace ${diasDesdeUltima} días (cumple ciclo semanal)`
    };
  }

  return {
    debeVisitar: false,
    diasDesdeUltima,
    explicacion: `Visitado hace solo ${diasDesdeUltima} días`
  };
}

export async function obtenerUltimasVisitasClientes(clienteIds: string[], antesDeFecha: Date) {
  if (clienteIds.length === 0) return new Map<string, Date>();

  const [paradasEntregadas, guiasEmitidas] = await Promise.all([
    prisma.paradaDia.findMany({
      where: {
        cliente_id: { in: clienteIds },
        estado: EstadoParada.ENTREGADO,
        ruta_dia: {
          fecha: { lt: antesDeFecha }
        }
      },
      select: {
        cliente_id: true,
        ruta_dia: { select: { fecha: true } }
      },
      orderBy: {
        ruta_dia: { fecha: 'desc' }
      }
    }),
    prisma.guiaDespacho.findMany({
      where: {
        cliente_id: { in: clienteIds },
        estado: { not: 'ANULADA' },
        fecha_emision: { lt: antesDeFecha }
      },
      select: {
        cliente_id: true,
        fecha_emision: true
      },
      orderBy: {
        fecha_emision: 'desc'
      }
    })
  ]);

  const map = new Map<string, Date>();

  for (const p of paradasEntregadas) {
    if (p.ruta_dia?.fecha && !map.has(p.cliente_id)) {
      map.set(p.cliente_id, new Date(p.ruta_dia.fecha));
    }
  }

  for (const g of guiasEmitidas) {
    if (g.fecha_emision) {
      const fGuia = new Date(g.fecha_emision);
      const actual = map.get(g.cliente_id);
      if (!actual || fGuia > actual) {
        map.set(g.cliente_id, fGuia);
      }
    }
  }

  return map;
}

/**
 * Genera las Hojas de Ruta del Día basándose en las Plantillas Base (RutaBase)
 * y filtrando automáticamente cada cliente según su frecuencia (SEMANAL, QUINCENAL, MENSUAL)
 * y la fecha de su última visita.
 */
export async function generarRutasDesdeBaseAction(fechaStr: string, diaSemana: DiaSemana) {
  try {
    const diaUpper = String(diaSemana || '').toUpperCase();
    const DIAS_VALIDOS_BASE: DiaSemana[] = [
      DiaSemana.LUNES,
      DiaSemana.MARTES,
      DiaSemana.MIERCOLES,
      DiaSemana.JUEVES,
      DiaSemana.VIERNES
    ];

    if (!DIAS_VALIDOS_BASE.includes(diaUpper as DiaSemana)) {
      return { 
        success: false, 
        message: `Los repartos regulares con ruta base operan de Lunes a Viernes. El día ${diaSemana} no tiene rutas base programadas. Puedes crear una "Ruta de Contención / Emergencia" con el botón correspondiente.` 
      };
    }

    const fechaDestino = new Date(`${fechaStr}T12:00:00.000Z`);
    const inicioDia = new Date(`${fechaStr}T00:00:00.000Z`);
    const finDia = new Date(`${fechaStr}T23:59:59.999Z`);

    const plantillasBase = await prisma.rutaBase.findMany({
      where: { dia_semana: diaUpper as DiaSemana }
    });

    if (plantillasBase.length === 0) {
      return { 
        success: false, 
        message: `No existen plantillas de rutas base configuradas para el día ${diaSemana}.` 
      };
    }

    let rutasCreadasContador = 0;
    let paradasAgregadasContador = 0;
    let clientesOmitidosContador = 0;
    const avisosVehiculo: string[] = [];

    for (const plantilla of plantillasBase) {
      let rutaDia = await prisma.rutaDia.findFirst({
        where: {
          fecha: { gte: inicioDia, lte: finDia },
          ruta_base_id: plantilla.id
        },
        include: { paradas: true }
      });

      // Validar regla: No se puede asignar el mismo vehículo a 2 rutas activas al mismo tiempo
      let vehiculoAUsar = plantilla.vehiculo_id;
      const conflictoVehiculo = await prisma.rutaDia.findFirst({
        where: {
          fecha: { gte: inicioDia, lte: finDia },
          estado: EstadoRuta.ACTIVA,
          vehiculo_id: vehiculoAUsar,
          NOT: rutaDia ? { id: rutaDia.id } : undefined,
        },
        include: { vehiculo: true, usuario: true, ruta_base: true }
      });

      if (conflictoVehiculo) {
        // Buscar un vehículo activo disponible que no esté en ninguna ruta activa hoy
        const rutasActivas = await prisma.rutaDia.findMany({
          where: {
            fecha: { gte: inicioDia, lte: finDia },
            estado: EstadoRuta.ACTIVA,
          },
          select: { vehiculo_id: true }
        });
        const ocupadosIds = new Set(rutasActivas.map(r => r.vehiculo_id));
        if (rutaDia) ocupadosIds.delete(rutaDia.vehiculo_id);

        const vehiculoLibre = await prisma.vehiculo.findFirst({
          where: {
            estado: EstadoVehiculo.ACTIVO,
            id: { notIn: Array.from(ocupadosIds) }
          }
        });

        if (vehiculoLibre) {
          vehiculoAUsar = vehiculoLibre.id;
          avisosVehiculo.push(`"${plantilla.nombre}": [${conflictoVehiculo.vehiculo.patente}] en uso en otra ruta activa hoy. Se asignó el libre [${vehiculoLibre.patente}].`);
        } else {
          avisosVehiculo.push(`"${plantilla.nombre}": Omitida porque [${conflictoVehiculo.vehiculo.patente}] ya está en uso hoy y no hay vehículos libres.`);
          continue;
        }
      }

      if (!rutaDia) {
        rutaDia = await prisma.rutaDia.create({
          data: {
            fecha: fechaDestino,
            estado: EstadoRuta.ACTIVA,
            usuario_id: plantilla.usuario_id,
            vehiculo_id: vehiculoAUsar,
            ruta_base_id: plantilla.id
          },
          include: { paradas: true }
        });
        rutasCreadasContador++;
      } else {
        if (rutaDia.usuario_id !== plantilla.usuario_id || rutaDia.vehiculo_id !== vehiculoAUsar) {
          rutaDia = await prisma.rutaDia.update({
            where: { id: rutaDia.id },
            data: {
              usuario_id: plantilla.usuario_id,
              vehiculo_id: vehiculoAUsar
            },
            include: { paradas: true }
          });
        }
      }

      const clientesFijos = await prisma.clienteRutaBase.findMany({
        where: { ruta_base_id: plantilla.id },
        include: {
          cliente: {
            include: { sector: { include: { comuna: true } } }
          }
        },
        orderBy: { orden: 'asc' }
      });

      const clientesIds = clientesFijos.map(cf => cf.cliente_id);
      const ultimasVisitasMap = await obtenerUltimasVisitasClientes(clientesIds, inicioDia);

      // 1. Si la ruta ya tenía paradas fijas pendientes, remover las que no correspondan hoy según su frecuencia o si son a pedido
      let paradasEliminadasContador = 0;
      for (const p of rutaDia.paradas || []) {
        if (!p.pedido_id && p.estado === EstadoParada.PENDIENTE) {
          const cf = clientesFijos.find(c => c.cliente_id === p.cliente_id);
          if (cf?.cliente) {
            const uv = ultimasVisitasMap.get(cf.cliente_id) || null;
            const ev = evaluarVisitaCliente(cf.cliente.frecuencia, fechaDestino, uv);
            if (!ev.debeVisitar) {
              await prisma.paradaDia.delete({ where: { id: p.id } });
              paradasEliminadasContador++;
            }
          }
        }
      }

      // Paradas vigentes después de depurar
      const paradasActuales = await prisma.paradaDia.findMany({
        where: { ruta_dia_id: rutaDia.id },
        orderBy: { orden: 'asc' }
      });
      const clientesExistentesIds = new Set(paradasActuales.map((p: any) => p.cliente_id));
      let proximoOrden = paradasActuales.length + 1;

      // 2. Agregar los clientes fijos que SÍ corresponden hoy y que aún no estén en la ruta
      for (const cf of clientesFijos) {
        if (!cf.cliente || cf.cliente.activo === false) continue;
        if (clientesExistentesIds.has(cf.cliente_id)) continue;

        const ultimaVisita = ultimasVisitasMap.get(cf.cliente_id) || null;
        const evaluacion = evaluarVisitaCliente(cf.cliente.frecuencia, fechaDestino, ultimaVisita);

        if (!evaluacion.debeVisitar) {
          clientesOmitidosContador++;
          continue;
        }

        await prisma.paradaDia.create({
          data: {
            ruta_dia_id: rutaDia.id,
            cliente_id: cf.cliente_id,
            orden: proximoOrden++,
            estado: EstadoParada.PENDIENTE,
            bot20_esperado: cf.bot20_default,
            bot10_esperado: cf.bot10_default,
            soda_esperada: cf.soda_default
          }
        });
        paradasAgregadasContador++;
      }

      // 3. Re-indexar orden correlativo si hubo cambios
      if (paradasEliminadasContador > 0) {
        const paradasFinales = await prisma.paradaDia.findMany({
          where: { ruta_dia_id: rutaDia.id },
          orderBy: { orden: 'asc' }
        });
        for (let i = 0; i < paradasFinales.length; i++) {
          if (paradasFinales[i].orden !== i + 1) {
            await prisma.paradaDia.update({
              where: { id: paradasFinales[i].id },
              data: { orden: i + 1 }
            });
          }
        }
      }
    }

    try {
      revalidatePath('/admin/rutas');
    } catch (_) {}

    let mensajeFinal = `Hojas de ruta sincronizadas: ${paradasAgregadasContador} cliente(s) agregados según frecuencia/última visita${clientesOmitidosContador > 0 ? ` (${clientesOmitidosContador} omitidos por ciclo no cumplido o a pedido)` : ''}.`;
    if (avisosVehiculo.length > 0) {
      mensajeFinal += ` Atención flota: ${avisosVehiculo.join(' ')}`;
    }

    return { 
      success: true, 
      message: mensajeFinal 
    };

  } catch (error: any) {
    console.error('Error en generarRutasDesdeBaseAction:', error);
    return { success: false, message: error.message || "Error al generar las hojas de ruta diarias." };
  }
}

/**
 * Crea una hoja de ruta vacía de contención o emergencia para un repartidor y vehículo.
 * Permite gestionar despachos extraordinarios, emergencias o salidas en días no habituales.
 */
export async function crearRutaContencionAction(datos: {
  fechaStr: string;
  nombre?: string;
  usuario_id: string;
  vehiculo_id: string;
}) {
  try {
    const { fechaStr, nombre, usuario_id, vehiculo_id } = datos;
    if (!fechaStr || !usuario_id || !vehiculo_id) {
      return { success: false, message: 'Faltan campos obligatorios (Fecha, Repartidor o Vehículo).' };
    }

    const fechaDestino = new Date(`${fechaStr}T12:00:00.000Z`);
    const inicioDia = new Date(`${fechaStr}T00:00:00.000Z`);
    const finDia = new Date(`${fechaStr}T23:59:59.999Z`);

    // Validar si el chofer ya tiene una ruta activa en este día
    const rutaExistente = await prisma.rutaDia.findFirst({
      where: {
        usuario_id,
        fecha: { gte: inicioDia, lte: finDia },
      },
      include: { ruta_base: true }
    });

    if (rutaExistente) {
      return {
        success: false,
        message: `El repartidor ya tiene una ruta activa para esta fecha (${rutaExistente.ruta_base?.nombre || 'Ruta'}). Puedes asignarle paradas directamente a esa ruta existente.`
      };
    }

    // Validar si el vehículo está en uso por otra ruta activa hoy
    const vehiculoEnUso = await prisma.rutaDia.findFirst({
      where: {
        vehiculo_id,
        fecha: { gte: inicioDia, lte: finDia },
        estado: EstadoRuta.ACTIVA,
      },
      include: { usuario: true, vehiculo: true }
    });

    if (vehiculoEnUso) {
      return {
        success: false,
        message: `El vehículo [${vehiculoEnUso.vehiculo?.patente || 'seleccionado'}] ya está en uso hoy por ${vehiculoEnUso.usuario?.nombre || 'otro chofer'}.`
      };
    }

    // Buscar o crear la plantilla RutaBase de contención para este chofer
    const nombreLimpio = nombre?.trim() || 'Ruta Emergencia / Contención';
    let rutaBase = await prisma.rutaBase.findFirst({
      where: {
        usuario_id,
        nombre: { contains: 'Contención' }
      }
    });

    if (!rutaBase) {
      rutaBase = await prisma.rutaBase.create({
        data: {
          nombre: `Contención - ${nombreLimpio}`,
          dia_semana: DiaSemana.LUNES,
          frecuencia: 'SEMANAL',
          usuario_id,
          vehiculo_id,
        }
      });
    }

    // Crear la hoja de ruta del día vacía
    const nuevaRutaDia = await prisma.rutaDia.create({
      data: {
        fecha: fechaDestino,
        estado: EstadoRuta.ACTIVA,
        usuario_id,
        vehiculo_id,
        ruta_base_id: rutaBase.id,
      },
      include: {
        usuario: true,
        vehiculo: true,
        ruta_base: true,
        paradas: true,
      }
    });

    revalidatePath('/admin/rutas');
    revalidatePath('/repartidor/ruta');

    return { 
      success: true, 
      message: `Ruta de contención creada con éxito para ${nuevaRutaDia.usuario?.nombre || 'el repartidor'}.`,
      ruta: nuevaRutaDia 
    };
  } catch (error: any) {
    console.error('Error al crear ruta de contención:', error);
    return { success: false, message: error.message || 'Error al crear la ruta de contención.' };
  }
}

/**
 * Obtiene el detalle completo para el Calendario de Visitas en una fecha determinada.
 * Si la hoja de ruta ya está generada, devuelve las paradas reales.
 * Si aún no está generada, proyecta qué clientes corresponde visitar según la RutaBase
 * del día de la semana, su frecuencia y su última visita.
 */
export async function obtenerDetalleVisitasFechaAction(fechaStr: string) {
  try {
    const inicioDia = new Date(`${fechaStr}T00:00:00.000Z`);
    const finDia = new Date(`${fechaStr}T23:59:59.999Z`);
    const fechaDestino = new Date(`${fechaStr}T12:00:00.000Z`);

    // 1. Revisar si ya existen rutas generadas para el día
    const rutasDia = await prisma.rutaDia.findMany({
      where: { fecha: { gte: inicioDia, lte: finDia } },
      include: {
        usuario: true,
        vehiculo: true,
        paradas: {
          orderBy: { orden: 'asc' },
          include: {
            cliente: { include: { sector: { include: { comuna: true } } } },
            pedido: { include: { items: { include: { producto: true } } } }
          }
        }
      }
    });

    if (rutasDia.length > 0) {
      const clienteIds = rutasDia.flatMap(r => r.paradas.map(p => p.cliente_id));
      const ultimasVisitas = await obtenerUltimasVisitasClientes(clienteIds, inicioDia);

      const rutasEnriquecidas = rutasDia.map(r => ({
        id: r.id,
        nombre: `Ruta ${r.vehiculo?.patente || ''} - ${r.usuario?.nombre || ''}`,
        es_proyectada: false,
        estado: r.estado,
        usuario: r.usuario,
        vehiculo: r.vehiculo,
        paradas: r.paradas.map(p => {
          const uv = ultimasVisitas.get(p.cliente_id) || null;
          const ev = evaluarVisitaCliente(p.cliente?.frecuencia, fechaDestino, uv);
          return {
            id: p.id,
            orden: p.orden,
            cliente_id: p.cliente_id,
            cliente: p.cliente,
            bot20_esperado: p.bot20_esperado,
            bot10_esperado: p.bot10_esperado,
            soda_esperada: p.soda_esperada,
            bot20_entregado: p.bot20_entregado,
            bot10_entregado: p.bot10_entregado,
            soda_entregada: p.soda_entregada,
            estado: p.estado,
            es_proyectada: false,
            ultima_visita: uv ? uv.toISOString() : null,
            info_visita: ev,
            pedido: p.pedido
          };
        })
      }));

      return {
        success: true,
        tipo: 'GENERADA' as const,
        rutas: rutasEnriquecidas,
        fechaStr
      };
    }

    // 2. Si no hay rutas generadas, proyectar según la RutaBase del día
    const numDia = new Date(`${fechaStr}T12:00:00.000Z`).getDay();
    const diasSemanaMap: (DiaSemana | null)[] = [
      null, // 0: Domingo
      DiaSemana.LUNES, // 1
      DiaSemana.MARTES, // 2
      DiaSemana.MIERCOLES, // 3
      DiaSemana.JUEVES, // 4
      DiaSemana.VIERNES, // 5
      null // 6: Sábado
    ];
    const diaSemana = diasSemanaMap[numDia];

    if (!diaSemana) {
      return {
        success: true,
        tipo: 'SIN_RUTA' as const,
        rutas: [],
        fechaStr,
        message: 'Fin de semana: No hay rutas comerciales programadas para este día.'
      };
    }

    const plantillasBase = await prisma.rutaBase.findMany({
      where: { dia_semana: diaSemana },
      include: {
        usuario: true,
        vehiculo: true,
        clientes: {
          orderBy: { orden: 'asc' },
          include: {
            cliente: { include: { sector: { include: { comuna: true } } } }
          }
        }
      }
    });

    if (plantillasBase.length === 0) {
      return {
        success: true,
        tipo: 'SIN_RUTA' as const,
        rutas: [],
        fechaStr,
        diaSemana,
        message: `No existen plantillas de Ruta Base configuradas para los días ${diaSemana}.`
      };
    }

    const allClienteIds = plantillasBase.flatMap(pb => pb.clientes.map(c => c.cliente_id));
    const ultimasVisitas = await obtenerUltimasVisitasClientes(allClienteIds, inicioDia);

    const rutasProyectadas = plantillasBase.map(pb => {
      const paradasProyectadas: any[] = [];
      let orden = 1;

      for (const cf of pb.clientes) {
        if (!cf.cliente || cf.cliente.activo === false) continue;
        const uv = ultimasVisitas.get(cf.cliente_id) || null;
        const ev = evaluarVisitaCliente(cf.cliente.frecuencia, fechaDestino, uv);

        if (ev.debeVisitar) {
          paradasProyectadas.push({
            id: `proy-${cf.id}`,
            orden: orden++,
            cliente_id: cf.cliente_id,
            cliente: cf.cliente,
            bot20_esperado: cf.bot20_default,
            bot10_esperado: cf.bot10_default,
            soda_esperada: cf.soda_default,
            bot20_entregado: 0,
            bot10_entregado: 0,
            soda_entregada: 0,
            estado: 'PENDIENTE',
            es_proyectada: true,
            ultima_visita: uv ? uv.toISOString() : null,
            info_visita: ev
          });
        }
      }

      return {
        id: `proy-${pb.id}`,
        nombre: pb.nombre,
        es_proyectada: true,
        ruta_base_id: pb.id,
        dia_semana: pb.dia_semana,
        usuario: pb.usuario,
        vehiculo: pb.vehiculo,
        paradas: paradasProyectadas
      };
    });

    return {
      success: true,
      tipo: 'PROYECTADA' as const,
      diaSemana,
      rutas: rutasProyectadas,
      fechaStr
    };

  } catch (error: any) {
    console.error('Error en obtenerDetalleVisitasFechaAction:', error);
    return { success: false, rutas: [], message: error.message || 'Error al obtener detalle de visitas.' };
  }
}

/**
 * Proporciona el resumen mensual de visitas para el Calendario (días con rutas generadas o proyectadas).
 */
export async function obtenerCalendarioVisitasMesAction(year: number, month: number) {
  try {
    const inicioMes = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const finMes = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // 1. Obtener todas las rutas ya generadas en el mes
    const rutasDelMes = await prisma.rutaDia.findMany({
      where: { fecha: { gte: inicioMes, lte: finMes } },
      include: {
        paradas: {
          include: {
            cliente: { select: { frecuencia: true } }
          }
        }
      }
    });

    // Mapear rutas generadas por YYYY-MM-DD
    const generadasPorFecha = new Map<string, any[]>();
    for (const r of rutasDelMes) {
      const d = new Date(r.fecha);
      const fStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      if (!generadasPorFecha.has(fStr)) generadasPorFecha.set(fStr, []);
      generadasPorFecha.get(fStr)!.push(r);
    }

    // 2. Obtener todas las rutas base para proyectar días sin rutas generadas
    const plantillasBase = await prisma.rutaBase.findMany({
      include: {
        clientes: {
          include: {
            cliente: { select: { id: true, frecuencia: true, activo: true } }
          }
        }
      }
    });

    const plantillasPorDia = new Map<string, any[]>();
    for (const pb of plantillasBase) {
      if (!plantillasPorDia.has(pb.dia_semana)) plantillasPorDia.set(pb.dia_semana, []);
      plantillasPorDia.get(pb.dia_semana)!.push(pb);
    }

    const allClienteIds = plantillasBase.flatMap(pb => pb.clientes.map(c => c.cliente_id));
    const ultimasVisitas = await obtenerUltimasVisitasClientes(allClienteIds, finMes);

    const diasSemanaMap: (DiaSemana | null)[] = [
      null, // 0: Dom
      DiaSemana.LUNES,
      DiaSemana.MARTES,
      DiaSemana.MIERCOLES,
      DiaSemana.JUEVES,
      DiaSemana.VIERNES,
      null // 6: Sáb
    ];

    const resumenDias: Record<string, {
      total: number;
      porFrecuencia: { SEMANAL: number; QUINCENAL: number; MENSUAL: number; A_PEDIDO: number };
      tieneRutaGenerada: boolean;
      tienePlantilla: boolean;
    }> = {};

    const diasEnMes = new Date(year, month, 0).getDate();

    for (let day = 1; day <= diasEnMes; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const fechaDia = new Date(`${dateStr}T12:00:00.000Z`);
      const rutasExistentes = generadasPorFecha.get(dateStr);

      if (rutasExistentes && rutasExistentes.length > 0) {
        const porFrecuencia = { SEMANAL: 0, QUINCENAL: 0, MENSUAL: 0, A_PEDIDO: 0 };
        let total = 0;

        for (const r of rutasExistentes) {
          for (const p of r.paradas || []) {
            const freq = (p.cliente?.frecuencia || 'SEMANAL') as keyof typeof porFrecuencia;
            if (porFrecuencia[freq] !== undefined) {
              porFrecuencia[freq]++;
            } else {
              porFrecuencia.SEMANAL++;
            }
            total++;
          }
        }

        resumenDias[dateStr] = {
          total,
          porFrecuencia,
          tieneRutaGenerada: true,
          tienePlantilla: true
        };
      } else {
        const diaSemana = diasSemanaMap[fechaDia.getDay()];
        if (!diaSemana) {
          resumenDias[dateStr] = {
            total: 0,
            porFrecuencia: { SEMANAL: 0, QUINCENAL: 0, MENSUAL: 0, A_PEDIDO: 0 },
            tieneRutaGenerada: false,
            tienePlantilla: false
          };
          continue;
        }

        const plantillas = plantillasPorDia.get(diaSemana) || [];
        if (plantillas.length === 0) {
          resumenDias[dateStr] = {
            total: 0,
            porFrecuencia: { SEMANAL: 0, QUINCENAL: 0, MENSUAL: 0, A_PEDIDO: 0 },
            tieneRutaGenerada: false,
            tienePlantilla: false
          };
          continue;
        }

        const porFrecuencia = { SEMANAL: 0, QUINCENAL: 0, MENSUAL: 0, A_PEDIDO: 0 };
        let total = 0;
        const clientesYaEvaluados = new Set<string>();

        for (const plantilla of plantillas) {
          for (const cf of plantilla.clientes || []) {
            if (!cf.cliente || cf.cliente.activo === false) continue;
            if (clientesYaEvaluados.has(cf.cliente_id)) continue;
            clientesYaEvaluados.add(cf.cliente_id);

            const uv = ultimasVisitas.get(cf.cliente_id) || null;
            const ev = evaluarVisitaCliente(cf.cliente.frecuencia, fechaDia, uv);

            if (ev.debeVisitar) {
              const freq = (cf.cliente.frecuencia || 'SEMANAL') as keyof typeof porFrecuencia;
              if (porFrecuencia[freq] !== undefined) {
                porFrecuencia[freq]++;
              } else {
                porFrecuencia.SEMANAL++;
              }
              total++;
            }
          }
        }

        resumenDias[dateStr] = {
          total,
          porFrecuencia,
          tieneRutaGenerada: false,
          tienePlantilla: true
        };
      }
    }

    return { success: true, resumenDias };

  } catch (error: any) {
    console.error('Error en obtenerCalendarioVisitasMesAction:', error);
    return { success: false, resumenDias: {}, message: error.message };
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
    const rutaExistente = await prisma.rutaBase.findFirst({
      where: {
        dia_semana: data.dia_semana,
        usuario_id: data.usuario_id
      },
      include: { usuario: true }
    });

    if (rutaExistente) {
      const nombreChofer = `${rutaExistente.usuario?.nombre || ''} ${rutaExistente.usuario?.apellido || ''}`.trim() || 'El repartidor';
      return {
        success: false,
        message: `${nombreChofer} ya tiene asignada la ruta "${rutaExistente.nombre}" el día ${data.dia_semana}. Cada repartidor solo puede tener una ruta base diaria.`
      };
    }

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

export type DesgloseEsperadoItem = {
  recargas: number;
  nuevos: number;
};

export type ActualizarEsperadoPayload = {
  bot20: DesgloseEsperadoItem;
  bot10: DesgloseEsperadoItem;
  soda: DesgloseEsperadoItem;
} | {
  bot20_esperado: number;
  bot10_esperado: number;
  soda_esperada: number;
};

/**
 * Actualiza la expectativa (esperado) de una parada puntual del día,
 * sincronizando tanto las cantidades totales en ParadaDia como el detalle
 * de productos (Recarga vs Nuevo) en los items del Pedido.
 */
export async function actualizarEsperadoParadaAction(
  paradaId: string,
  cantidades: ActualizarEsperadoPayload
) {
  try {
    const parada = await prisma.paradaDia.findUnique({
      where: { id: paradaId },
      include: {
        pedido: { include: { items: true } },
        ruta_dia: true
      }
    });
    if (!parada) return { success: false, message: 'Parada no encontrada.' };

    if (parada.estado !== EstadoParada.PENDIENTE) {
      return { success: false, message: 'Solo se puede editar la expectativa mientras la parada está pendiente.' };
    }

    let b20 = { recargas: 0, nuevos: 0, total: 0 };
    let b10 = { recargas: 0, nuevos: 0, total: 0 };
    let soda = { recargas: 0, nuevos: 0, total: 0 };

    if ('bot20' in (cantidades as any)) {
      const c = cantidades as { bot20: DesgloseEsperadoItem; bot10: DesgloseEsperadoItem; soda: DesgloseEsperadoItem };
      b20 = {
        recargas: Math.max(0, Number(c.bot20?.recargas) || 0),
        nuevos: Math.max(0, Number(c.bot20?.nuevos) || 0),
        total: Math.max(0, (Number(c.bot20?.recargas) || 0) + (Number(c.bot20?.nuevos) || 0))
      };
      b10 = {
        recargas: Math.max(0, Number(c.bot10?.recargas) || 0),
        nuevos: Math.max(0, Number(c.bot10?.nuevos) || 0),
        total: Math.max(0, (Number(c.bot10?.recargas) || 0) + (Number(c.bot10?.nuevos) || 0))
      };
      soda = {
        recargas: Math.max(0, Number(c.soda?.recargas) || 0),
        nuevos: Math.max(0, Number(c.soda?.nuevos) || 0),
        total: Math.max(0, (Number(c.soda?.recargas) || 0) + (Number(c.soda?.nuevos) || 0))
      };
    } else {
      const c = cantidades as any;
      b20 = { recargas: Math.max(0, Number(c.bot20_esperado) || 0), nuevos: 0, total: Math.max(0, Number(c.bot20_esperado) || 0) };
      b10 = { recargas: Math.max(0, Number(c.bot10_esperado) || 0), nuevos: 0, total: Math.max(0, Number(c.bot10_esperado) || 0) };
      soda = { recargas: Math.max(0, Number(c.soda_esperada) || 0), nuevos: 0, total: Math.max(0, Number(c.soda_esperada) || 0) };
    }

    const productos = await prisma.producto.findMany({
      where: { categoria: { in: ['BOTELLON20', 'BOTELLON10', 'SODA'] } }
    });
    const prodB20 = productos.find(p => p.categoria === 'BOTELLON20');
    const prodB10 = productos.find(p => p.categoria === 'BOTELLON10');
    const prodSoda = productos.find(p => p.categoria === 'SODA');

    await prisma.$transaction(async (tx) => {
      // 1. Actualizar expectativa en ParadaDia
      await tx.paradaDia.update({
        where: { id: paradaId },
        data: {
          bot20_esperado: b20.total,
          bot10_esperado: b10.total,
          soda_esperada: soda.total
        }
      });

      // 2. Si la parada no tiene pedido asociado pero tiene cantidades, crear el Pedido para registrar los items
      let pedidoId = parada.pedido_id;
      if (!pedidoId && (b20.total > 0 || b10.total > 0 || soda.total > 0)) {
        let userId = parada.ruta_dia?.usuario_id;
        try {
          const session = await auth.api.getSession({ headers: await headers() });
          if (session?.user?.id) userId = session.user.id;
        } catch (_) {}

        const nuevoPedido = await tx.pedido.create({
          data: {
            cliente_id: parada.cliente_id,
            fecha_solicitada: parada.ruta_dia?.fecha || new Date(),
            estado: EstadoPedido.ASIGNADO,
            canal_origen: 'LLAMADO',
            usuario_registro_id: userId,
            ruta_dia_id: parada.ruta_dia_id
          }
        });
        pedidoId = nuevoPedido.id;
        await tx.paradaDia.update({
          where: { id: parada.id },
          data: { pedido_id: pedidoId }
        });
      }

      // 3. Sincronizar los items del pedido
      if (pedidoId) {
        await tx.pedidoItem.deleteMany({
          where: { pedido_id: pedidoId }
        });

        const itemsNuevos: any[] = [];

        if (prodB20) {
          if (b20.recargas > 0) {
            itemsNuevos.push({
              pedido_id: pedidoId,
              producto_id: prodB20.id,
              tipo_transaccion: 'RECARGA',
              cantidad: b20.recargas,
              precio_historico: prodB20.precio_recarga ?? 3000
            });
          }
          if (b20.nuevos > 0) {
            itemsNuevos.push({
              pedido_id: pedidoId,
              producto_id: prodB20.id,
              tipo_transaccion: 'VENTA',
              cantidad: b20.nuevos,
              precio_historico: prodB20.precio_venta_nueva ?? 6000
            });
          }
        }

        if (prodB10) {
          if (b10.recargas > 0) {
            itemsNuevos.push({
              pedido_id: pedidoId,
              producto_id: prodB10.id,
              tipo_transaccion: 'RECARGA',
              cantidad: b10.recargas,
              precio_historico: prodB10.precio_recarga ?? 2000
            });
          }
          if (b10.nuevos > 0) {
            itemsNuevos.push({
              pedido_id: pedidoId,
              producto_id: prodB10.id,
              tipo_transaccion: 'VENTA',
              cantidad: b10.nuevos,
              precio_historico: prodB10.precio_venta_nueva ?? 4500
            });
          }
        }

        if (prodSoda) {
          if (soda.recargas > 0) {
            itemsNuevos.push({
              pedido_id: pedidoId,
              producto_id: prodSoda.id,
              tipo_transaccion: 'RECARGA',
              cantidad: soda.recargas,
              precio_historico: prodSoda.precio_recarga ?? 1500
            });
          }
          if (soda.nuevos > 0) {
            itemsNuevos.push({
              pedido_id: pedidoId,
              producto_id: prodSoda.id,
              tipo_transaccion: 'VENTA',
              cantidad: soda.nuevos,
              precio_historico: prodSoda.precio_venta_nueva ?? 1500
            });
          }
        }

        if (itemsNuevos.length > 0) {
          await tx.pedidoItem.createMany({
            data: itemsNuevos
          });
        }
      }
    });

    try {
      revalidatePath('/admin/rutas');
    } catch (_) {}

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

    // Cargar parada actual con relaciones para vincular pedido y método de pago
    const paradaActual = await prisma.paradaDia.findUnique({
      where: { id: paradaId },
      include: {
        pedido: { include: { guia: true, items: { include: { producto: true } } } },
        ruta_dia: true,
        cliente: true,
      }
    });

    // Cantidades al confirmar entrega
    if (datos.cantidades) {
      updateData.bot20_entregado = datos.cantidades.bot20 || 0;
      updateData.bot10_entregado = datos.cantidades.bot10 || 0;
      updateData.soda_entregada  = datos.cantidades.soda  || 0;
    } else if (datos.estado === 'ENTREGADO' && paradaActual) {
      let b20 = paradaActual.bot20_esperado || 0;
      let b10 = paradaActual.bot10_esperado || 0;
      let soda = paradaActual.soda_esperada || 0;
      if (paradaActual.pedido?.items?.length) {
        for (const it of paradaActual.pedido.items) {
          const cat = it.producto?.categoria;
          if (cat === 'BOTELLON20') b20 = Math.max(b20, it.cantidad);
          if (cat === 'BOTELLON10') b10 = Math.max(b10, it.cantidad);
          if (cat === 'SODA') soda = Math.max(soda, it.cantidad);
        }
      }
      updateData.bot20_entregado = b20;
      updateData.bot10_entregado = b10;
      updateData.soda_entregada  = soda;
    }

    // ── VINCULACIÓN DE MÉTODO DE PAGO ──
    if (datos.metodo_pago && paradaActual) {
      const metodoPagoValido = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'GUIA_MENSUAL'].includes(datos.metodo_pago)
        ? datos.metodo_pago
        : 'EFECTIVO';

      let targetPedidoId = paradaActual.pedido_id;

      if (!targetPedidoId) {
        // Si la parada no tenía pedido asociado, crearlo para persistir el método de pago
        const nuevoPedido = await prisma.pedido.create({
          data: {
            cliente_id: paradaActual.cliente_id,
            fecha_solicitada: paradaActual.ruta_dia?.fecha || new Date(),
            ruta_dia_id: paradaActual.ruta_dia_id,
            canal_origen: 'LLAMADO',
            estado: 'CONFIRMADO',
            usuario_registro_id: paradaActual.ruta_dia?.usuario_id || 'SISTEMA',
            metodo_pago_web: metodoPagoValido,
            pagado: metodoPagoValido !== 'GUIA_MENSUAL',
          }
        });
        targetPedidoId = nuevoPedido.id;
        updateData.pedido_id = targetPedidoId;
      } else {
        await prisma.pedido.update({
          where: { id: targetPedidoId },
          data: {
            metodo_pago_web: metodoPagoValido,
            pagado: metodoPagoValido !== 'GUIA_MENSUAL',
          }
        });
      }

      // Sincronizar estado de Guía de Despacho si estuviera asociada
      if (paradaActual.pedido?.guia) {
        const estadoGuia = metodoPagoValido === 'GUIA_MENSUAL'
          ? 'ENTREGADA_CREDITO'
          : metodoPagoValido === 'TARJETA'
          ? 'ENTREGADA_TARJETA'
          : metodoPagoValido === 'TRANSFERENCIA'
          ? 'ENTREGADA_TRANSFERENCIA'
          : 'ENTREGADA_EFECTIVO';

        await prisma.guiaDespacho.update({
          where: { id: paradaActual.pedido.guia.id },
          data: { estado: estadoGuia as any }
        });
      }

      // Asegurar items del pedido con las cantidades entregadas para cálculo de totales
      if (targetPedidoId && (updateData.bot20_entregado > 0 || updateData.bot10_entregado > 0 || updateData.soda_entregada > 0)) {
        const itemsExistentes = await prisma.pedidoItem.findMany({ where: { pedido_id: targetPedidoId } });
        if (itemsExistentes.length === 0) {
          const prodsCat = await prisma.producto.findMany({ where: { activo: true } });
          const p20 = prodsCat.find(p => p.categoria === 'BOTELLON20');
          const p10 = prodsCat.find(p => p.categoria === 'BOTELLON10');
          const pSoda = prodsCat.find(p => p.categoria === 'SODA');

          if (updateData.bot20_entregado > 0 && p20) {
            await prisma.pedidoItem.create({
              data: {
                pedido_id: targetPedidoId,
                producto_id: p20.id,
                tipo_transaccion: 'RECARGA',
                cantidad: updateData.bot20_entregado,
                cantidad_entregada: updateData.bot20_entregado,
                precio_historico: p20.precio_recarga ?? p20.precio_venta_nueva ?? 2500,
              }
            });
          }
          if (updateData.bot10_entregado > 0 && p10) {
            await prisma.pedidoItem.create({
              data: {
                pedido_id: targetPedidoId,
                producto_id: p10.id,
                tipo_transaccion: 'RECARGA',
                cantidad: updateData.bot10_entregado,
                cantidad_entregada: updateData.bot10_entregado,
                precio_historico: p10.precio_recarga ?? p10.precio_venta_nueva ?? 2000,
              }
            });
          }
          if (updateData.soda_entregada > 0 && pSoda) {
            await prisma.pedidoItem.create({
              data: {
                pedido_id: targetPedidoId,
                producto_id: pSoda.id,
                tipo_transaccion: 'RECARGA',
                cantidad: updateData.soda_entregada,
                cantidad_entregada: updateData.soda_entregada,
                precio_historico: pSoda.precio_recarga ?? pSoda.precio_venta_nueva ?? 1500,
              }
            });
          }
        }
      }
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
    revalidatePath('/admin/cuadratura');
    revalidatePath('/repartidor/ruta');
    revalidatePath('/repartidor');
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
    try {
      revalidatePath('/admin/rutas');
    } catch (_) {}
    return { success: true };
  } catch (error: any) {
    console.error('Error en eliminarRutaDiaAction:', error);
    return { success: false, message: error.message || 'Error al eliminar la hoja de ruta.' };
  }
}

/**
 * Elimina un pedido / parada individual de una Hoja de Ruta diaria.
 * Si la parada tenía un pedido registrado, elimina el pedido y sus items.
 * Reordena correlativamente las paradas restantes de la hoja.
 */
export async function eliminarParadaAction(paradaId: string) {
  try {
    const parada = await prisma.paradaDia.findUnique({
      where: { id: paradaId }
    });

    if (!parada) {
      return { success: false, message: 'La parada no existe o ya fue eliminada.' };
    }

    const rutaDiaId = parada.ruta_dia_id;
    const pedidoId = parada.pedido_id;

    await prisma.$transaction(async (tx) => {
      // 1. Eliminar la parada
      await tx.paradaDia.delete({
        where: { id: paradaId }
      });

      // 2. Si tenía un pedido asociado, eliminar items y el pedido
      if (pedidoId) {
        await tx.pedidoItem.deleteMany({
          where: { pedido_id: pedidoId }
        });
        await tx.pedido.delete({
          where: { id: pedidoId }
        });
      }

      // 3. Reordenar paradas restantes
      const paradasRestantes = await tx.paradaDia.findMany({
        where: { ruta_dia_id: rutaDiaId },
        orderBy: { orden: 'asc' }
      });

      for (let i = 0; i < paradasRestantes.length; i++) {
        if (paradasRestantes[i].orden !== i + 1) {
          await tx.paradaDia.update({
            where: { id: paradasRestantes[i].id },
            data: { orden: i + 1 }
          });
        }
      }
    });

    try {
      revalidatePath('/admin/rutas');
    } catch (_) {}

    return { success: true, message: 'Pedido quitado de la ruta correctamente.' };
  } catch (error: any) {
    console.error('Error en eliminarParadaAction:', error);
    return { success: false, message: error.message || 'Error al quitar el pedido.' };
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

/**
 * Reasigna el chofer o el vehículo de una Ruta del Día activa.
 * Aplica la regla: No se puede asignar el mismo vehículo a 2 rutas que estén activas al mismo tiempo.
 */
export async function reasignarChoferVehiculoRutaAction(
  rutaDiaId: string,
  nuevoUsuarioId: string,
  nuevoVehiculoId: string
) {
  try {
    const rutaActual = await prisma.rutaDia.findUnique({
      where: { id: rutaDiaId },
      include: {
        vehiculo: true,
        usuario: true,
        ruta_base: true
      }
    });

    if (!rutaActual) {
      return { success: false, message: 'La hoja de ruta no fue encontrada.' };
    }

    const inicioDia = new Date(rutaActual.fecha);
    inicioDia.setUTCHours(0, 0, 0, 0);
    const finDia = new Date(rutaActual.fecha);
    finDia.setUTCHours(23, 59, 59, 999);

    // 1. Validar que el vehículo no esté asignado a otra ruta activa al mismo tiempo
    const conflictoVehiculo = await prisma.rutaDia.findFirst({
      where: {
        id: { not: rutaDiaId },
        vehiculo_id: nuevoVehiculoId,
        estado: EstadoRuta.ACTIVA,
        fecha: { gte: inicioDia, lte: finDia }
      },
      include: {
        vehiculo: true,
        usuario: true,
        ruta_base: true
      }
    });

    if (conflictoVehiculo) {
      return {
        success: false,
        message: `No se puede asignar el vehículo [${conflictoVehiculo.vehiculo.patente}]: ya está asignado a otra ruta activa de hoy (${conflictoVehiculo.ruta_base?.nombre || 'Ruta'} - Conductor: ${conflictoVehiculo.usuario.nombre} ${conflictoVehiculo.usuario.apellido || ''}). No se permite asignar el mismo vehículo a 2 rutas activas al mismo tiempo.`
      };
    }

    // 2. Validar que el chofer no esté asignado a otra ruta activa al mismo tiempo
    const conflictoChofer = await prisma.rutaDia.findFirst({
      where: {
        id: { not: rutaDiaId },
        usuario_id: nuevoUsuarioId,
        estado: EstadoRuta.ACTIVA,
        fecha: { gte: inicioDia, lte: finDia }
      },
      include: {
        vehiculo: true,
        usuario: true,
        ruta_base: true
      }
    });

    if (conflictoChofer) {
      return {
        success: false,
        message: `El repartidor ${conflictoChofer.usuario.nombre} ${conflictoChofer.usuario.apellido || ''} ya tiene asignada otra ruta activa en esta jornada (${conflictoChofer.ruta_base?.nombre || 'Ruta'} - Camión: ${conflictoChofer.vehiculo.patente}).`
      };
    }

    // 3. Actualizar la ruta
    await prisma.rutaDia.update({
      where: { id: rutaDiaId },
      data: {
        usuario_id: nuevoUsuarioId,
        vehiculo_id: nuevoVehiculoId
      }
    });

    revalidatePath('/admin/rutas');
    revalidatePath('/repartidor');
    revalidatePath('/repartidor/ruta');

    return { 
      success: true, 
      message: 'Conductor y vehículo reasignados correctamente para la jornada.' 
    };
  } catch (error: any) {
    console.error('Error en reasignarChoferVehiculoRutaAction:', error);
    return { success: false, message: error.message || 'Error al reasignar la ruta.' };
  }
}