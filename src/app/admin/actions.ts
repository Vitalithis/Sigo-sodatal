'use server';

import { prisma } from '@/lib/prisma';

export async function obtenerMetricasDashboardAction() {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);

    const [
      totalPedidosHoy,
      pedidosEntregadosHoy,
      vehiculosActivos,
      vehiculosTotales,
      alertasActivas,
      productosParaEvaluar,
      ingresosHoyAgg,
      tuboActivo
    ] = await Promise.all([
      // Total Pedidos solicitados para hoy
      prisma.pedido.count({
        where: { fecha_solicitada: { gte: hoy, lt: mañana } }
      }),
      // Pedidos ya entregados hoy
      prisma.pedido.count({
        where: {
          fecha_solicitada: { gte: hoy, lt: mañana },
          estado: 'ENTREGADO'
        }
      }),
      // Vehículos operativos
      prisma.vehiculo.count({ where: { estado: 'ACTIVO' } }),
      // Total de flota registrada
      prisma.vehiculo.count(),
      // Alertas preventivas de vehículos vigentes
      prisma.alertaVehiculo.count({ where: { activa: true } }),
      // Evaluación de quiebre de stock
      prisma.producto.findMany({
        where: { activo: true },
        select: {
          stock_minimo: true,
          stock_fabrica: { select: { cantidad: true } }
        }
      }),
      // Ingresos líquidos de cuadraturas cerradas
      prisma.cuadratura.aggregate({
        where: {
          fecha: { gte: hoy, lt: mañana },
          estado: 'CERRADA'
        },
        _sum: { 
          total_efectivo: true,
          total_tarjeta: true,
          total_transferencia: true
        }
      }),
      // Estado del tubo de CO2
      prisma.tuboCO2.findFirst({
        where: { activo: true }
      })
    ]);

    // Filtrar en memoria los productos que están bajo o igual al stock mínimo requerido
    const productosBajoStockCount = productosParaEvaluar.filter(p => {
      const cantidadActual = p.stock_fabrica?.cantidad ?? 0;
      return cantidadActual <= p.stock_minimo;
    }).length;

    // Asignar ingresos sumando solo el dinero real ingresado
    const ingresosHoy = 
      (ingresosHoyAgg._sum.total_efectivo ?? 0) + 
      (ingresosHoyAgg._sum.total_tarjeta ?? 0) + 
      (ingresosHoyAgg._sum.total_transferencia ?? 0);

    // Cálculo matemático de rendimiento de CO2
    let co2 = { porcentaje: 0, kg_restantes: 0, rendimiento_estimado: 0 };
    
    if (tuboActivo) {
      const kgRestantes = tuboActivo.peso_kg - tuboActivo.kg_consumidos;
      const porcentaje = (kgRestantes / tuboActivo.peso_kg) * 100;
      
      co2 = {
        porcentaje: Math.max(0, porcentaje),
        kg_restantes: Math.max(0, kgRestantes),
        rendimiento_estimado: tuboActivo.rendimiento_estimado
      };
    }

    return {
      success: true,
      data: {
        pedidos: {
          total: totalPedidosHoy,
          entregados: pedidosEntregadosHoy,
          porcentaje: totalPedidosHoy > 0 ? Math.round((pedidosEntregadosHoy / totalPedidosHoy) * 100) : 0
        },
        flota: {
          activos: vehiculosActivos,
          totales: vehiculosTotales
        },
        alertas: alertasActivas,
        ingresos: ingresosHoy,
        productosCriticos: productosBajoStockCount,
        co2
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al cargar el dashboard';
    return { success: false, message: `No se pudieron calcular las métricas operativas: ${message}` };
  }
}