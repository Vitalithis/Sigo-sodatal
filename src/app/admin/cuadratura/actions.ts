'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/src/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { TipoTransaccion, TipoCliente, MetodoPago } from '@/lib/prisma/generated';

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
    numero_factura: string;
    ruta_factura: string;
  } | null;
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
}

export interface GastoInput {
  tipo: string;
  monto: number;
  descripcion?: string;
}

export interface CierreCuadraturaInput {
  cuadratura_id: string;
  ventas: ItemVentaInput[];
  retorno: ItemRetornoInput[];
  botellones_vacios: BotellonesVaciosInput;
  gastos: GastoInput[];
  monto_bencina?: number;
  km_final: number; // OBLIGATORIO AL CIERRE
}

// ----------------------------------------------------------------
// Consultas
// ----------------------------------------------------------------
export async function obtenerCuadraturasAction(desde?: string, hasta?: string, usuario_id?: string) {
  try {
    const where: any = {};
    if (usuario_id) where.usuario_id = usuario_id;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = new Date(`${desde}T00:00:00`);
      if (hasta) where.fecha.lte = new Date(`${hasta}T23:59:59`);
    }

    const cuadraturas = await prisma.cuadratura.findMany({
      where,
      include: {
        usuario: { select: { nombre: true, apellido: true, rol: true } },
        salida: { include: { producto: true } }, // <-- Para poder ver el detalle
        _count: { select: { ventas: true, retorno: true, gastos: true } },
      },
      orderBy: { fecha: 'desc' },
      take: 60,
    });

    return { success: true, cuadraturas };
  } catch (error: any) {
    return { success: false, cuadraturas: [], message: error.message };
  }
}

export async function obtenerCuadraturaDetalleAction(id: string) {
  try {
    const cuadratura = await prisma.cuadratura.findUnique({
      where: { id },
      include: {
        usuario: { select: { nombre: true, apellido: true, rol: true, recibe_comision: true } },
        salida: { include: { producto: true } },
        ventas: { include: { producto: true, guia: { select: { numero_correlativo: true } } } },
        retorno: { include: { producto: true } },
        botellones_vacios: true,
        gastos: true,
      },
    });
    if (!cuadratura) return { success: false, message: 'La cuadratura no existe.' };
    return { success: true, cuadratura };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function obtenerRepartidoresCuadraturaAction() {
  try {
    const repartidores = await prisma.usuario.findMany({
      where: { rol: 'REPARTIDOR', activo: true },
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, apellido: true, recibe_comision: true },
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
    const fechaNormalizada = new Date(`${fecha}T00:00:00`);
    const cuadratura = await prisma.cuadratura.findFirst({
      where: { usuario_id, fecha: fechaNormalizada },
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
    const inicio = new Date(`${fecha}T00:00:00`);
    const fin = new Date(`${fecha}T23:59:59`);
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
// SALIDA (Apertura o Acumulación en el día)
// ----------------------------------------------------------------
export async function registrarSalidaAction(data: SalidaInput) {
  try {
    if (!data.usuario_id) return { success: false, message: 'Debes seleccionar un repartidor.' };
    if (!data.fecha) return { success: false, message: 'Debes indicar la fecha.' };
    const items = (data.items || []).filter((it) => it.cantidad > 0);
    if (items.length === 0) {
      return { success: false, message: 'Debes indicar al menos un producto.' };
    }

    const fechaNormalizada = new Date(`${data.fecha}T00:00:00`);

    const cuadraturaId = await prisma.$transaction(async (tx) => {
      let cuadratura = await tx.cuadratura.findFirst({
        where: { usuario_id: data.usuario_id, fecha: fechaNormalizada },
        include: { salida: true },
      });

      if (cuadratura && cuadratura.estado === 'CERRADA') {
        throw new Error('La cuadratura de ese día ya está cerrada. Un ADMIN debe reabrirla antes de agregar más carga.');
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

      // Registramos Combustible si viene en el payload
      if (data.combustible && data.combustible.monto > 0) {
        await tx.cuadraturaGasto.create({
          data: {
            cuadratura_id: cuadratura.id,
            tipo: 'COMBUSTIBLE',
            monto: data.combustible.monto,
            descripcion: `[${data.combustible.tipo_combustible}] Factura: ${data.combustible.numero_factura || 'S/N'} | Enlace: ${data.combustible.ruta_factura || 'S/N'}`,
          }
        });
      }

      return cuadratura.id;
    });

    revalidatePath('/admin/cuadratura');
    return { success: true, cuadratura_id: cuadraturaId, alertas: [] }; // Alertas eliminadas
  } catch (error: any) {
    return { success: false, message: error.message || 'No se pudo registrar la salida.' };
  }
}

// ----------------------------------------------------------------
// CIERRE (regreso: ventas, retorno, botellones, gastos, KM FINAL)
// ----------------------------------------------------------------
export async function registrarCierreCuadraturaAction(data: CierreCuadraturaInput) {
  try {
    if (!data.cuadratura_id) return { success: false, message: 'Cuadratura no válida.' };
    if (!data.km_final || isNaN(data.km_final)) return { success: false, message: 'El kilometraje final es obligatorio.' };

    const alertas: string[] = [];

    await prisma.$transaction(async (tx) => {
      const cuadratura = await tx.cuadratura.findUnique({
        where: { id: data.cuadratura_id },
        include: { ventas: true, retorno: true, usuario: true },
      });
      if (!cuadratura) throw new Error('La cuadratura no existe.');
      if (cuadratura.estado === 'CERRADA') {
        throw new Error('Esta cuadratura ya está cerrada. Un ADMIN debe reabrirla antes de volver a registrar el cierre.');
      }

      const usuario = cuadratura.usuario;

      // --------------------------------------------------------------
      // LOGICA BLOQUE 2.2: INCIDENCIAS Y VALIDACIONES
      // --------------------------------------------------------------
      
      const inicioDia = new Date(cuadratura.fecha);
      inicioDia.setUTCHours(0, 0, 0, 0);
      const finDia = new Date(cuadratura.fecha);
      finDia.setUTCHours(23, 59, 59, 999);

      // Asociar incidencias huérfanas del día a esta cuadratura
      await tx.incidencia.updateMany({
        where: {
          usuario_id: cuadratura.usuario_id,
          cuadratura_id: null,
          created_at: { gte: inicioDia, lte: finDia },
        },
        data: { cuadratura_id: cuadratura.id },
      });

      // Extraer paradas para validar entregas y aislar pedidos WEB pagados
      const paradasDelDia = await tx.paradaDia.findMany({
        where: {
          ruta_dia: { usuario_id: cuadratura.usuario_id, fecha: cuadratura.fecha },
        },
        include: {
          pedido: { include: { items: true } },
        },
      });

      let deduccionWebEfectivo = 0;
      let deduccionWebTarjeta = 0;
      let deduccionWebTransferencia = 0;

      for (const parada of paradasDelDia) {
        if (parada.pedido) {
          // Validar que no se entregue más de lo pedido
          for (const item of parada.pedido.items) {
            if (item.cantidad_entregada !== null && item.cantidad_entregada > item.cantidad) {
              throw new Error(`Validación fallida: La cantidad entregada (${item.cantidad_entregada}) supera lo solicitado (${item.cantidad}).`);
            }
          }

          // Calcular monto de ventas WEB pagadas para descontarlas del total final
          if (parada.pedido.canal_origen === 'WEB' && parada.pedido.pagado) {
            for (const item of parada.pedido.items) {
              const prod = await tx.producto.findUnique({ where: { id: item.producto_id } });
              if (prod) {
                const precio = item.tipo_transaccion === 'RECARGA' ? (prod.precio_recarga ?? 0) : prod.precio_venta_nueva;
                const cantidadFinal = item.cantidad_entregada !== null ? item.cantidad_entregada : item.cantidad;
                const monto = precio * cantidadFinal;

                if (parada.pedido.metodo_pago_web === 'EFECTIVO') deduccionWebEfectivo += monto;
                else if (parada.pedido.metodo_pago_web === 'TARJETA') deduccionWebTarjeta += monto;
                else if (parada.pedido.metodo_pago_web === 'TRANSFERENCIA') deduccionWebTransferencia += monto;
              }
            }
          }
        }
      }
      // --------------------------------------------------------------

      // Revertir ventas y retorno anteriores
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
      
      // NOTA: NO eliminamos los gastos porque ahora ahí vive el combustible registrado en la salida

      let totalEfectivo = 0, totalTarjeta = 0, totalTransferencia = 0, totalGuiaMensual = 0, totalComision = 0;

      for (const v of data.ventas.filter((it) => it.cantidad > 0)) {
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
          const precio = v.tipo_transaccion === 'RECARGA' ? producto.precio_recarga ?? 0 : producto.precio_venta_nueva;
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

      // Aplicar deducciones de los pedidos WEB que ya estaban pagados
      totalEfectivo = Math.max(0, totalEfectivo - deduccionWebEfectivo);
      totalTarjeta = Math.max(0, totalTarjeta - deduccionWebTarjeta);
      totalTransferencia = Math.max(0, totalTransferencia - deduccionWebTransferencia);

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

      if (data.botellones_vacios?.cantidad_total > 0) {
        await tx.botellonVacio.create({
          data: {
            cuadratura_id: cuadratura.id,
            cantidad_total: data.botellones_vacios.cantidad_total,
            cantidad_danados: data.botellones_vacios.cantidad_danados || 0,
          },
        });
      }

      // ACTUALIZACION DE ESTADO, TOTALES Y KILOMETRAJE
      await tx.cuadratura.update({
        where: { id: cuadratura.id },
        data: {
          estado: 'CERRADA',
          total_efectivo: totalEfectivo,
          total_tarjeta: totalTarjeta,
          total_transferencia: totalTransferencia,
          total_guia_mensual: totalGuiaMensual,
          total_comision: totalComision,
          monto_bencina: data.monto_bencina ?? null,
          km_final: data.km_final // <-- GUARDAMOS EL KM FINAL
        },
      });

      const stocksCamionFinal = await tx.stockCamion.findMany({ where: { usuario_id: cuadratura.usuario_id } });
      for (const sc of stocksCamionFinal) {
        if (sc.cantidad < 0) {
          const producto = await tx.producto.findUnique({ where: { id: sc.producto_id } });
          alertas.push(`Stock en camión de ${producto?.nombre || 'un producto'} quedó negativo (${sc.cantidad}). Revisa las cantidades.`);
        }
      }
    });

    revalidatePath('/admin/cuadratura');
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

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const rol = user?.user_metadata?.rol;
    if (rol !== 'ADMIN') {
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