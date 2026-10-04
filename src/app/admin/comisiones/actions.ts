'use server';

import { prisma } from '../../../../lib/prisma';
import { Rol } from '../../../../lib/prisma/generated';
import { revalidatePath } from 'next/cache';
import { ComisionConfig, normalizarConfigComision, serializarConfigComision } from './types';
export type { ComisionConfig } from './types';

// 1. Obtener los repartidores con sus configuraciones de comisiones
export async function obtenerRepartidoresComisionesAction() {
  try {
    const repartidores = await prisma.usuario.findMany({
      where: { rol: Rol.REPARTIDOR },
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
        configsMap[uId] = normalizarConfigComision(JSON.parse(cfg.valor));
      } catch (e) {
        // Fallback si falla el parseo
      }
    });

    return { success: true, repartidores, configsMap };
  } catch (error: any) {
    console.error('Error al obtener repartidores para comisiones:', error);
    return { success: false, repartidores: [], configsMap: {}, message: error.message };
  }
}

// 2. Guardar o actualizar la regla de comisión de un repartidor
export async function guardarConfiguracionComisionAction(usuarioId: string, config: ComisionConfig) {
  try {
    const clave = `comision_config_${usuarioId}`;
    const valorJson = serializarConfigComision(config);

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

    revalidatePath('/admin/comisiones');
    return { success: true };
  } catch (error: any) {
    console.error('Error al guardar comisión:', error);
    return { success: false, message: error.message || 'Error al guardar la regla de comisión.' };
  }
}

// 3. Calcular comisiones con separación estricta Natural vs Empresa y resumen para gráfico
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

    const config: ComisionConfig = normalizarConfigComision(cfgDb?.valor ? JSON.parse(cfgDb.valor) : undefined);

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
                items: { include: { producto: true } },
                guia: true
              }
            }
          }
        }
      }
    });

    let totalParadasNatural = 0;
    let totalParadasEmpresa = 0;

    // Métricas por tipo de producto y medio de pago
    let bot20EfectivoNat = 0, bot20CreditoNat = 0;
    let bot20EfectivoEmp = 0, bot20CreditoEmp = 0;

    // Recargas acumuladas
    let rec20Nat = 0, rec10Nat = 0, recSodaNat = 0, montoRecNat = 0;
    let rec20Emp = 0, rec10Emp = 0, recSodaEmp = 0, montoRecEmp = 0;

    // Ventas acumuladas
    let vta20Nat = 0, vta10Nat = 0, vtaSodaNat = 0, vtaOtroNat = 0, montoVtaNat = 0;
    let vta20Emp = 0, vta10Emp = 0, vtaSodaEmp = 0, vtaOtroEmp = 0, montoVtaEmp = 0;

    let comisionRecargasNatTotal = 0;
    let comisionRecargasEmpTotal = 0;
    let comisionVentasNatTotal = 0;
    let comisionVentasEmpTotal = 0;

    const desgloseDias: any[] = [];

    rutas.forEach(r => {
      const paradasEntregadas = r.paradas.filter(p => p.estado === 'ENTREGADO');

      let diaRec20Nat = 0, diaRec10Nat = 0, diaRecSodaNat = 0, diaMontoRecNat = 0;
      let diaRec20Emp = 0, diaRec10Emp = 0, diaRecSodaEmp = 0, diaMontoRecEmp = 0;

      let diaVta20Nat = 0, diaVta10Nat = 0, diaVtaSodaNat = 0, diaVtaOtroNat = 0, diaMontoVtaNat = 0;
      let diaVta20Emp = 0, diaVta10Emp = 0, diaVtaSodaEmp = 0, diaVtaOtroEmp = 0, diaMontoVtaEmp = 0;

      let comRecNatDia = 0;
      let comRecEmpDia = 0;

      let paradasNatDia = 0;
      let paradasEmpDia = 0;

      paradasEntregadas.forEach(p => {
        const esEmpresa = p.cliente?.tipo === 'EMPRESA';
        if (esEmpresa) {
          paradasEmpDia++;
        } else {
          paradasNatDia++;
        }

        // Evaluar medio de pago para la entrega:
        // Efectivo / Tarjeta ($150 bot 20L) vs Transferencia / Crédito (Factura o Guía: $75 bot 20L)
        const estadoGuia = p.pedido?.guia?.estado;
        const metodoWeb = p.pedido?.metodo_pago_web;
        const modCli = p.cliente?.modalidad_pago;
        const prefFact = p.cliente?.preferencia_factura;

        let esEfectivoOTarjeta = false;
        if (estadoGuia === 'ENTREGADA_EFECTIVO' || estadoGuia === 'ENTREGADA_TARJETA') {
          esEfectivoOTarjeta = true;
        } else if (estadoGuia === 'ENTREGADA_TRANSFERENCIA' || estadoGuia === 'ENTREGADA_CREDITO') {
          esEfectivoOTarjeta = false;
        } else if (metodoWeb === 'EFECTIVO' || metodoWeb === 'TARJETA') {
          esEfectivoOTarjeta = true;
        } else if (metodoWeb === 'TRANSFERENCIA' || metodoWeb === 'GUIA_MENSUAL') {
          esEfectivoOTarjeta = false;
        } else if (modCli === 'MENSUAL' || prefFact === 'CONSOLIDADO_MES' || esEmpresa) {
          esEfectivoOTarjeta = false;
        } else {
          esEfectivoOTarjeta = true;
        }

        // Tarifas oficiales:
        // 20L: $150 (efectivo/tarjeta) ó $75 (transferencia/crédito)
        // 10L: $75 siempre
        // Soda: $6 siempre
        // Misma comisión para venta y recarga
        const tarifa20L = esEfectivoOTarjeta
          ? config.monto20L_efectivoTarjeta
          : config.monto20L_transferenciaCredito;
        const tarifa10L = config.monto10L;
        const tarifaSoda = config.montoSoda;

        const tieneItems = p.pedido?.items && p.pedido.items.length > 0;

        if (tieneItems) {
          p.pedido!.items.forEach(it => {
            const cant = it.cantidad || 0;
            const sub = cant * (it.precio_historico || 0);
            const cat = it.producto?.categoria;
            const esVenta = it.tipo_transaccion === 'VENTA' || cat === 'OTRO';

            // Calcular comisión unitaria por producto (igual para venta y recarga)
            let comisionItem = 0;
            if (cat === 'BOTELLON20') {
              comisionItem = cant * tarifa20L;
              if (esEmpresa) {
                if (esEfectivoOTarjeta) bot20EfectivoEmp += cant;
                else bot20CreditoEmp += cant;
              } else {
                if (esEfectivoOTarjeta) bot20EfectivoNat += cant;
                else bot20CreditoNat += cant;
              }
            } else if (cat === 'BOTELLON10') {
              comisionItem = cant * tarifa10L;
            } else if (cat === 'SODA') {
              comisionItem = cant * tarifaSoda;
            } else {
              comisionItem = 0;
            }

            if (esEmpresa) {
              comRecEmpDia += comisionItem;
              if (esVenta) {
                diaMontoVtaEmp += sub;
                if (cat === 'BOTELLON20') diaVta20Emp += cant;
                else if (cat === 'BOTELLON10') diaVta10Emp += cant;
                else if (cat === 'SODA') diaVtaSodaEmp += cant;
                else diaVtaOtroEmp += cant;
              } else {
                diaMontoRecEmp += sub;
                if (cat === 'BOTELLON20') diaRec20Emp += cant;
                else if (cat === 'BOTELLON10') diaRec10Emp += cant;
                else if (cat === 'SODA') diaRecSodaEmp += cant;
                else diaRec20Emp += cant;
              }
            } else {
              comRecNatDia += comisionItem;
              if (esVenta) {
                diaMontoVtaNat += sub;
                if (cat === 'BOTELLON20') diaVta20Nat += cant;
                else if (cat === 'BOTELLON10') diaVta10Nat += cant;
                else if (cat === 'SODA') diaVtaSodaNat += cant;
                else diaVtaOtroNat += cant;
              } else {
                diaMontoRecNat += sub;
                if (cat === 'BOTELLON20') diaRec20Nat += cant;
                else if (cat === 'BOTELLON10') diaRec10Nat += cant;
                else if (cat === 'SODA') diaRecSodaNat += cant;
                else diaRec20Nat += cant;
              }
            }
          });
        } else {
          const cant20 = p.bot20_entregado || 0;
          const cant10 = p.bot10_entregado || 0;
          const cantSoda = p.soda_entregada || 0;

          const comision20 = cant20 * tarifa20L;
          const comision10 = cant10 * tarifa10L;
          const comisionSoda = cantSoda * tarifaSoda;
          const totalComisionParada = comision20 + comision10 + comisionSoda;

          const precio20 = esEmpresa ? 3000 : 3500;
          const precio10 = esEmpresa ? 2000 : 2500;
          const precioSoda = 1200;
          const subTotalParada = (cant20 * precio20) + (cant10 * precio10) + (cantSoda * precioSoda);

          if (esEmpresa) {
            if (esEfectivoOTarjeta) bot20EfectivoEmp += cant20;
            else bot20CreditoEmp += cant20;

            diaRec20Emp += cant20;
            diaRec10Emp += cant10;
            diaRecSodaEmp += cantSoda;
            diaMontoRecEmp += subTotalParada;
            comRecEmpDia += totalComisionParada;
          } else {
            if (esEfectivoOTarjeta) bot20EfectivoNat += cant20;
            else bot20CreditoNat += cant20;

            diaRec20Nat += cant20;
            diaRec10Nat += cant10;
            diaRecSodaNat += cantSoda;
            diaMontoRecNat += subTotalParada;
            comRecNatDia += totalComisionParada;
          }
        }
      });

      // Comisión por Ventas complementaria (% si estuviese configurado)
      const totalVentasDiaNat = diaMontoRecNat + diaMontoVtaNat;
      const totalVentasDiaEmp = diaMontoRecEmp + diaMontoVtaEmp;

      const comVtaNatDia = totalVentasDiaNat * ((config.porcentajeVenta_natural || 0) / 100);
      const comVtaEmpDia = totalVentasDiaEmp * ((config.porcentajeVenta_empresa || 0) / 100);

      const comisionNatDia = comRecNatDia + comVtaNatDia;
      const comisionEmpDia = comRecEmpDia + comVtaEmpDia;
      const comisionTotalDia = comisionNatDia + comisionEmpDia;

      // Acumular a totales
      totalParadasNatural += paradasNatDia;
      totalParadasEmpresa += paradasEmpDia;

      rec20Nat += diaRec20Nat;
      rec10Nat += diaRec10Nat;
      recSodaNat += diaRecSodaNat;
      montoRecNat += diaMontoRecNat;

      rec20Emp += diaRec20Emp;
      rec10Emp += diaRec10Emp;
      recSodaEmp += diaRecSodaEmp;
      montoRecEmp += diaMontoRecEmp;

      vta20Nat += diaVta20Nat;
      vta10Nat += diaVta10Nat;
      vtaSodaNat += diaVtaSodaNat;
      vtaOtroNat += diaVtaOtroNat;
      montoVtaNat += diaMontoVtaNat;

      vta20Emp += diaVta20Emp;
      vta10Emp += diaVta10Emp;
      vtaSodaEmp += diaVtaSodaEmp;
      vtaOtroEmp += diaVtaOtroEmp;
      montoVtaEmp += diaMontoVtaEmp;

      comisionRecargasNatTotal += comRecNatDia;
      comisionRecargasEmpTotal += comRecEmpDia;
      comisionVentasNatTotal += comVtaNatDia;
      comisionVentasEmpTotal += comVtaEmpDia;

      desgloseDias.push({
        id: r.id,
        fecha: r.fecha.toISOString().split('T')[0],
        nombreRuta: r.ruta_base?.nombre || 'Ruta sin nombre',
        paradasTotales: r.paradas.length,
        paradasEntregadas: paradasEntregadas.length,
        recargas: {
          natural: { bot20L: diaRec20Nat, bot10L: diaRec10Nat, soda: diaRecSodaNat, total: diaRec20Nat + diaRec10Nat + diaRecSodaNat, comision: Math.round(comRecNatDia) },
          empresa: { bot20L: diaRec20Emp, bot10L: diaRec10Emp, soda: diaRecSodaEmp, total: diaRec20Emp + diaRec10Emp + diaRecSodaEmp, comision: Math.round(comRecEmpDia) },
        },
        ventas: {
          natural: { unidades: diaVta20Nat + diaVta10Nat + diaVtaSodaNat + diaVtaOtroNat, monto: Math.round(totalVentasDiaNat), comision: Math.round(comVtaNatDia) },
          empresa: { unidades: diaVta20Emp + diaVta10Emp + diaVtaSodaEmp + diaVtaOtroEmp, monto: Math.round(totalVentasDiaEmp), comision: Math.round(comVtaEmpDia) },
        },
        natural: {
          paradas: paradasNatDia,
          bot20L: diaRec20Nat + diaVta20Nat,
          bot10L: diaRec10Nat + diaVta10Nat,
          soda: diaRecSodaNat + diaVtaSodaNat,
          totalUnidades: diaRec20Nat + diaRec10Nat + diaRecSodaNat + diaVta20Nat + diaVta10Nat + diaVtaSodaNat + diaVtaOtroNat,
          ventas: Math.round(totalVentasDiaNat),
          comision: Math.round(comisionNatDia)
        },
        empresa: {
          paradas: paradasEmpDia,
          bot20L: diaRec20Emp + diaVta20Emp,
          bot10L: diaRec10Emp + diaVta10Emp,
          soda: diaRecSodaEmp + diaVtaSodaEmp,
          totalUnidades: diaRec20Emp + diaRec10Emp + diaRecSodaEmp + diaVta20Emp + diaVta10Emp + diaVtaSodaEmp + diaVtaOtroEmp,
          ventas: Math.round(totalVentasDiaEmp),
          comision: Math.round(comisionEmpDia)
        },
        bot20Total: (diaRec20Nat + diaVta20Nat) + (diaRec20Emp + diaVta20Emp),
        bot10Total: (diaRec10Nat + diaVta10Nat) + (diaRec10Emp + diaVta10Emp),
        sodaTotal: (diaRecSodaNat + diaVtaSodaNat) + (diaRecSodaEmp + diaVtaSodaEmp),
        comisionCalculada: Math.round(comisionTotalDia)
      });
    });

    // Agrupación de desglose por Mes
    const mesesMap: Record<string, any> = {};
    desgloseDias.forEach(d => {
      const mesKey = d.fecha.substring(0, 7); // 'YYYY-MM'
      if (!mesesMap[mesKey]) {
        const [y, m] = mesKey.split('-');
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1);
        const nombreMes = dateObj.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
        mesesMap[mesKey] = {
          mesKey,
          nombreMes: nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1),
          totalRutas: 0,
          totalParadasEntregadas: 0,
          bot20Total: 0,
          bot20Natural: 0,
          bot20Empresa: 0,
          bot10Total: 0,
          bot10Natural: 0,
          bot10Empresa: 0,
          sodaTotal: 0,
          sodaNatural: 0,
          sodaEmpresa: 0,
          totalUnidades: 0,
          comisionTotal: 0,
          rutas: []
        };
      }
      const mes = mesesMap[mesKey];
      mes.totalRutas++;
      mes.totalParadasEntregadas += d.paradasEntregadas;
      mes.bot20Total += d.bot20Total;
      mes.bot20Natural += d.natural.bot20L;
      mes.bot20Empresa += d.empresa.bot20L;
      mes.bot10Total += d.bot10Total;
      mes.bot10Natural += d.natural.bot10L;
      mes.bot10Empresa += d.empresa.bot10L;
      mes.sodaTotal += d.sodaTotal;
      mes.sodaNatural += d.natural.soda;
      mes.sodaEmpresa += d.empresa.soda;
      mes.totalUnidades += (d.natural.totalUnidades + d.empresa.totalUnidades);
      mes.comisionTotal += d.comisionCalculada;
      mes.rutas.push(d);
    });
    const desgloseMeses = Object.values(mesesMap);

    const totalParadas = totalParadasNatural + totalParadasEmpresa;

    const totalRecNat = rec20Nat + rec10Nat + recSodaNat;
    const totalRecEmp = rec20Emp + rec10Emp + recSodaEmp;
    const totalRecGeneral = totalRecNat + totalRecEmp;

    const totalVtaCantNat = vta20Nat + vta10Nat + vtaSodaNat + vtaOtroNat;
    const totalVtaCantEmp = vta20Emp + vta10Emp + vtaSodaEmp + vtaOtroEmp;
    const totalVtaCantGeneral = totalVtaCantNat + totalVtaCantEmp;

    const totalMontoVentasNat = montoRecNat + montoVtaNat;
    const totalMontoVentasEmp = montoRecEmp + montoVtaEmp;
    const totalMontoVentasGeneral = totalMontoVentasNat + totalMontoVentasEmp;

    let comisionTotalNatural = 0;
    let comisionTotalEmpresa = 0;

    if (config.tipo === 'MONTO_UNIDAD') {
      comisionTotalNatural = comisionRecargasNatTotal;
      comisionTotalEmpresa = comisionRecargasEmpTotal;
    } else if (config.tipo === 'PORCENTAJE') {
      comisionTotalNatural = comisionVentasNatTotal;
      comisionTotalEmpresa = comisionVentasEmpTotal;
    } else {
      // ENTREGAS_Y_VENTAS
      comisionTotalNatural = comisionRecargasNatTotal + comisionVentasNatTotal;
      comisionTotalEmpresa = comisionRecargasEmpTotal + comisionVentasEmpTotal;
    }

    const comisionTotalGeneral = comisionTotalNatural + comisionTotalEmpresa;

    return {
      success: true,
      config,
      resumen: {
        totalRutas: rutas.length,
        totalParadasEntregadas: totalParadas,

        // Desglose por Medio de Pago y Producto según reglas de comisión
        mediosPagoDetalle: {
          bot20EfectivoTarjeta: bot20EfectivoNat + bot20EfectivoEmp,
          bot20TransferenciaCredito: bot20CreditoNat + bot20CreditoEmp,
          bot10L: rec10Nat + rec10Emp + vta10Nat + vta10Emp,
          soda: recSodaNat + recSodaEmp + vtaSodaNat + vtaSodaEmp,
          tarifa20Efectivo: config.monto20L_efectivoTarjeta,
          tarifa20Credito: config.monto20L_transferenciaCredito,
          tarifa10: config.monto10L,
          tarifaSoda: config.montoSoda,
          subtotal20Efectivo: (bot20EfectivoNat + bot20EfectivoEmp) * config.monto20L_efectivoTarjeta,
          subtotal20Credito: (bot20CreditoNat + bot20CreditoEmp) * config.monto20L_transferenciaCredito,
          subtotal10: (rec10Nat + rec10Emp + vta10Nat + vta10Emp) * config.monto10L,
          subtotalSoda: (recSodaNat + recSodaEmp + vtaSodaNat + vtaSodaEmp) * config.montoSoda,
        },

        // 1. RECARGAS (ENTREGAS)
        recargas: {
          totalCantidades: totalRecGeneral,
          comisionTotal: Math.round(comisionRecargasNatTotal + comisionRecargasEmpTotal),
          natural: {
            bot20L: rec20Nat,
            bot10L: rec10Nat,
            soda: recSodaNat,
            total: totalRecNat,
            monto: Math.round(montoRecNat),
            comision: Math.round(comisionRecargasNatTotal)
          },
          empresa: {
            bot20L: rec20Emp,
            bot10L: rec10Emp,
            soda: recSodaEmp,
            total: totalRecEmp,
            monto: Math.round(montoRecEmp),
            comision: Math.round(comisionRecargasEmpTotal)
          }
        },

        // 2. VENTAS (CANTIDADES PRIMERO, DSP MONTO)
        ventas: {
          totalCantidades: totalVtaCantGeneral > 0 ? totalVtaCantGeneral : totalRecGeneral,
          totalMonto: Math.round(totalMontoVentasGeneral),
          comisionTotal: Math.round(comisionVentasNatTotal + comisionVentasEmpTotal),
          natural: {
            bot20L: vta20Nat,
            bot10L: vta10Nat,
            soda: vtaSodaNat,
            otros: vtaOtroNat,
            totalCantidades: totalVtaCantNat > 0 ? totalVtaCantNat : totalRecNat,
            monto: Math.round(totalMontoVentasNat),
            comision: Math.round(comisionVentasNatTotal)
          },
          empresa: {
            bot20L: vta20Emp,
            bot10L: vta10Emp,
            soda: vtaSodaEmp,
            otros: vtaOtroEmp,
            totalCantidades: totalVtaCantEmp > 0 ? totalVtaCantEmp : totalRecEmp,
            monto: Math.round(totalMontoVentasEmp),
            comision: Math.round(comisionVentasEmpTotal)
          }
        },

        // Resumen general
        totalBot20L: rec20Nat + rec20Emp + vta20Nat + vta20Emp,
        totalBot10L: rec10Nat + rec10Emp + vta10Nat + vta10Emp,
        totalSoda: recSodaNat + recSodaEmp + vtaSodaNat + vtaSodaEmp,
        totalUnidades: totalRecGeneral + totalVtaCantGeneral,
        totalVentasMonto: Math.round(totalMontoVentasGeneral),
        comisionTotalCalculada: Math.round(comisionTotalGeneral),
        comisionRecargasTotal: Math.round(comisionRecargasNatTotal + comisionRecargasEmpTotal),
        comisionVentasTotal: Math.round(comisionVentasNatTotal + comisionVentasEmpTotal),

        natural: {
          paradasEntregadas: totalParadasNatural,
          bot20L: rec20Nat + vta20Nat,
          bot10L: rec10Nat + vta10Nat,
          soda: recSodaNat + vtaSodaNat,
          totalUnidades: totalRecNat + totalVtaCantNat,
          ventasMonto: Math.round(totalMontoVentasNat),
          comisionCalculada: Math.round(comisionTotalNatural),
          comisionRecargas: Math.round(comisionRecargasNatTotal),
          comisionVentas: Math.round(comisionVentasNatTotal),
          porcentajeDelTotalComision: comisionTotalGeneral > 0
            ? Math.round((comisionTotalNatural / comisionTotalGeneral) * 100)
            : 0
        },
        empresa: {
          paradasEntregadas: totalParadasEmpresa,
          bot20L: rec20Emp + vta20Emp,
          bot10L: rec10Emp + vta10Emp,
          soda: recSodaEmp + vtaSodaEmp,
          totalUnidades: totalRecEmp + totalVtaCantEmp,
          ventasMonto: Math.round(totalMontoVentasEmp),
          comisionCalculada: Math.round(comisionTotalEmpresa),
          comisionRecargas: Math.round(comisionRecargasEmpTotal),
          comisionVentas: Math.round(comisionVentasEmpTotal),
          porcentajeDelTotalComision: comisionTotalGeneral > 0
            ? Math.round((comisionTotalEmpresa / comisionTotalGeneral) * 100)
            : 0
        }
      },
      desgloseMeses,
      desgloseDias
    };
  } catch (error: any) {
    console.error('Error al calcular comisiones:', error);
    return { success: false, message: error.message || 'Error al procesar el cálculo de comisiones.' };
  }
}
