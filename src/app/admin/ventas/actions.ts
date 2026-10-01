'use server';

import { prisma } from '../../../../lib/prisma';

export interface SegmentoVentas {
  // Ventas nuevas
  bot20L: number;
  bot10L: number;
  soda: number;
  // Recargas
  recargasBot20L: number;
  recargasBot10L: number;
  recargasSoda: number;
  monto: number;
}

export interface VentaResumenRepartidor {
  repartidorId: string;
  repartidorNombre: string;
  vehiculoPatente?: string;
  particular: SegmentoVentas;
  empresa: SegmentoVentas;
  total: SegmentoVentas;
  montoTotal: number;
  totalGuias: number;
}

export interface MesData {
  mes: number;         // 0-11
  anio: number;
  label: string;       // "Enero 2025"
  repartidores: VentaResumenRepartidor[];
  globalParticular: SegmentoVentas;
  globalEmpresa: SegmentoVentas;
  globalTotal: SegmentoVentas;
  totalGuias: number;
  montoTotal: number;
}

const MES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function emptySegmento(): SegmentoVentas {
  return { bot20L: 0, bot10L: 0, soda: 0, recargasBot20L: 0, recargasBot10L: 0, recargasSoda: 0, monto: 0 };
}

function sumarSegmento(a: SegmentoVentas, b: SegmentoVentas): SegmentoVentas {
  return {
    bot20L: a.bot20L + b.bot20L,
    bot10L: a.bot10L + b.bot10L,
    soda: a.soda + b.soda,
    recargasBot20L: a.recargasBot20L + b.recargasBot20L,
    recargasBot10L: a.recargasBot10L + b.recargasBot10L,
    recargasSoda: a.recargasSoda + b.recargasSoda,
    monto: a.monto + b.monto,
  };
}

function procesarItem(
  seg: SegmentoVentas,
  cat: string,
  esRecarga: boolean,
  cant: number,
  sub: number
) {
  seg.monto += sub;
  if (esRecarga) {
    if (cat === 'BOTELLON20') seg.recargasBot20L += cant;
    else if (cat === 'BOTELLON10') seg.recargasBot10L += cant;
    else if (cat === 'SODA') seg.recargasSoda += cant;
  } else {
    if (cat === 'BOTELLON20') seg.bot20L += cant;
    else if (cat === 'BOTELLON10') seg.bot10L += cant;
    else if (cat === 'SODA') seg.soda += cant;
  }
}

export async function obtenerVentasPorAnioAction(anio: number) {
  try {
    const fechaInicio = new Date(`${anio}-01-01T00:00:00.000Z`);
    const fechaFin = new Date(`${anio}-12-31T23:59:59.999Z`);

    const guias = await prisma.guiaDespacho.findMany({
      where: {
        fecha_emision: { gte: fechaInicio, lte: fechaFin },
        estado: { not: 'ANULADA' },
      },
      include: {
        cliente: true,
        usuario_repartidor: {
          include: { vehiculo: true },
        },
        items: {
          include: { producto: true },
        },
      },
      orderBy: { fecha_emision: 'asc' },
    });

    // Agrupar por mes
    const mesesMap: Record<number, {
      repMap: Record<string, VentaResumenRepartidor>;
      totalGuias: number;
    }> = {};

    for (const g of guias) {
      // Usar fecha local del servidor (UTC offset ajuste)
      const fechaEmision = new Date(g.fecha_emision);
      const mes = fechaEmision.getUTCMonth(); // 0-11

      if (!mesesMap[mes]) {
        mesesMap[mes] = { repMap: {}, totalGuias: 0 };
      }
      mesesMap[mes].totalGuias++;

      const uid = g.usuario_repartidor_id;
      const u = g.usuario_repartidor;
      const esEmpresa = g.cliente.tipo === 'EMPRESA';

      if (!mesesMap[mes].repMap[uid]) {
        mesesMap[mes].repMap[uid] = {
          repartidorId: uid,
          repartidorNombre: `${u.nombre}${u.apellido ? ' ' + u.apellido : ''}`,
          vehiculoPatente: u.vehiculo?.patente,
          particular: emptySegmento(),
          empresa: emptySegmento(),
          total: emptySegmento(),
          montoTotal: 0,
          totalGuias: 0,
        };
      }

      const rep = mesesMap[mes].repMap[uid];
      rep.totalGuias++;

      for (const item of g.items) {
        const cat = item.producto.categoria;
        const esRecarga = item.tipo_transaccion === 'RECARGA';
        const cant = item.cantidad;
        const sub = item.subtotal;

        // Segmento por tipo de cliente
        const segCliente = esEmpresa ? rep.empresa : rep.particular;
        procesarItem(segCliente, cat, esRecarga, cant, sub);

        // Total del repartidor
        procesarItem(rep.total, cat, esRecarga, cant, sub);
        rep.montoTotal += sub;
      }
    }

    // Construir array de meses ordenados
    const mesesData: MesData[] = [];
    const mesesConDatos = Object.keys(mesesMap).map(Number).sort((a, b) => a - b);

    for (const mes of mesesConDatos) {
      const { repMap, totalGuias } = mesesMap[mes];
      const repartidores = Object.values(repMap).sort((a, b) => b.montoTotal - a.montoTotal);

      let globalParticular = emptySegmento();
      let globalEmpresa = emptySegmento();
      let globalTotal = emptySegmento();
      let montoTotal = 0;

      for (const r of repartidores) {
        globalParticular = sumarSegmento(globalParticular, r.particular);
        globalEmpresa = sumarSegmento(globalEmpresa, r.empresa);
        globalTotal = sumarSegmento(globalTotal, r.total);
        montoTotal += r.montoTotal;
      }

      mesesData.push({
        mes,
        anio,
        label: `${MES_NOMBRES[mes]} ${anio}`,
        repartidores,
        globalParticular,
        globalEmpresa,
        globalTotal,
        totalGuias,
        montoTotal,
      });
    }

    // Calcular también el acumulado anual
    let anualParticular = emptySegmento();
    let anualEmpresa = emptySegmento();
    let anualTotal = emptySegmento();
    let anualMonto = 0;
    let anualGuias = 0;

    for (const m of mesesData) {
      anualParticular = sumarSegmento(anualParticular, m.globalParticular);
      anualEmpresa = sumarSegmento(anualEmpresa, m.globalEmpresa);
      anualTotal = sumarSegmento(anualTotal, m.globalTotal);
      anualMonto += m.montoTotal;
      anualGuias += m.totalGuias;
    }

    return {
      success: true,
      mesesData,
      anual: {
        globalParticular: anualParticular,
        globalEmpresa: anualEmpresa,
        globalTotal: anualTotal,
        montoTotal: anualMonto,
        totalGuias: anualGuias,
      },
    };
  } catch (error: any) {
    console.error('Error al obtener ventas por año:', error);
    return {
      success: false,
      message: error.message || 'Error al obtener ventas.',
      mesesData: [],
      anual: null,
    };
  }
}
