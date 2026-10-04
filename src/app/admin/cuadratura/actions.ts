'use server';
import { auth } from '@/lib/auth';
import { prisma } from '@lib/prisma';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { TipoTransaccion, TipoCliente, MetodoPago } from '@lib/prisma/generated';
import { esFinDeSemana, getHoyHabilStr } from '@/lib/fechas';
import { getUsuarioActual } from '@/lib/auth-session';

// ----------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------
export interface ItemSalidaInput {
  producto_id: string;
  cantidad: number;
}

export interface SalidaInput {
  usuario_id: string;
  fecha: string; 
  items: ItemSalidaInput[];
  km_inicial?: number;
  combustible?: {
    tipo_combustible: string;
    monto: number;
    litros?: number;
    numero_factura?: string;
    ruta_factura?: string;
  } | null;
  otros_accesorios?: string; // ej: "2 Bombas USB, 1 Soporte"
  es_nueva_vuelta?: boolean;
  numero_vuelta?: number;
}

export interface ItemVentaInput {
  producto_id: string;
  tipo_transaccion: TipoTransaccion;
  tipo_cliente: TipoCliente;
  cantidad: number;
  metodo_pago: MetodoPago;
  guia_id?: string | null;
}

export interface ItemRetornoInput {
  producto_id: string;
  cantidad: number;
}

export interface BotellonesVaciosInput {
  cantidad_total: number;
  cantidad_danados: number;
  danados_detalle?: Record<string, number>; // producto_id -> cantidad dañada especificada
}

export interface GastoInput {
  tipo: string;
  monto: number;
  descripcion?: string;
}

export interface CierreCuadraturaInput {
  cuadratura_id: string;
  ventas?: ItemVentaInput[];
  retorno: ItemRetornoInput[];
  botellones_vacios: BotellonesVaciosInput;
  gastos?: GastoInput[];
  monto_bencina?: number;
  combustible?: {
    tipo_combustible: string;
    monto: number;
    litros?: number;
    numero_factura?: string;
    ruta_factura?: string;
  } | null;
  km_final: number; // OBLIGATORIO AL CIERRE
  total_efectivo?: number;
  total_tarjeta?: number;
  total_transferencia?: number;
  otros_retorno?: string; // ej: "Volvió 1 bomba USB, 1 entregada a cliente"
  mantener_abierta?: boolean; // si se agrega otra vuelta inmediatamente
  numero_vuelta?: number;
  permitir_ajuste?: boolean; // Permite cuadrar al día siguiente si fue auto-cerrada
}

export interface DescargaYCargaVueltaInput {
  cuadratura_id: string;
  numero_vuelta_actual: number;
  numero_nueva_vuelta: number;

  // 1. Descarga (vuelta que termina)
  km_llegada: number;
  retorno_llenos: { producto_id: string; cantidad: number }[];
  botellones_vacios?: {
    cantidad_total: number;
    cantidad_danados: number;
    danados_detalle?: Record<string, number>;
  };
  efectivo_rendido?: number;
  otros_retorno?: string;

  // 2. Carga (vuelta que comienza)
  items_salida: { producto_id: string; cantidad: number }[];
  otros_salida?: string;
  combustible?: {
    tipo_combustible: string;
    monto: number;
    litros?: number;
    numero_factura?: string;
  } | null;
}

// ----------------------------------------------------------------
// Helper Fechas
// ----------------------------------------------------------------
function getFechaLocalServidor(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getRangoDia(fechaStr: string) {
  const [yyyy, mm, dd] = fechaStr.split('-').map(Number);
  
  // Rango del día según horario local (00:00:00 a 23:59:59.999 local):
  // En Chile (UTC-3), las 23:21 se guardan como 02:21Z del día siguiente en la base de datos.
  const inicioLocal = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
  const finLocal = new Date(yyyy, mm - 1, dd, 23, 59, 59, 999);

  // Fecha normalizada exacta a medianoche UTC para registros con fecha fija (ej. cuadratura.fecha)
  const fechaNormalizada = new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0, 0));
  const fechaNormalizadaFin = new Date(Date.UTC(yyyy, mm - 1, dd, 23, 59, 59, 999));

  // Rango unificado que abarca desde la medianoche UTC hasta las 23:59:59 del horario local (02:59:59Z del día siguiente en Chile)
  const inicio = new Date(Math.min(inicioLocal.getTime(), fechaNormalizada.getTime()));
  const fin = new Date(Math.max(finLocal.getTime(), fechaNormalizadaFin.getTime()));

  return { inicio, fin, fechaNormalizada, inicioLocal, finLocal };
}


// ----------------------------------------------------------------
// Auto-Cierre al Final del Día / Jornada
// ----------------------------------------------------------------
async function autoCerrarCuadraturaIndividual(cuadraturaId: string) {
  try {
    const cuadratura = await prisma.cuadratura.findUnique({
      where: { id: cuadraturaId },
      include: {
        salida: { include: { producto: true } },
        retorno: true,
        botellones_vacios: true,
        usuario: { include: { vehiculo: true } }
      }
    });

    if (!cuadratura || cuadratura.estado === 'CERRADA') return;

    const fechaStr = cuadratura.fecha.toISOString().split('T')[0];
    const { inicio, fin } = getRangoDia(fechaStr);

    const ruta = await prisma.rutaDia.findFirst({
      where: {
        usuario_id: cuadratura.usuario_id,
        fecha: { gte: inicio, lte: fin }
      },
      include: {
        vehiculo: true,
        paradas: {
          include: {
            cliente: true,
            pedido: { include: { items: { include: { producto: true } } } }
          }
        }
      }
    });

    const paradas = ruta?.paradas || [];
    const paradasEntregadas = paradas.filter(p => p.estado === 'ENTREGADO');

    const entregasPorProd: Record<string, number> = {};
    let vaciosEsperados = 0;
    let totalEfectivo = 0;
    let totalTarjeta = 0;
    let totalTransferencia = 0;
    let totalGuiaMensual = 0;

    for (const p of paradasEntregadas) {
      const b20 = p.bot20_entregado || 0;
      const b10 = p.bot10_entregado || 0;
      const soda = p.soda_entregada || 0;
      vaciosEsperados += (b20 + b10);

      const metodo = p.pedido?.metodo_pago_web || (p.cliente?.modalidad_pago === 'MENSUAL' ? 'GUIA_MENSUAL' : 'EFECTIVO');

      let subtotal = 0;
      if (p.pedido && p.pedido.items?.length > 0) {
        for (const it of p.pedido.items) {
          const precio = it.tipo_transaccion === 'RECARGA'
            ? (it.producto?.precio_recarga ?? it.producto?.precio_venta_nueva ?? 0)
            : (it.producto?.precio_venta_nueva ?? 0);
          const cant = it.cantidad_entregada ?? it.cantidad ?? 0;
          subtotal += precio * cant;
          if (it.producto_id) {
            entregasPorProd[it.producto_id] = (entregasPorProd[it.producto_id] || 0) + cant;
          }
        }
      } else {
        subtotal += (b20 * 2500) + (b10 * 2000) + (soda * 1500);
      }

      if (metodo === 'EFECTIVO') totalEfectivo += subtotal;
      else if (metodo === 'TARJETA') totalTarjeta += subtotal;
      else if (metodo === 'TRANSFERENCIA') totalTransferencia += subtotal;
      else totalGuiaMensual += subtotal;
    }

    // Retorno automático estimado: lo que no se entregó vuelve al camión
    for (const s of cuadratura.salida) {
      const entregado = entregasPorProd[s.producto_id] || 0;
      const retLleno = Math.max(0, s.cantidad - entregado);
      const existente = cuadratura.retorno.find(r => r.producto_id === s.producto_id);
      if (existente) {
        await prisma.cuadraturaRetorno.update({
          where: { id: existente.id },
          data: { cantidad: retLleno }
        });
      } else {
        await prisma.cuadraturaRetorno.create({
          data: {
            cuadratura_id: cuadratura.id,
            producto_id: s.producto_id,
            cantidad: retLleno
          }
        });
      }
    }

    // Vacíos automáticos esperados
    if (cuadratura.botellones_vacios?.length > 0) {
      await prisma.botellonVacio.update({
        where: { id: cuadratura.botellones_vacios[0].id },
        data: { cantidad_total: vaciosEsperados, cantidad_danados: 0 }
      });
    } else {
      await prisma.botellonVacio.create({
        data: {
          cuadratura_id: cuadratura.id,
          cantidad_total: vaciosEsperados,
          cantidad_danados: 0
        }
      });
    }

    // Km final sugerido
    const kmIni = cuadratura.km_inicial || 0;
    const kmVehiculo = cuadratura.usuario?.vehiculo?.kilometraje_actual || 0;
    const kmFinal = kmVehiculo >= kmIni ? kmVehiculo : (kmIni > 0 ? kmIni + 25 : kmIni);

    await prisma.cuadratura.update({
      where: { id: cuadratura.id },
      data: {
        estado: 'CERRADA',
        motivo_reapertura: 'AUTO_CIERRE_FIN_JORNADA',
        km_final: kmFinal,
        total_efectivo: totalEfectivo,
        total_tarjeta: totalTarjeta,
        total_transferencia: totalTransferencia,
        total_guia_mensual: totalGuiaMensual
      }
    });

    if (ruta && ruta.estado !== 'CERRADA') {
      await prisma.rutaDia.update({
        where: { id: ruta.id },
        data: { estado: 'CERRADA' }
      });
    }
  } catch (e) {
    console.error('Error cerrando cuadratura automática:', e);
  }
}

export async function autoCerrarCuadraturasPasadas() {
  try {
    const ahora = new Date();
    // Obtener la fecha local del dispositivo/servidor (evita desfase UTC de 3 horas antes de medianoche)
    const hoyStr = getFechaLocalServidor(ahora);
    const { inicio: hoyInicio } = getRangoDia(hoyStr);

    // 1. Restaurar automáticamente cuadraturas de la jornada de hoy que se hayan auto-cerrado erróneamente
    await prisma.cuadratura.updateMany({
      where: {
        estado: 'CERRADA',
        motivo_reapertura: 'AUTO_CIERRE_FIN_JORNADA',
        fecha: { gte: hoyInicio }
      },
      data: {
        estado: 'ABIERTA',
        motivo_reapertura: null
      }
    });

    // 2. Auto-cerrar únicamente cuadraturas de jornadas estrictamente pasadas
    const abiertas = await prisma.cuadratura.findMany({
      where: {
        estado: 'ABIERTA',
        fecha: { lt: hoyInicio }
      },
      select: { id: true }
    });

    for (const c of abiertas) {
      await autoCerrarCuadraturaIndividual(c.id);
    }
  } catch (e) {
    console.error('Error en autoCerrarCuadraturasPasadas:', e);
  }
}

export async function cerrarJornadaCuadraturasAction(fechaStr?: string) {
  try {
    let where: any = { estado: 'ABIERTA' };
    if (fechaStr) {
      const { inicio, fin } = getRangoDia(fechaStr);
      where.fecha = { gte: inicio, lte: fin };
    }

    const abiertas = await prisma.cuadratura.findMany({
      where,
      select: { id: true }
    });

    for (const c of abiertas) {
      await autoCerrarCuadraturaIndividual(c.id);
    }

    revalidatePath('/admin/cuadratura');
    return { success: true, count: abiertas.length };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ----------------------------------------------------------------
// Consultas Generales
// ----------------------------------------------------------------
export async function obtenerCuadraturasAction(desde?: string, hasta?: string, usuario_id?: string) {
  try {
    // 1. Auto-cerrar cuadraturas de jornadas anteriores que quedaron abiertas
    await autoCerrarCuadraturasPasadas();

    const where: any = {};
    if (usuario_id) where.usuario_id = usuario_id;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = new Date(`${desde}T00:00:00.000Z`);
      if (hasta) where.fecha.lte = new Date(`${hasta}T23:59:59.999Z`);
    }

    const catalogoProductos = await prisma.producto.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    });

    const cuadraturas = await prisma.cuadratura.findMany({
      where,
      include: {
        usuario: { 
          select: { 
            id: true, 
            nombre: true, 
            apellido: true, 
            rol: true,
            vehiculo: { select: { id: true, patente: true, marca: true, modelo: true, kilometraje_actual: true } }
          } 
        },
        salida: { include: { producto: true } },
        retorno: { include: { producto: true } },
        botellones_vacios: true,
        gastos: true,
        _count: { select: { ventas: true, retorno: true, gastos: true } },
      },
      orderBy: { fecha: 'desc' },
      take: 60,
    });

    // Enriquecer cada cuadratura con los cálculos de ruta para comparación instantánea
    const cuadraturasEnriquecidas = await Promise.all(
      cuadraturas.map(async (c) => {
        const fechaStr = c.fecha.toISOString().split('T')[0];
        const { inicio, fin } = getRangoDia(fechaStr);

        const ruta = await prisma.rutaDia.findFirst({
          where: {
            usuario_id: c.usuario_id,
            fecha: { gte: inicio, lte: fin },
          },
          include: {
            vehiculo: true,
            paradas: {
              select: {
                id: true,
                estado: true,
                bot20_esperado: true,
                bot10_esperado: true,
                soda_esperada: true,
                bot20_entregado: true,
                bot10_entregado: true,
                soda_entregada: true,
                cliente: {
                  select: { modalidad_pago: true, tipo: true }
                },
                pedido: {
                  include: {
                    items: { include: { producto: true } }
                  }
                }
              }
            }
          }
        });

        // Totales de salida y retorno
        const totalSalida = c.salida.reduce((acc, s) => acc + (s.cantidad || 0), 0);
        const totalRetorno = c.retorno.reduce((acc, r) => acc + (r.cantidad || 0), 0);

        // Totales de la ruta completada
        const paradas = ruta?.paradas || [];
        const paradasTotales = paradas.length;
        const paradasEntregadas = paradas.filter(p => p.estado === 'ENTREGADO').length;

        let bot20Entregado = 0;
        let bot10Entregado = 0;
        let sodaEntregada = 0;
        let vaciosEsperados = 0;
        let totalEfectivoEsperado = 0;
        let totalTarjetaEsperado = 0;
        let totalTransferenciaEsperado = 0;
        let totalCreditoEsperado = 0;
        const entregasPorProducto: Record<string, number> = {};

        for (const p of paradas) {
          if (p.estado === 'ENTREGADO') {
            const b20 = p.bot20_entregado || 0;
            const b10 = p.bot10_entregado || 0;
            const soda = p.soda_entregada || 0;

            bot20Entregado += b20;
            bot10Entregado += b10;
            sodaEntregada += soda;

            // Por defecto en agua de mesa purificada, cada botellón 20L o 10L entregado es una recarga con retorno de vacío
            vaciosEsperados += (b20 + b10);

            // Calcular montos de la parada para control de caja
            let subtotalParada = 0;
            if (p.pedido && p.pedido.items?.length > 0) {
              for (const item of p.pedido.items) {
                const precio = item.tipo_transaccion === 'RECARGA'
                  ? (item.producto?.precio_recarga ?? item.producto?.precio_venta_nueva ?? 0)
                  : (item.producto?.precio_venta_nueva ?? 0);
                const cant = item.cantidad_entregada ?? item.cantidad ?? 0;
                subtotalParada += precio * cant;

                if (item.producto_id) {
                  entregasPorProducto[item.producto_id] = (entregasPorProducto[item.producto_id] || 0) + cant;
                }
              }
            } else {
              subtotalParada += (b20 * 2500) + (b10 * 2000) + (soda * 1500);
              const p20 = catalogoProductos.find(x => x.categoria === 'BOTELLON20');
              const p10 = catalogoProductos.find(x => x.categoria === 'BOTELLON10');
              const pSoda = catalogoProductos.find(x => x.categoria === 'SODA');
              if (p20 && b20 > 0) entregasPorProducto[p20.id] = (entregasPorProducto[p20.id] || 0) + b20;
              if (p10 && b10 > 0) entregasPorProducto[p10.id] = (entregasPorProducto[p10.id] || 0) + b10;
              if (pSoda && soda > 0) entregasPorProducto[pSoda.id] = (entregasPorProducto[pSoda.id] || 0) + soda;
            }

            const metodo = p.pedido?.metodo_pago_web || 
              (p.cliente?.modalidad_pago === 'MENSUAL' ? 'GUIA_MENSUAL' : 'EFECTIVO');

            if (metodo === 'EFECTIVO') totalEfectivoEsperado += subtotalParada;
            else if (metodo === 'TARJETA') totalTarjetaEsperado += subtotalParada;
            else if (metodo === 'TRANSFERENCIA') totalTransferenciaEsperado += subtotalParada;
            else totalCreditoEsperado += subtotalParada;
          }
        }

        const totalEntregadosRuta = bot20Entregado + bot10Entregado + sodaEntregada;
        const totalARendirEsperado = totalEfectivoEsperado + totalTarjetaEsperado + totalTransferenciaEsperado;
        const totalRendidoChofer = (c.total_efectivo || 0) + (c.total_tarjeta || 0) + (c.total_transferencia || 0);
        const diferenciaCaja = totalRendidoChofer - totalARendirEsperado;
        const cajaCuadrada = c.estado === 'CERRADA' ? (Math.abs(diferenciaCaja) < 1) : false;

        // Conciliación:
        // Diferencia llenos = Salida - (Entregados + Retorno)
        const diferenciaLlenos = totalSalida - (totalEntregadosRuta + totalRetorno);

        // Envases vacíos
        const vaciosRecibidos = c.botellones_vacios?.[0]?.cantidad_total || 0;
        const vaciosDanados = c.botellones_vacios?.[0]?.cantidad_danados || 0;
        const diferenciaVacios = vaciosRecibidos - vaciosEsperados;

        // Kilometraje y Combustible
        const kmRecorridos = (c.km_inicial !== null && c.km_final !== null) 
          ? (c.km_final - c.km_inicial) 
          : null;

        const gastoCombustible = c.gastos
          .filter(g => g.tipo === 'COMBUSTIBLE')
          .reduce((acc, g) => acc + g.monto, 0) || (c.monto_bencina || 0);

        const vehiculo = ruta?.vehiculo || c.usuario?.vehiculo || null;

        // Estado del Cuadre Físico
        let estadoCuadre: 'CUADRADA' | 'DESCUADRE_LLENOS' | 'DESCUADRE_VACIOS' | 'DESCUADRE_TOTAL' | 'EN_RUTA' = 'EN_RUTA';
        if (c.estado === 'CERRADA') {
          if (diferenciaLlenos === 0 && diferenciaVacios === 0) {
            estadoCuadre = 'CUADRADA';
          } else if (diferenciaLlenos !== 0 && diferenciaVacios !== 0) {
            estadoCuadre = 'DESCUADRE_TOTAL';
          } else if (diferenciaLlenos !== 0) {
            estadoCuadre = 'DESCUADRE_LLENOS';
          } else {
            estadoCuadre = 'DESCUADRE_VACIOS';
          }
        }

        // Matriz completa de productos (lo que salió vs lo que entró)
        const productosMatriz = catalogoProductos.map(prod => {
          const salidaItem = c.salida?.find((s: any) => s.producto_id === prod.id);
          const retornoItem = c.retorno?.find((r: any) => r.producto_id === prod.id);
          const cantSalida = salidaItem?.cantidad || 0;
          const cantEntregada = entregasPorProducto[prod.id] || 0;
          const cantRetorno = retornoItem?.cantidad || 0;
          const esperadoRetorno = Math.max(0, cantSalida - cantEntregada);
          const diferencia = cantSalida - (cantEntregada + cantRetorno);

          return {
            producto_id: prod.id,
            nombre: prod.nombre,
            categoria: prod.categoria,
            salida: cantSalida,
            entregado: cantEntregada,
            retorno: cantRetorno,
            esperado_retorno: esperadoRetorno,
            diferencia: diferencia,
          };
        }).filter(p => p.salida > 0 || p.entregado > 0 || p.retorno > 0);

        // Parsear registro de vueltas del día
        const gastosVueltas = (c.gastos || [])
          .filter(g => g.tipo === 'VUELTA_REGISTRO')
          .sort((a, b) => (a.monto || 0) - (b.monto || 0));

        const vueltas = gastosVueltas.map(g => {
          try { return { id: g.id, ...JSON.parse(g.descripcion || '{}') }; } catch { return null; }
        }).filter(Boolean);

        const totalVueltas = vueltas.length > 0 ? vueltas.length : 1;
        const vueltaActiva = vueltas.find((v: any) => v.estado === 'EN_RUTA') || null;

        return {
          ...c,
          vehiculo,
          resumen_ruta: {
            paradas_totales: paradasTotales,
            paradas_entregadas: paradasEntregadas,
            bot20_entregado: bot20Entregado,
            bot10_entregado: bot10Entregado,
            soda_entregada: sodaEntregada,
            total_entregados: totalEntregadosRuta,
            vacios_esperados: vaciosEsperados,
            vacios_recibidos: vaciosRecibidos,
            vacios_danados: vaciosDanados,
            total_salida: totalSalida,
            total_retorno: totalRetorno,
            diferencia_llenos: diferenciaLlenos,
            diferencia_vacios: diferenciaVacios,
            km_recorridos: kmRecorridos,
            gasto_combustible: gastoCombustible,
            estado_cuadre: estadoCuadre,
            total_vueltas: totalVueltas,
            vueltas: vueltas,
            vuelta_activa: vueltaActiva,
            es_auto_cerrada: Boolean(c.motivo_reapertura?.includes('AUTO_CIERRE')),
            productos_matriz: productosMatriz.length > 0 ? productosMatriz : catalogoProductos.slice(0, 4).map(p => ({
              producto_id: p.id,
              nombre: p.nombre,
              categoria: p.categoria,
              salida: 0,
              entregado: 0,
              retorno: 0,
              esperado_retorno: 0,
              diferencia: 0,
            })),
            financiero: {
              total_efectivo_esperado: totalEfectivoEsperado,
              total_tarjeta_esperado: totalTarjetaEsperado,
              total_transferencia_esperado: totalTransferenciaEsperado,
              total_credito_esperado: totalCreditoEsperado,
              total_a_rendir_esperado: totalARendirEsperado,
              total_rendido_chofer: totalRendidoChofer,
              diferencia_caja: diferenciaCaja,
              caja_cuadrada: cajaCuadrada,
            }
          }
        };
      })
    );

    return { success: true, cuadraturas: cuadraturasEnriquecidas };
  } catch (error: any) {
    return { success: false, cuadraturas: [], message: error.message };
  }
}

export async function obtenerCuadraturaDetalleAction(id: string) {
  try {
    const cuadratura = await prisma.cuadratura.findUnique({
      where: { id },
      include: {
        usuario: { 
          select: { 
            id: true, 
            nombre: true, 
            apellido: true, 
            rol: true, 
            recibe_comision: true,
            vehiculo: true
          } 
        },
        salida: { include: { producto: true } },
        ventas: { include: { producto: true, guia: { select: { numero_correlativo: true } } } },
        retorno: { include: { producto: true } },
        botellones_vacios: true,
        gastos: true,
      },
    });
    if (!cuadratura) return { success: false, message: 'La cuadratura no existe.' };

    const fechaStr = cuadratura.fecha.toISOString().split('T')[0];
    const { inicio, fin } = getRangoDia(fechaStr);

    const ruta = await prisma.rutaDia.findFirst({
      where: {
        usuario_id: cuadratura.usuario_id,
        fecha: { gte: inicio, lte: fin },
      },
      include: {
        vehiculo: true,
        paradas: {
          include: {
            cliente: { select: { nombre: true, direccion: true, tipo: true } },
            pedido: { include: { items: { include: { producto: true } } } }
          },
          orderBy: { orden: 'asc' }
        }
      }
    });

    // Parsear vueltas de la cuadratura
    const gastosVueltas = (cuadratura.gastos || [])
      .filter(g => g.tipo === 'VUELTA_REGISTRO')
      .sort((a, b) => (a.monto || 0) - (b.monto || 0));

    const vueltas = gastosVueltas.map(g => {
      try { return { id: g.id, ...JSON.parse(g.descripcion || '{}') }; } catch { return null; }
    }).filter(Boolean);

    return { success: true, cuadratura, ruta, vueltas };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function obtenerRepartidoresCuadraturaAction() {
  try {
    const repartidores = await prisma.usuario.findMany({
      where: { rol: 'REPARTIDOR', activo: true },
      orderBy: { nombre: 'asc' },
      select: { 
        id: true, 
        nombre: true, 
        apellido: true, 
        recibe_comision: true,
        vehiculo: { select: { id: true, patente: true, marca: true, modelo: true, kilometraje_actual: true } }
      },
    });
    return { success: true, repartidores };
  } catch (error: any) {
    return { success: false, repartidores: [], message: error.message };
  }
}

export async function obtenerProductosCuadraturaAction() {
  try {
    const productos = await prisma.producto.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
    return { success: true, productos };
  } catch (error: any) {
    return { success: false, productos: [], message: error.message };
  }
}

export async function obtenerCuadraturaDelDiaAction(usuario_id: string, fecha: string) {
  try {
    const { inicio, fin } = getRangoDia(fecha);
    const cuadratura = await prisma.cuadratura.findFirst({
      where: { 
        usuario_id, 
        fecha: { gte: inicio, lte: fin } 
      },
      include: {
        salida: { include: { producto: true } },
        ventas: { include: { producto: true, guia: { select: { numero_correlativo: true } } } },
        retorno: { include: { producto: true } },
        botellones_vacios: true,
        gastos: true,
      },
    });
    return { success: true, cuadratura };
  } catch (error: any) {
    return { success: false, cuadratura: null, message: error.message };
  }
}

export async function obtenerGuiasRepartidorDiaAction(usuario_id: string, fecha: string) {
  try {
    if (!usuario_id || !fecha) return { success: true, guias: [] };
    const { inicio, fin } = getRangoDia(fecha);
    const guias = await prisma.guiaDespacho.findMany({
      where: {
        usuario_repartidor_id: usuario_id,
        estado: { not: 'ANULADA' },
        fecha_emision: { gte: inicio, lte: fin },
      },
      include: {
        cliente: { select: { nombre: true } },
        items: { include: { producto: true } },
      },
      orderBy: { numero_correlativo: 'asc' },
    });
    return { success: true, guias };
  } catch (error: any) {
    return { success: false, guias: [], message: error.message };
  }
}

// ----------------------------------------------------------------
// NUEVA CONSULTA: Datos Previos para Registrar Salida
// ----------------------------------------------------------------
export async function obtenerDatosSalidaRepartidorAction(usuario_id: string, fecha: string) {
  try {
    if (!usuario_id || !fecha) return { success: false, message: 'Faltan parámetros.' };

    const { inicio, fin } = getRangoDia(fecha);

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuario_id },
      include: { vehiculo: true },
    });

    const ruta = await prisma.rutaDia.findFirst({
      where: {
        usuario_id,
        fecha: { gte: inicio, lte: fin },
      },
      include: {
        vehiculo: true,
        paradas: {
          include: {
            pedido: { include: { items: { include: { producto: true } } } }
          }
        }
      }
    });

    const vehiculo = ruta?.vehiculo || usuario?.vehiculo || null;

    // Calcular expectativa de carga según la ruta del día
    let sugerido20 = 0;
    let sugerido10 = 0;
    let sugeridoSoda = 0;

    if (ruta && ruta.paradas) {
      for (const p of ruta.paradas) {
        sugerido20 += p.bot20_esperado || 0;
        sugerido10 += p.bot10_esperado || 0;
        sugeridoSoda += p.soda_esperada || 0;

        if (p.pedido?.items) {
          for (const it of p.pedido.items) {
            const cat = it.producto?.categoria;
            if (cat === 'BOTELLON20' && !p.bot20_esperado) sugerido20 += it.cantidad;
            if (cat === 'BOTELLON10' && !p.bot10_esperado) sugerido10 += it.cantidad;
            if (cat === 'SODA' && !p.soda_esperada) sugeridoSoda += it.cantidad;
          }
        }
      }
    }

    // Cuadratura existente si ya abrió el día
    const cuadratura = await prisma.cuadratura.findFirst({
      where: { usuario_id, fecha: { gte: inicio, lte: fin } },
      include: { salida: { include: { producto: true } }, gastos: true }
    });

    const gastoSalidaAcc = cuadratura?.gastos?.find(g => g.tipo === 'ACCESORIOS_SALIDA');

    // Analizar vueltas registradas
    const gastosVueltas = (cuadratura?.gastos || [])
      .filter(g => g.tipo === 'VUELTA_REGISTRO')
      .sort((a, b) => (a.monto || 0) - (b.monto || 0));

    const vueltas = gastosVueltas.map(g => {
      try { return { id: g.id, ...JSON.parse(g.descripcion || '{}') }; } catch { return null; }
    }).filter(Boolean);

    const proximaVuelta = vueltas.length + 1;
    const ultimaVuelta = vueltas.length > 0 ? vueltas[vueltas.length - 1] : null;

    // Si ya hubo una vuelta previa recepcionada, el odómetro sugerido es el de su llegada
    const kmSugerido = ultimaVuelta?.km_llegada || cuadratura?.km_final || vehiculo?.kilometraje_actual || cuadratura?.km_inicial || 0;

    return {
      success: true,
      vehiculo,
      km_sugerido: kmSugerido,
      expectativa_ruta: {
        bot20: sugerido20,
        bot10: sugerido10,
        soda: sugeridoSoda,
        total_paradas: ruta?.paradas?.length || 0,
      },
      cuadratura_existente: cuadratura,
      otros_accesorios: gastoSalidaAcc?.descripcion || '',
      vueltas,
      proxima_vuelta: proximaVuelta,
      ultima_vuelta: ultimaVuelta,
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ----------------------------------------------------------------
// NUEVA CONSULTA: Resumen Completo de Ruta y Salida para Recepción/Cierre
// ----------------------------------------------------------------
export async function obtenerResumenRutaRepartidorAction(usuario_id: string, fecha: string) {
  try {
    if (!usuario_id || !fecha) return { success: false, message: 'Faltan parámetros.' };

    const { inicio, fin } = getRangoDia(fecha);

    // 1. Cuadratura (Salida, km_inicial, etc.)
    const cuadratura = await prisma.cuadratura.findFirst({
      where: { usuario_id, fecha: { gte: inicio, lte: fin } },
      include: {
        salida: { include: { producto: true } },
        retorno: { include: { producto: true } },
        gastos: true,
        botellones_vacios: true,
        usuario: { include: { vehiculo: true } }
      }
    });

    // 2. Ruta y entregas
    const ruta = await prisma.rutaDia.findFirst({
      where: { usuario_id, fecha: { gte: inicio, lte: fin } },
      include: {
        vehiculo: true,
        paradas: {
          include: {
            cliente: true,
            pedido: { include: { items: { include: { producto: true } } } }
          },
          orderBy: { orden: 'asc' }
        }
      }
    });

    const vehiculo = ruta?.vehiculo || cuadratura?.usuario?.vehiculo || null;
    const paradas = ruta?.paradas || [];
    const totalParadas = paradas.length;
    const entregadas = paradas.filter(p => p.estado === 'ENTREGADO');
    const pendientes = paradas.filter(p => p.estado === 'PENDIENTE');
    const postergadas = paradas.filter(p => p.estado === 'POSTERGADO');
    const fallidas = paradas.filter(p => p.estado === 'FALLIDO');

    // Desglose de productos entregados en ruta
    let bot20Entregado = 0;
    let bot10Entregado = 0;
    let sodaEntregada = 0;
    let vaciosEsperados = 0;
    let totalEfectivoEstimado = 0;
    let totalTarjetaEstimado = 0;
    let totalTransferenciaEstimado = 0;
    let totalCreditoEstimado = 0;
    const entregasPorProd: Record<string, number> = {};

    // Productos del catálogo para precios
    const catalogo = await prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } });
    const prod20 = catalogo.find(p => p.categoria === 'BOTELLON20');
    const prod10 = catalogo.find(p => p.categoria === 'BOTELLON10');
    const prodSoda = catalogo.find(p => p.categoria === 'SODA');

    for (const p of entregadas) {
      const b20 = p.bot20_entregado || 0;
      const b10 = p.bot10_entregado || 0;
      const soda = p.soda_entregada || 0;

      bot20Entregado += b20;
      bot10Entregado += b10;
      sodaEntregada += soda;

      // Por cada recarga entregada, se espera retorno de 1 envase vacío
      vaciosEsperados += (b20 + b10);

      // Calcular montos de la parada
      let subtotalParada = 0;
      if (p.pedido && p.pedido.items?.length > 0) {
        for (const item of p.pedido.items) {
          const precio = item.tipo_transaccion === 'RECARGA' 
            ? (item.producto?.precio_recarga ?? item.producto?.precio_venta_nueva ?? 0)
            : (item.producto?.precio_venta_nueva ?? 0);
          const cant = item.cantidad_entregada ?? item.cantidad ?? 0;
          subtotalParada += precio * cant;
          if (item.producto_id) {
            entregasPorProd[item.producto_id] = (entregasPorProd[item.producto_id] || 0) + cant;
          }
        }
      } else {
        const precio20 = prod20?.precio_recarga ?? prod20?.precio_venta_nueva ?? 2500;
        const precio10 = prod10?.precio_recarga ?? prod10?.precio_venta_nueva ?? 2000;
        const precioSoda = prodSoda?.precio_recarga ?? prodSoda?.precio_venta_nueva ?? 1500;
        subtotalParada += (b20 * precio20) + (b10 * precio10) + (soda * precioSoda);
        if (prod20 && b20 > 0) entregasPorProd[prod20.id] = (entregasPorProd[prod20.id] || 0) + b20;
        if (prod10 && b10 > 0) entregasPorProd[prod10.id] = (entregasPorProd[prod10.id] || 0) + b10;
        if (prodSoda && soda > 0) entregasPorProd[prodSoda.id] = (entregasPorProd[prodSoda.id] || 0) + soda;
      }

      const metodo = p.pedido?.metodo_pago_web || 
        (p.cliente?.modalidad_pago === 'MENSUAL' ? 'GUIA_MENSUAL' : 'EFECTIVO');

      if (metodo === 'EFECTIVO') totalEfectivoEstimado += subtotalParada;
      else if (metodo === 'TARJETA') totalTarjetaEstimado += subtotalParada;
      else if (metodo === 'TRANSFERENCIA') totalTransferenciaEstimado += subtotalParada;
      else totalCreditoEstimado += subtotalParada;
    }

    // Matriz completa de productos (lo que salió vs lo que entró)
    const productosMatriz = catalogo.map(prod => {
      const salidaItem = cuadratura?.salida?.find((s: any) => s.producto_id === prod.id);
      const retornoItem = cuadratura?.retorno?.find((r: any) => r.producto_id === prod.id);
      const cantSalida = salidaItem?.cantidad || 0;
      const cantEntregada = entregasPorProd[prod.id] || 0;
      const cantRetorno = retornoItem?.cantidad || 0;
      const esperadoRetorno = Math.max(0, cantSalida - cantEntregada);
      const diferencia = cantSalida - (cantEntregada + cantRetorno);

      return {
        producto_id: prod.id,
        nombre: prod.nombre,
        categoria: prod.categoria,
        salida: cantSalida,
        entregado: cantEntregada,
        retorno: cantRetorno,
        esperado_retorno: esperadoRetorno,
        diferencia: diferencia,
      };
    }).filter(p => p.salida > 0 || p.entregado > 0 || p.retorno > 0);

    // Combustible registrado en Salida si existe
    const gastoComb = cuadratura?.gastos?.find(g => g.tipo === 'COMBUSTIBLE');
    const montoCombustible = gastoComb?.monto || cuadratura?.monto_bencina || 0;

    // Accesorios u observaciones registradas
    const gastoSalidaAcc = cuadratura?.gastos?.find(g => g.tipo === 'ACCESORIOS_SALIDA');
    const gastoRetornoAcc = cuadratura?.gastos?.find(g => g.tipo === 'ACCESORIOS_RETORNO');

    return {
      success: true,
      cuadratura,
      ruta: {
        id: ruta?.id,
        paradas_totales: totalParadas,
        paradas_entregadas: entregadas.length,
        paradas_pendientes: pendientes.length,
        paradas_postergadas: postergadas.length,
        paradas_fallidas: fallidas.length,
        porcentaje: totalParadas > 0 ? Math.round((entregadas.length / totalParadas) * 100) : 0,
      },
      vehiculo: {
        id: vehiculo?.id,
        patente: vehiculo?.patente || 'S/A',
        marca: vehiculo?.marca || '',
        modelo: vehiculo?.modelo || '',
        kilometraje_actual: vehiculo?.kilometraje_actual || cuadratura?.km_final || cuadratura?.km_inicial || 0,
      },
      cantidades_ruta: {
        bot20_entregado: bot20Entregado,
        bot10_entregado: bot10Entregado,
        soda_entregada: sodaEntregada,
        total_entregados: bot20Entregado + bot10Entregado + sodaEntregada,
        vacios_esperados: vaciosEsperados,
        entregas_por_producto: entregasPorProd,
      },
      productos_matriz: productosMatriz,
      financiero_ruta: {
        total_efectivo: totalEfectivoEstimado,
        total_tarjeta: totalTarjetaEstimado,
        total_transferencia: totalTransferenciaEstimado,
        total_credito: totalCreditoEstimado,
        total_a_rendir: totalEfectivoEstimado + totalTarjetaEstimado + totalTransferenciaEstimado,
        total_ventas: totalEfectivoEstimado + totalTarjetaEstimado + totalTransferenciaEstimado + totalCreditoEstimado,
      },
      combustible: {
        monto: montoCombustible,
        descripcion: gastoComb?.descripcion || null,
      },
      accesorios: {
        salida: gastoSalidaAcc?.descripcion || null,
        retorno: gastoRetornoAcc?.descripcion || null,
      },
      vueltas: (() => {
        const gV = (cuadratura?.gastos || [])
          .filter(g => g.tipo === 'VUELTA_REGISTRO')
          .sort((a, b) => (a.monto || 0) - (b.monto || 0));
        return gV.map(g => {
          try { return { id: g.id, ...JSON.parse(g.descripcion || '{}') }; } catch { return null; }
        }).filter(Boolean);
      })(),
      vuelta_activa: (() => {
        const gV = (cuadratura?.gastos || [])
          .filter(g => g.tipo === 'VUELTA_REGISTRO')
          .sort((a, b) => (a.monto || 0) - (b.monto || 0));
        const list = gV.map(g => {
          try { return { id: g.id, ...JSON.parse(g.descripcion || '{}') }; } catch { return null; }
        }).filter(Boolean);
        return list.find((v: any) => v.estado === 'EN_RUTA') || (list.length > 0 ? list[list.length - 1] : null);
      })(),
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ----------------------------------------------------------------
// SALIDA (Apertura o Acumulación en el día)
// ----------------------------------------------------------------
export async function registrarSalidaAction(data: SalidaInput) {
  try {
    if (!data.usuario_id) return { success: false, message: 'Debes seleccionar un repartidor.' };
    if (!data.fecha) return { success: false, message: 'Debes indicar la fecha.' };
    if (esFinDeSemana(data.fecha)) {
      return { success: false, message: 'La empresa opera exclusivamente de Lunes a Viernes. No se pueden registrar salidas en fines de semana.' };
    }
    const items = (data.items || []).filter((it) => it.cantidad > 0);
    if (items.length === 0) {
      return { success: false, message: 'Debes indicar al menos un producto.' };
    }

    const { fechaNormalizada } = getRangoDia(data.fecha);

    const cuadraturaId = await prisma.$transaction(async (tx) => {
      let cuadratura = await tx.cuadratura.findFirst({
        where: { usuario_id: data.usuario_id, fecha: fechaNormalizada },
        include: { salida: true },
      });

      if (cuadratura && cuadratura.estado === 'CERRADA') {
        if (data.es_nueva_vuelta) {
          // Reabrir la jornada para registrar la nueva vuelta
          await tx.cuadratura.update({
            where: { id: cuadratura.id },
            data: { estado: 'ABIERTA' }
          });
        } else {
          throw new Error('La cuadratura de ese día ya está cerrada. Usa "Agregar Vuelta" para una nueva ronda.');
        }
      }

      // Si es la primera salida del día, requerimos KM Inicial
      if (!cuadratura) {
        if (data.km_inicial === undefined || isNaN(data.km_inicial)) {
          throw new Error('El kilometraje inicial es obligatorio al iniciar el día.');
        }
        cuadratura = await tx.cuadratura.create({
          data: { 
            usuario_id: data.usuario_id, 
            fecha: fechaNormalizada, 
            estado: 'ABIERTA',
            km_inicial: data.km_inicial
          },
          include: { salida: true },
        });
      }

      // Acumulamos los productos
      for (const it of items) {
        const registroSalidaExistente = await tx.cuadraturaSalida.findFirst({
          where: { cuadratura_id: cuadratura.id, producto_id: it.producto_id }
        });

        if (registroSalidaExistente) {
          await tx.cuadraturaSalida.update({
            where: { id: registroSalidaExistente.id },
            data: { cantidad: { increment: it.cantidad } }
          });
        } else {
          await tx.cuadraturaSalida.create({
            data: { cuadratura_id: cuadratura.id, producto_id: it.producto_id, cantidad: it.cantidad },
          });
        }

        const stockFabricaActual = await tx.stockFabrica.findUnique({ where: { producto_id: it.producto_id } });
        const nuevaCantidadFabrica = (stockFabricaActual?.cantidad || 0) - it.cantidad;

        await tx.stockFabrica.upsert({
          where: { producto_id: it.producto_id },
          create: { producto_id: it.producto_id, cantidad: nuevaCantidadFabrica },
          update: { cantidad: { decrement: it.cantidad } },
        });
        
        await tx.stockCamion.upsert({
          where: { usuario_id_producto_id: { usuario_id: data.usuario_id, producto_id: it.producto_id } },
          create: { usuario_id: data.usuario_id, producto_id: it.producto_id, cantidad: it.cantidad },
          update: { cantidad: { increment: it.cantidad } },
        });
      }

      // Buscar vehiculo asignado para asociar combustible y kilometraje
      const usuario = await tx.usuario.findUnique({ where: { id: data.usuario_id }, select: { vehiculo_id: true } });
      const ruta = await tx.rutaDia.findFirst({
        where: { usuario_id: data.usuario_id, fecha: fechaNormalizada },
        select: { vehiculo_id: true }
      });
      const vehiculoId = ruta?.vehiculo_id || usuario?.vehiculo_id;

      // Actualizar odómetro si el km inicial es superior
      if (vehiculoId && data.km_inicial) {
        await tx.vehiculo.updateMany({
          where: { id: vehiculoId, kilometraje_actual: { lt: data.km_inicial } },
          data: { kilometraje_actual: data.km_inicial }
        });
      }

      // Registramos Combustible si viene en el payload
      if (data.combustible && data.combustible.monto > 0) {
        const desc = `[${data.combustible.tipo_combustible}] Factura: ${data.combustible.numero_factura || 'S/N'}${data.combustible.litros ? ` | ${data.combustible.litros}L` : ''}`;
        await tx.cuadraturaGasto.create({
          data: {
            cuadratura_id: cuadratura.id,
            tipo: 'COMBUSTIBLE',
            monto: data.combustible.monto,
            descripcion: desc,
          }
        });

        // Sincronizar en CargaCombustible de Flota para mantenciones y gráficos
        if (vehiculoId) {
          const numFacturaParsed = data.combustible.numero_factura 
            ? parseInt(data.combustible.numero_factura.replace(/\D/g, '')) || null 
            : null;

          await tx.cargaCombustible.create({
            data: {
              vehiculo_id: vehiculoId,
              fecha: fechaNormalizada,
              kilometraje: data.km_inicial || 0,
              litros: data.combustible.litros || (data.combustible.monto / 1050), // estimación de litros si no se digita
              monto: data.combustible.monto,
              taller_o_bencinera: `Salida Cuadratura [${data.combustible.tipo_combustible}]`,
              numero_factura: numFacturaParsed
            }
          });
        }
      }

      // Registro de accesorios / bombas u otros llevados
      if (data.otros_accesorios && data.otros_accesorios.trim()) {
        await tx.cuadraturaGasto.create({
          data: {
            cuadratura_id: cuadratura.id,
            tipo: 'ACCESORIOS_SALIDA',
            monto: 0,
            descripcion: data.otros_accesorios.trim(),
          }
        });
      }

      // Registrar la vuelta en CuadraturaGasto con tipo 'VUELTA_REGISTRO'
      const vueltasPrevias = await tx.cuadraturaGasto.findMany({
        where: { cuadratura_id: cuadratura.id, tipo: 'VUELTA_REGISTRO' }
      });
      const numVuelta = data.numero_vuelta || (vueltasPrevias.length + 1);

      const vueltaInfo = {
        numero_vuelta: numVuelta,
        km_salida: data.km_inicial ?? cuadratura.km_final ?? cuadratura.km_inicial ?? 0,
        items_salida: items,
        accesorios_salida: data.otros_accesorios?.trim() || '',
        hora_salida: new Date().toISOString(),
        estado: 'EN_RUTA'
      };

      await tx.cuadraturaGasto.create({
        data: {
          cuadratura_id: cuadratura.id,
          tipo: 'VUELTA_REGISTRO',
          monto: numVuelta,
          descripcion: JSON.stringify(vueltaInfo)
        }
      });

      return cuadratura.id;
    });

    revalidatePath('/admin/cuadratura');
    revalidatePath('/admin/flota');
    return { success: true, cuadratura_id: cuadraturaId };
  } catch (error: any) {
    return { success: false, message: error.message || 'No se pudo registrar la salida.' };
  }
}

// ----------------------------------------------------------------
// CIERRE / RECEPCIÓN (regreso: ventas de ruta, retorno físico, vacíos, gastos, KM FINAL)
// ----------------------------------------------------------------
export async function registrarCierreCuadraturaAction(data: CierreCuadraturaInput) {
  try {
    if (!data.cuadratura_id) return { success: false, message: 'Cuadratura no válida.' };
    if (!data.km_final || isNaN(data.km_final)) return { success: false, message: 'El kilometraje final es obligatorio.' };

    const alertas: string[] = [];

    await prisma.$transaction(async (tx) => {
      const cuadratura = await tx.cuadratura.findUnique({
        where: { id: data.cuadratura_id },
        include: { 
          salida: { include: { producto: true } },
          ventas: true, 
          retorno: true, 
          usuario: true 
        },
      });
      if (!cuadratura) throw new Error('La cuadratura no existe.');
      if (cuadratura.estado === 'CERRADA') {
        const esAutoCerrada = cuadratura.motivo_reapertura?.includes('AUTO_CIERRE');
        if (!esAutoCerrada && !data.permitir_ajuste) {
          throw new Error('Esta cuadratura ya está cerrada. Un ADMIN debe reabrirla antes de volver a registrar el cierre.');
        }
      }

      // Validar que km_final >= km_inicial
      if (cuadratura.km_inicial !== null && data.km_final < cuadratura.km_inicial) {
        throw new Error(`El kilometraje final (${data.km_final} km) no puede ser menor al kilometraje inicial (${cuadratura.km_inicial} km).`);
      }

      const usuario = cuadratura.usuario;

      // --------------------------------------------------------------
      // CONEXIÓN RUTA Y DESPACHO: Extraer entregas completadas
      // --------------------------------------------------------------
      const fStr = cuadratura.fecha.toISOString().split('T')[0];
      const { inicio: inicioDia, fin: finDia } = getRangoDia(fStr);

      // Asociar incidencias huérfanas del día a esta cuadratura
      await tx.incidencia.updateMany({
        where: {
          usuario_id: cuadratura.usuario_id,
          cuadratura_id: null,
          created_at: { gte: inicioDia, lte: finDia },
        },
        data: { cuadratura_id: cuadratura.id },
      });

      // Extraer paradas de la ruta del día
      const rutaDia = await tx.rutaDia.findFirst({
        where: {
          usuario_id: cuadratura.usuario_id,
          fecha: { gte: inicioDia, lte: finDia },
        },
        include: {
          vehiculo: true,
          paradas: {
            include: {
              cliente: true,
              pedido: { include: { items: { include: { producto: true } } } },
            },
          },
        },
      });

      const paradasDelDia = rutaDia?.paradas || [];
      const paradasEntregadas = paradasDelDia.filter(p => p.estado === 'ENTREGADO');

      // Obtener catálogo de productos para mapear categorías a IDs
      const productosCatalogo = await tx.producto.findMany({ where: { activo: true } });
      const prod20 = productosCatalogo.find(p => p.categoria === 'BOTELLON20') || productosCatalogo[0];
      const prod10 = productosCatalogo.find(p => p.categoria === 'BOTELLON10');
      const prodSoda = productosCatalogo.find(p => p.categoria === 'SODA');

      // Determinar ventas finales (si no se enviaron manualmente, se calculan automáticamente desde la ruta)
      let ventasACuadrar: ItemVentaInput[] = [];

      if (data.ventas && data.ventas.length > 0) {
        ventasACuadrar = data.ventas;
      } else {
        // Generar ventas automáticas desde las paradas ENTREGADAS
        for (const p of paradasEntregadas) {
          const clienteTipo = p.cliente?.tipo || 'DOMICILIO';
          const metodoPagoParada = (p.pedido?.metodo_pago_web as MetodoPago) || 
            (p.cliente?.modalidad_pago === 'MENSUAL' ? 'GUIA_MENSUAL' : 'EFECTIVO');

          if (p.pedido && p.pedido.items?.length > 0) {
            for (const item of p.pedido.items) {
              const cant = item.cantidad_entregada ?? item.cantidad ?? 0;
              if (cant > 0 && item.producto_id) {
                ventasACuadrar.push({
                  producto_id: item.producto_id,
                  tipo_transaccion: item.tipo_transaccion,
                  tipo_cliente: clienteTipo,
                  cantidad: cant,
                  metodo_pago: metodoPagoParada,
                  guia_id: null,
                });
              }
            }
          } else {
            if (p.bot20_entregado > 0 && prod20) {
              ventasACuadrar.push({
                producto_id: prod20.id,
                tipo_transaccion: 'RECARGA',
                tipo_cliente: clienteTipo,
                cantidad: p.bot20_entregado,
                metodo_pago: metodoPagoParada,
              });
            }

            if (p.bot10_entregado > 0 && prod10) {
              ventasACuadrar.push({
                producto_id: prod10.id,
                tipo_transaccion: 'RECARGA',
                tipo_cliente: clienteTipo,
                cantidad: p.bot10_entregado,
                metodo_pago: metodoPagoParada,
              });
            }

            if (p.soda_entregada > 0 && prodSoda) {
              ventasACuadrar.push({
                producto_id: prodSoda.id,
                tipo_transaccion: 'RECARGA',
                tipo_cliente: clienteTipo,
                cantidad: p.soda_entregada,
                metodo_pago: metodoPagoParada,
              });
            }
          }
        }
      }

      // Revertir ventas y retorno anteriores si se estuviera recalculando
      for (const v of cuadratura.ventas) {
        await tx.stockCamion.upsert({
          where: { usuario_id_producto_id: { usuario_id: cuadratura.usuario_id, producto_id: v.producto_id } },
          create: { usuario_id: cuadratura.usuario_id, producto_id: v.producto_id, cantidad: v.cantidad },
          update: { cantidad: { increment: v.cantidad } },
        });
      }
      for (const r of cuadratura.retorno) {
        await tx.stockFabrica.upsert({
          where: { producto_id: r.producto_id },
          create: { producto_id: r.producto_id, cantidad: 0 },
          update: { cantidad: { decrement: r.cantidad } },
        });
        await tx.stockCamion.upsert({
          where: { usuario_id_producto_id: { usuario_id: cuadratura.usuario_id, producto_id: r.producto_id } },
          create: { usuario_id: cuadratura.usuario_id, producto_id: r.producto_id, cantidad: r.cantidad },
          update: { cantidad: { increment: r.cantidad } },
        });
      }

      await tx.cuadraturaVenta.deleteMany({ where: { cuadratura_id: cuadratura.id } });
      await tx.cuadraturaRetorno.deleteMany({ where: { cuadratura_id: cuadratura.id } });
      await tx.botellonVacio.deleteMany({ where: { cuadratura_id: cuadratura.id } });

      let totalEfectivo = 0, totalTarjeta = 0, totalTransferencia = 0, totalGuiaMensual = 0, totalComision = 0;

      for (const v of ventasACuadrar.filter((it) => it.cantidad > 0)) {
        const producto = await tx.producto.findUnique({ where: { id: v.producto_id } });
        if (!producto) continue;

        let comision = 0;
        if (usuario.rol === 'REPARTIDOR' && usuario.recibe_comision) {
          const comisionCfg = await tx.comision.findFirst({
            where: { producto_id: v.producto_id, tipo_transaccion: v.tipo_transaccion, tipo_cliente: v.tipo_cliente },
          });
          comision = (comisionCfg?.monto || 0) * v.cantidad;
        }
        totalComision += comision;

        await tx.cuadraturaVenta.create({
          data: {
            cuadratura_id: cuadratura.id,
            producto_id: v.producto_id,
            tipo_transaccion: v.tipo_transaccion,
            tipo_cliente: v.tipo_cliente,
            cantidad: v.cantidad,
            metodo_pago: v.metodo_pago,
            guia_id: v.guia_id || null,
            comision_calculada: comision,
          },
        });

        if (!v.guia_id) {
          const precio = v.tipo_transaccion === 'RECARGA' ? (producto.precio_recarga ?? producto.precio_venta_nueva) : producto.precio_venta_nueva;
          const monto = precio * v.cantidad;
          if (v.metodo_pago === 'EFECTIVO') totalEfectivo += monto;
          else if (v.metodo_pago === 'TARJETA') totalTarjeta += monto;
          else if (v.metodo_pago === 'TRANSFERENCIA') totalTransferencia += monto;
          else if (v.metodo_pago === 'GUIA_MENSUAL') totalGuiaMensual += monto;
        }

        await tx.stockCamion.upsert({
          where: { usuario_id_producto_id: { usuario_id: cuadratura.usuario_id, producto_id: v.producto_id } },
          create: { usuario_id: cuadratura.usuario_id, producto_id: v.producto_id, cantidad: -v.cantidad },
          update: { cantidad: { decrement: v.cantidad } },
        });
      }

      // Si el usuario especificó montos de dinero rendidos manualmente en recepción, respetarlos
      if (data.total_efectivo !== undefined && !isNaN(data.total_efectivo)) {
        totalEfectivo = data.total_efectivo;
      }
      if (data.total_tarjeta !== undefined && !isNaN(data.total_tarjeta)) {
        totalTarjeta = data.total_tarjeta;
      }
      if (data.total_transferencia !== undefined && !isNaN(data.total_transferencia)) {
        totalTransferencia = data.total_transferencia;
      }

      // Retorno físico de productos llenos devueltos a fábrica
      for (const r of data.retorno.filter((it) => it.cantidad > 0)) {
        await tx.cuadraturaRetorno.create({
          data: { cuadratura_id: cuadratura.id, producto_id: r.producto_id, cantidad: r.cantidad },
        });
        await tx.stockFabrica.upsert({
          where: { producto_id: r.producto_id },
          create: { producto_id: r.producto_id, cantidad: r.cantidad },
          update: { cantidad: { increment: r.cantidad } },
        });
        await tx.stockCamion.upsert({
          where: { usuario_id_producto_id: { usuario_id: cuadratura.usuario_id, producto_id: r.producto_id } },
          create: { usuario_id: cuadratura.usuario_id, producto_id: r.producto_id, cantidad: -r.cantidad },
          update: { cantidad: { decrement: r.cantidad } },
        });
      }

      // Recepción de envases vacíos
      if (data.botellones_vacios && data.botellones_vacios.cantidad_total >= 0) {
        await tx.botellonVacio.create({
          data: {
            cuadratura_id: cuadratura.id,
            cantidad_total: data.botellones_vacios.cantidad_total,
            cantidad_danados: data.botellones_vacios.cantidad_danados || 0,
          },
        });

        // Descontar envases vacíos dañados del stock de fábrica con su respectivo movimiento
        if (data.botellones_vacios.danados_detalle) {
          for (const [prodId, cant] of Object.entries(data.botellones_vacios.danados_detalle)) {
            const cantidadDanada = Number(cant) || 0;
            if (cantidadDanada > 0) {
              const producto = await tx.producto.findUnique({ where: { id: prodId } });
              const stockFabricaActual = await tx.stockFabrica.findUnique({ where: { producto_id: prodId } });
              const stockAntes = stockFabricaActual?.cantidad || 0;
              const stockDespues = Math.max(0, stockAntes - cantidadDanada);

              await tx.stockFabrica.upsert({
                where: { producto_id: prodId },
                create: { producto_id: prodId, cantidad: 0 },
                update: { cantidad: { decrement: cantidadDanada } },
              });

              await tx.movimientoStock.create({
                data: {
                  producto_id: prodId,
                  usuario_id: cuadratura.usuario_id,
                  cantidad: -cantidadDanada,
                  motivo: `Baja por envase dañado en recepción de ruta (${cantidadDanada} un.)`,
                  stock_antes: stockAntes,
                  stock_despues: stockDespues,
                }
              });

              alertas.push(`🗑️ ${cantidadDanada} envase(s) dañado(s) de ${producto?.nombre || 'producto'} dado(s) de baja del stock.`);
            }
          }
        }
      }

      // Registro de retorno de accesorios
      if (data.otros_retorno && data.otros_retorno.trim()) {
        await tx.cuadraturaGasto.create({
          data: {
            cuadratura_id: cuadratura.id,
            tipo: 'ACCESORIOS_RETORNO',
            monto: 0,
            descripcion: data.otros_retorno.trim(),
          }
        });
      }

      // Manejo de combustible (si se cargó o modificó en el cierre)
      let montoCombustible = data.monto_bencina ?? cuadratura.monto_bencina;
      if (data.combustible && data.combustible.monto > 0) {
        montoCombustible = data.combustible.monto;
        await tx.cuadraturaGasto.create({
          data: {
            cuadratura_id: cuadratura.id,
            tipo: 'COMBUSTIBLE',
            monto: data.combustible.monto,
            descripcion: `[${data.combustible.tipo_combustible}] Factura: ${data.combustible.numero_factura || 'S/N'}${data.combustible.litros ? ` | ${data.combustible.litros}L` : ''}`,
          }
        });
      }

      // Actualizar la vuelta activa con sus datos de retorno / recepción
      const ultimaVuelta = await tx.cuadraturaGasto.findFirst({
        where: { cuadratura_id: cuadratura.id, tipo: 'VUELTA_REGISTRO' },
        orderBy: { monto: 'desc' }
      });

      if (ultimaVuelta) {
        let vData: any = {};
        try { vData = JSON.parse(ultimaVuelta.descripcion || '{}'); } catch {}
        vData.km_llegada = data.km_final;
        vData.items_retorno = data.retorno;
        vData.vacios_totales = data.botellones_vacios?.cantidad_total || 0;
        vData.vacios_danados = data.botellones_vacios?.cantidad_danados || 0;
        vData.danados_detalle = data.botellones_vacios?.danados_detalle;
        vData.efectivo_rendido = data.total_efectivo;
        vData.tarjeta_rendida = data.total_tarjeta;
        vData.transferencia_rendida = data.total_transferencia;
        vData.accesorios_retorno = data.otros_retorno;
        vData.hora_llegada = new Date().toISOString();
        vData.estado = 'RECEPCIONADA';

        await tx.cuadraturaGasto.update({
          where: { id: ultimaVuelta.id },
          data: { descripcion: JSON.stringify(vData) }
        });
      } else {
        const v1Data = {
          numero_vuelta: 1,
          km_salida: cuadratura.km_inicial || 0,
          km_llegada: data.km_final,
          items_salida: cuadratura.salida.map(s => ({ producto_id: s.producto_id, cantidad: s.cantidad })),
          items_retorno: data.retorno,
          vacios_totales: data.botellones_vacios?.cantidad_total || 0,
          vacios_danados: data.botellones_vacios?.cantidad_danados || 0,
          danados_detalle: data.botellones_vacios?.danados_detalle,
          efectivo_rendido: data.total_efectivo,
          tarjeta_rendida: data.total_tarjeta,
          transferencia_rendida: data.total_transferencia,
          accesorios_retorno: data.otros_retorno,
          hora_salida: cuadratura.fecha.toISOString(),
          hora_llegada: new Date().toISOString(),
          estado: 'RECEPCIONADA'
        };
        await tx.cuadraturaGasto.create({
          data: {
            cuadratura_id: cuadratura.id,
            tipo: 'VUELTA_REGISTRO',
            monto: 1,
            descripcion: JSON.stringify(v1Data)
          }
        });
      }

      // ACTUALIZACION DE ESTADO, TOTALES Y KILOMETRAJE EN CUADRATURA
      await tx.cuadratura.update({
        where: { id: cuadratura.id },
        data: {
          estado: data.mantener_abierta ? 'ABIERTA' : 'CERRADA',
          motivo_reapertura: cuadratura.motivo_reapertura?.includes('AUTO_CIERRE') ? 'CUADRADO_PRESENCIAL' : cuadratura.motivo_reapertura,
          total_efectivo: totalEfectivo,
          total_tarjeta: totalTarjeta,
          total_transferencia: totalTransferencia,
          total_guia_mensual: totalGuiaMensual,
          total_comision: totalComision,
          monto_bencina: montoCombustible ?? null,
          km_final: data.km_final
        },
      });

      // --------------------------------------------------------------
      // ACTUALIZACIÓN DE VEHÍCULO, COMBUSTIBLE Y MANTENCIONES
      // --------------------------------------------------------------
      const vehiculoId = rutaDia?.vehiculo_id || usuario.vehiculo_id;
      if (vehiculoId) {
        // 1. Odómetro del Vehículo
        await tx.vehiculo.update({
          where: { id: vehiculoId },
          data: { kilometraje_actual: data.km_final }
        });

        // 2. Si hubo carga de combustible en el cierre, registrar en CargaCombustible
        if (data.combustible && data.combustible.monto > 0) {
          const numFacturaParsed = data.combustible.numero_factura 
            ? parseInt(data.combustible.numero_factura.replace(/\D/g, '')) || null 
            : null;

          await tx.cargaCombustible.create({
            data: {
              vehiculo_id: vehiculoId,
              fecha: cuadratura.fecha,
              kilometraje: cuadratura.km_inicial || data.km_final,
              litros: data.combustible.litros || (data.combustible.monto / 1050),
              monto: data.combustible.monto,
              taller_o_bencinera: `Cierre Cuadratura [${data.combustible.tipo_combustible}]`,
              numero_factura: numFacturaParsed,
            }
          });
        }

        // 3. Revisar alertas activas de mantención por kilometraje
        const alertasVehiculo = await tx.alertaVehiculo.findMany({
          where: {
            vehiculo_id: vehiculoId,
            activa: true,
            valor_km: { lte: data.km_final }
          }
        });

        for (const al of alertasVehiculo) {
          alertas.push(`⚠️ MANTENCIÓN: El vehículo ha alcanzado ${data.km_final} km (alerta programada para los ${al.valor_km} km).`);
        }
      }

      // Validar si algún stock en camión quedó descuadrado
      const stocksCamionFinal = await tx.stockCamion.findMany({ where: { usuario_id: cuadratura.usuario_id } });
      for (const sc of stocksCamionFinal) {
        if (sc.cantidad < 0) {
          const producto = await tx.producto.findUnique({ where: { id: sc.producto_id } });
          alertas.push(`Stock en camión de ${producto?.nombre || 'un producto'} quedó negativo (${sc.cantidad}). Revisa las cantidades.`);
        }
      }
    });

    revalidatePath('/admin/cuadratura');
    revalidatePath('/admin/flota');
    revalidatePath('/admin/rutas');
    return { success: true, alertas };
  } catch (error: any) {
    return { success: false, message: error.message || 'No se pudo registrar el cierre.' };
  }
}

// ----------------------------------------------------------------
// REAPERTURA (solo ADMIN)
// ----------------------------------------------------------------
export async function reabrirCuadraturaAction(cuadraturaId: string, motivo: string) {
  try {
    if (!motivo || motivo.trim().length < 3) {
      return { success: false, message: 'Debes indicar un motivo para reabrir la cuadratura.' };
    }

    let usuario = await getUsuarioActual();
    if (!usuario) {
      try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (session?.user?.email) {
          usuario = await prisma.usuario.findUnique({
            where: { email: session.user.email },
          });
        }
      } catch (e) {}
    }

    if (!usuario) {
      return { success: false, message: 'No autenticado.' };
    }

    if (usuario.rol !== 'ADMIN') {
      return { success: false, message: 'Solo un ADMIN puede reabrir una cuadratura cerrada.' };
    }

    const cuadratura = await prisma.cuadratura.findUnique({ where: { id: cuadraturaId } });
    if (!cuadratura) return { success: false, message: 'La cuadratura no existe.' };
    if (cuadratura.estado === 'ABIERTA') return { success: false, message: 'La cuadratura ya está abierta.' };

    await prisma.cuadratura.update({
      where: { id: cuadraturaId },
      data: { estado: 'ABIERTA', motivo_reapertura: motivo.trim(), fecha_reapertura: new Date() },
    });

    revalidatePath('/admin/cuadratura');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'No se pudo reabrir la cuadratura.' };
  }
}

// ----------------------------------------------------------------
// CAMBIO DE VUELTA: Descarga de Vuelta N + Carga de Vuelta N+1
// ----------------------------------------------------------------
export async function registrarCambioDeVueltaAction(data: DescargaYCargaVueltaInput) {
  try {
    if (!data.cuadratura_id) return { success: false, message: 'Cuadratura no válida.' };
    if (!data.km_llegada || isNaN(data.km_llegada) || data.km_llegada <= 0) {
      return { success: false, message: 'El kilometraje de llegada es obligatorio.' };
    }
    const itemsSalida = (data.items_salida || []).filter(it => it.cantidad > 0);
    if (itemsSalida.length === 0) {
      return { success: false, message: 'Debes indicar al menos un producto a cargar para la nueva vuelta.' };
    }

    const alertas: string[] = [];

    await prisma.$transaction(async (tx) => {
      const cuadratura = await tx.cuadratura.findUnique({
        where: { id: data.cuadratura_id },
        include: {
          salida: true,
          retorno: true,
          gastos: true,
          usuario: { include: { vehiculo: true } }
        }
      });
      if (!cuadratura) throw new Error('La cuadratura no existe.');

      const kmIni = cuadratura.km_inicial || 0;
      if (data.km_llegada < kmIni) {
        throw new Error(`El odómetro de llegada (${data.km_llegada} km) no puede ser menor al de inicio (${kmIni} km).`);
      }

      // Reabrir o mantener abierta la cuadratura
      await tx.cuadratura.update({
        where: { id: cuadratura.id },
        data: {
          estado: 'ABIERTA',
          km_final: data.km_llegada,
          ...(data.efectivo_rendido && data.efectivo_rendido > 0 ? {
            total_efectivo: { increment: data.efectivo_rendido }
          } : {})
        }
      });

      // ----------------------------------------------------
      // 1. DESCARGA DEL CAMIÓN (Vuelta que termina)
      // ----------------------------------------------------
      const retornoLlenos = (data.retorno_llenos || []).filter(r => r.cantidad > 0);
      for (const r of retornoLlenos) {
        const regRetorno = await tx.cuadraturaRetorno.findFirst({
          where: { cuadratura_id: cuadratura.id, producto_id: r.producto_id }
        });
        if (regRetorno) {
          await tx.cuadraturaRetorno.update({
            where: { id: regRetorno.id },
            data: { cantidad: { increment: r.cantidad } }
          });
        } else {
          await tx.cuadraturaRetorno.create({
            data: { cuadratura_id: cuadratura.id, producto_id: r.producto_id, cantidad: r.cantidad }
          });
        }

        // Vuelven llenos a fábrica: suma en fábrica, resta del camión
        await tx.stockFabrica.upsert({
          where: { producto_id: r.producto_id },
          create: { producto_id: r.producto_id, cantidad: r.cantidad },
          update: { cantidad: { increment: r.cantidad } }
        });
        await tx.stockCamion.upsert({
          where: { usuario_id_producto_id: { usuario_id: cuadratura.usuario_id, producto_id: r.producto_id } },
          create: { usuario_id: cuadratura.usuario_id, producto_id: r.producto_id, cantidad: -r.cantidad },
          update: { cantidad: { decrement: r.cantidad } }
        });
      }

      // Vacíos
      if (data.botellones_vacios && data.botellones_vacios.cantidad_total >= 0) {
        await tx.botellonVacio.create({
          data: {
            cuadratura_id: cuadratura.id,
            cantidad_total: data.botellones_vacios.cantidad_total,
            cantidad_danados: data.botellones_vacios.cantidad_danados || 0
          }
        });

        if (data.botellones_vacios.danados_detalle) {
          for (const [prodId, cant] of Object.entries(data.botellones_vacios.danados_detalle)) {
            const cantidadDanada = Number(cant) || 0;
            if (cantidadDanada > 0) {
              const producto = await tx.producto.findUnique({ where: { id: prodId } });
              const stockFabricaActual = await tx.stockFabrica.findUnique({ where: { producto_id: prodId } });
              const stockAntes = stockFabricaActual?.cantidad || 0;
              const stockDespues = Math.max(0, stockAntes - cantidadDanada);

              await tx.stockFabrica.upsert({
                where: { producto_id: prodId },
                create: { producto_id: prodId, cantidad: 0 },
                update: { cantidad: { decrement: cantidadDanada } }
              });

              await tx.movimientoStock.create({
                data: {
                  producto_id: prodId,
                  usuario_id: cuadratura.usuario_id,
                  cantidad: -cantidadDanada,
                  motivo: `Baja por envase dañado en descarga de vuelta (${cantidadDanada} un.)`,
                  stock_antes: stockAntes,
                  stock_despues: stockDespues
                }
              });

              alertas.push(`🗑️ ${cantidadDanada} envase(s) dañado(s) de ${producto?.nombre || 'producto'} dado(s) de baja.`);
            }
          }
        }
      }

      // Accesorios de retorno
      if (data.otros_retorno && data.otros_retorno.trim()) {
        await tx.cuadraturaGasto.create({
          data: {
            cuadratura_id: cuadratura.id,
            tipo: 'ACCESORIOS_RETORNO',
            monto: 0,
            descripcion: data.otros_retorno.trim()
          }
        });
      }

      // Actualizar vuelta activa anterior como RECEPCIONADA
      const ultimaVuelta = await tx.cuadraturaGasto.findFirst({
        where: { cuadratura_id: cuadratura.id, tipo: 'VUELTA_REGISTRO' },
        orderBy: { monto: 'desc' }
      });

      if (ultimaVuelta) {
        let vData: any = {};
        try { vData = JSON.parse(ultimaVuelta.descripcion || '{}'); } catch {}
        vData.km_llegada = data.km_llegada;
        vData.items_retorno = retornoLlenos;
        vData.vacios_totales = data.botellones_vacios?.cantidad_total || 0;
        vData.vacios_danados = data.botellones_vacios?.cantidad_danados || 0;
        vData.danados_detalle = data.botellones_vacios?.danados_detalle;
        vData.efectivo_rendido = data.efectivo_rendido;
        vData.accesorios_retorno = data.otros_retorno;
        vData.hora_llegada = new Date().toISOString();
        vData.estado = 'RECEPCIONADA';

        await tx.cuadraturaGasto.update({
          where: { id: ultimaVuelta.id },
          data: { descripcion: JSON.stringify(vData) }
        });
      }

      // Actualizar odómetro del vehículo
      if (cuadratura.usuario?.vehiculo) {
        await tx.vehiculo.update({
          where: { id: cuadratura.usuario.vehiculo.id },
          data: { kilometraje_actual: data.km_llegada }
        });
      }

      // ----------------------------------------------------
      // 2. CARGA DEL CAMIÓN (Nueva Vuelta)
      // ----------------------------------------------------
      for (const it of itemsSalida) {
        const regSalida = await tx.cuadraturaSalida.findFirst({
          where: { cuadratura_id: cuadratura.id, producto_id: it.producto_id }
        });
        if (regSalida) {
          await tx.cuadraturaSalida.update({
            where: { id: regSalida.id },
            data: { cantidad: { increment: it.cantidad } }
          });
        } else {
          await tx.cuadraturaSalida.create({
            data: { cuadratura_id: cuadratura.id, producto_id: it.producto_id, cantidad: it.cantidad }
          });
        }

        // Sale de fábrica al camión
        await tx.stockFabrica.upsert({
          where: { producto_id: it.producto_id },
          create: { producto_id: it.producto_id, cantidad: -it.cantidad },
          update: { cantidad: { decrement: it.cantidad } }
        });
        await tx.stockCamion.upsert({
          where: { usuario_id_producto_id: { usuario_id: cuadratura.usuario_id, producto_id: it.producto_id } },
          create: { usuario_id: cuadratura.usuario_id, producto_id: it.producto_id, cantidad: it.cantidad },
          update: { cantidad: { increment: it.cantidad } }
        });
      }

      // Combustible si cargó
      if (data.combustible && data.combustible.monto > 0) {
        await tx.cuadratura.update({
          where: { id: cuadratura.id },
          data: { monto_bencina: { increment: data.combustible.monto } }
        });

        await tx.cuadraturaGasto.create({
          data: {
            cuadratura_id: cuadratura.id,
            tipo: 'COMBUSTIBLE',
            monto: data.combustible.monto,
            descripcion: `[${data.combustible.tipo_combustible}] Factura: ${data.combustible.numero_factura || 'S/N'}${data.combustible.litros ? ` | ${data.combustible.litros}L` : ''}`
          }
        });

        if (cuadratura.usuario?.vehiculo) {
          const numFacturaParsed = data.combustible.numero_factura
            ? parseInt(data.combustible.numero_factura.replace(/\D/g, '')) || null
            : null;
          await tx.cargaCombustible.create({
            data: {
              vehiculo_id: cuadratura.usuario.vehiculo.id,
              fecha: new Date(cuadratura.fecha),
              kilometraje: data.km_llegada,
              litros: data.combustible.litros || (data.combustible.monto / 1050),
              monto: data.combustible.monto,
              taller_o_bencinera: `Vuelta ${data.numero_nueva_vuelta} [${data.combustible.tipo_combustible}]`,
              numero_factura: numFacturaParsed
            }
          });
        }
      }

      // Accesorios de salida
      if (data.otros_salida && data.otros_salida.trim()) {
        await tx.cuadraturaGasto.create({
          data: {
            cuadratura_id: cuadratura.id,
            tipo: 'ACCESORIOS_SALIDA',
            monto: 0,
            descripcion: data.otros_salida.trim()
          }
        });
      }

      // Registrar la nueva vuelta con estado 'EN_RUTA'
      const nuevaVueltaInfo = {
        numero_vuelta: data.numero_nueva_vuelta,
        km_salida: data.km_llegada,
        items_salida: itemsSalida,
        accesorios_salida: data.otros_salida?.trim() || '',
        hora_salida: new Date().toISOString(),
        estado: 'EN_RUTA'
      };

      await tx.cuadraturaGasto.create({
        data: {
          cuadratura_id: cuadratura.id,
          tipo: 'VUELTA_REGISTRO',
          monto: data.numero_nueva_vuelta,
          descripcion: JSON.stringify(nuevaVueltaInfo)
        }
      });
    });

    revalidatePath('/admin/cuadratura');
    revalidatePath('/admin/flota');
    return { success: true, alertas };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al procesar el cambio de vuelta.' };
  }
}
