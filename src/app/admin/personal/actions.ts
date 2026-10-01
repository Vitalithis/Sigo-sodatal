'use server';

import { prisma } from '../../../../lib/prisma';
import { Rol } from '../../../../lib/prisma/generated';
import { revalidatePath } from 'next/cache';

export interface ComisionConfig {
  tipo: 'MONTO_UNIDAD' | 'PORCENTAJE' | 'PARADA';
  montoUnidad20L: number;
  montoUnidad10L: number;
  montoSoda: number;
  porcentajeVenta: number;
  montoParada: number;
}

// 1. Obtener todo el personal (repartidores y staff) con sus configuraciones de comisiones
export async function obtenerPersonalAction() {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        vehiculo: true,
        rutas_dia: {
          take: 10,
          orderBy: { fecha: 'desc' },
          include: {
            paradas: {
              include: {
                pedido: {
                  include: { items: { include: { producto: true } } }
                }
              }
            }
          }
        }
      }
    });

    // Cargar configuraciones de comisiones guardadas en la tabla Configuracion
    const configsDb = await prisma.configuracion.findMany({
      where: { clave: { startsWith: 'comision_config_' } }
    });

    const configsMap: Record<string, ComisionConfig> = {};
    configsDb.forEach(cfg => {
      try {
        const uId = cfg.clave.replace('comision_config_', '');
        configsMap[uId] = JSON.parse(cfg.valor);
      } catch (e) {
        // Fallback si falla el parseo
      }
    });

    return { success: true, usuarios, configsMap };
  } catch (error: any) {
    console.error('Error al obtener personal:', error);
    return { success: false, usuarios: [], configsMap: {}, message: error.message };
  }
}

// 2. Guardar o actualizar la regla de comisión de un repartidor
export async function guardarConfiguracionComisionAction(usuarioId: string, config: ComisionConfig) {
  try {
    const clave = `comision_config_${usuarioId}`;
    const valorJson = JSON.stringify(config);

    await prisma.configuracion.upsert({
      where: { clave },
      update: { valor: valorJson },
      create: { clave, valor: valorJson }
    });

    // Actualizar flag de recibe_comision en el usuario
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { recibe_comision: true }
    });

    revalidatePath('/admin/personal');
    return { success: true };
  } catch (error: any) {
    console.error('Error al guardar comisión:', error);
    return { success: false, message: error.message || 'Error al guardar la regla de comisión.' };
  }
}

// 3. Calcular comisiones y resumen de entregas en un rango de fechas
export async function calcularComisionesPersonalAction(
  usuarioId: string,
  fechaInicioStr: string,
  fechaFinStr: string
) {
  try {
    const fechaInicio = new Date(`${fechaInicioStr}T00:00:00.000Z`);
    const fechaFin = new Date(`${fechaFinStr}T23:59:59.999Z`);

    // Regla de comisión asignada
    const cfgDb = await prisma.configuracion.findUnique({
      where: { clave: `comision_config_${usuarioId}` }
    });

    const config: ComisionConfig = cfgDb?.valor
      ? JSON.parse(cfgDb.valor)
      : {
          tipo: 'MONTO_UNIDAD',
          montoUnidad20L: 300,
          montoUnidad10L: 200,
          montoSoda: 150,
          porcentajeVenta: 5,
          montoParada: 1500
        };

    // Consultar rutas completadas en el período
    const rutas = await prisma.rutaDia.findMany({
      where: {
        usuario_id: usuarioId,
        fecha: { gte: fechaInicio, lte: fechaFin }
      },
      orderBy: { fecha: 'desc' },
      include: {
        ruta_base: true,
        paradas: {
          include: {
            cliente: true,
            pedido: {
              include: {
                items: { include: { producto: true } }
              }
            }
          }
        }
      }
    });

    // Consultar también guías de despacho emitidas en el período por este repartidor
    const guias = await prisma.guiaDespacho.findMany({
      where: {
        usuario_repartidor_id: usuarioId,
        fecha_emision: { gte: fechaInicio, lte: fechaFin },
        estado: { not: 'ANULADA' }
      },
      include: {
        cliente: true,
        items: { include: { producto: true } }
      }
    });

    let totalParadasEntregadas = 0;
    let totalBot20L = 0;
    let totalBot10L = 0;
    let totalSoda = 0;
    let totalVentasMonto = 0;

    const desgloseDias: any[] = [];

    rutas.forEach(r => {
      const paradasEntregadas = r.paradas.filter(p => p.estado === 'ENTREGADO');
      let bot20Ruta = 0;
      let bot10Ruta = 0;
      let sodaRuta = 0;
      let ventasRuta = 0;

      paradasEntregadas.forEach(p => {
        if (p.pedido?.items) {
          p.pedido.items.forEach(it => {
            const cant = it.cantidad || 0;
            const sub = cant * (it.precio_historico || 0);
            ventasRuta += sub;

            const cat = it.producto?.categoria;
            if (cat === 'BOTELLON20') bot20Ruta += cant;
            else if (cat === 'BOTELLON10') bot10Ruta += cant;
            else if (cat === 'SODA') sodaRuta += cant;
            else bot20Ruta += cant; // Fallback
          });
        }
      });

      // Cálculo de comisión para esta ruta
      let comisionRuta = 0;
      if (config.tipo === 'MONTO_UNIDAD') {
        comisionRuta = (bot20Ruta * config.montoUnidad20L) + (bot10Ruta * config.montoUnidad10L) + (sodaRuta * config.montoSoda);
      } else if (config.tipo === 'PORCENTAJE') {
        comisionRuta = ventasRuta * (config.porcentajeVenta / 100);
      } else if (config.tipo === 'PARADA') {
        comisionRuta = paradasEntregadas.length * config.montoParada;
      }

      totalParadasEntregadas += paradasEntregadas.length;
      totalBot20L += bot20Ruta;
      totalBot10L += bot10Ruta;
      totalSoda += sodaRuta;
      totalVentasMonto += ventasRuta;

      desgloseDias.push({
        id: r.id,
        fecha: r.fecha.toISOString().split('T')[0],
        nombreRuta: r.ruta_base?.nombre || r.ruta_base_id,
        paradasTotales: r.paradas.length,
        paradasEntregadas: paradasEntregadas.length,
        bot20L: bot20Ruta,
        bot10L: bot10Ruta,
        soda: sodaRuta,
        ventasMonto: ventasRuta,
        comisionCalculada: Math.round(comisionRuta)
      });
    });

    // Sumar comisión total consolidada
    let comisionTotalGeneral = 0;
    if (config.tipo === 'MONTO_UNIDAD') {
      comisionTotalGeneral = (totalBot20L * config.montoUnidad20L) + (totalBot10L * config.montoUnidad10L) + (totalSoda * config.montoSoda);
    } else if (config.tipo === 'PORCENTAJE') {
      comisionTotalGeneral = totalVentasMonto * (config.porcentajeVenta / 100);
    } else if (config.tipo === 'PARADA') {
      comisionTotalGeneral = totalParadasEntregadas * config.montoParada;
    }

    return {
      success: true,
      config,
      resumen: {
        totalRutas: rutas.length,
        totalParadasEntregadas,
        totalBot20L,
        totalBot10L,
        totalSoda,
        totalVentasMonto: Math.round(totalVentasMonto),
        comisionTotalCalculada: Math.round(comisionTotalGeneral)
      },
      desgloseDias
    };
  } catch (error: any) {
    console.error('Error al calcular comisiones:', error);
    return { success: false, message: error.message || 'Error al procesar el cálculo de comisiones.' };
  }
}
