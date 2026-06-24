'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { EstadoRuta, EstadoParada, EstadoPedido, TipoCliente, CanalOrigen } from '@prisma/client';

/**
 * Obtiene todas las rutas reales y los pedidos flotantes para una fecha específica
 */
export async function obtenerRutasPorFechaAction(fechaStr: string) {
  try {
    const inicioDia = new Date(fechaStr);
    inicioDia.setHours(0, 0, 0, 0);

    const finDia = new Date(fechaStr);
    finDia.setHours(23, 59, 59, 999);

    // 1. Buscar las rutas creadas para este día específico
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

    // 2. Buscar todos los pedidos solicitados para esta fecha
    const pedidosDia = await prisma.pedido.findMany({
      where: {
        fecha_solicitada: { gte: inicioDia, lte: finDia }
      },
      include: {
        cliente: true,
        items: { include: { producto: true } }
      }
    });

    return {
      success: true,
      rutas: rutasDia,
      pedidos: pedidosDia
    };
  } catch (error: any) {
    console.error('Error al obtener rutas por fecha:', error);
    return { success: false, message: 'No se pudieron cargar los datos de la fecha.' };
  }
}

/**
 * Genera de forma automática las rutas del día basadas en la plantilla "RutaBase"
 * para el día de la semana correspondiente (LUNES, MARTES, etc.)
 */
export async function generarRutasDesdeBaseAction(fechaStr: string, diaSemanaClave: any) {
  try {
    const fechaTarget = new Date(fechaStr);
    fechaTarget.setHours(12, 0, 0, 0); // Evitar problemas de zona horaria

    // Buscar si hay plantillas configuradas para este día de la semana
    const plantillasBase = await prisma.rutaBase.findMany({
      where: { dia_semana: diaSemanaClave },
      include: {
        clientes: { orderBy: { orden: 'asc' } }
      }
    });

    if (plantillasBase.length === 0) {
      return { success: false, message: 'No hay rutas base configuradas para este día de la semana.' };
    }

    // Crear cada ruta base en el día real
    for (const base of plantillasBase) {
      const nuevaRutaDia = await prisma.rutaDia.create({
        data: {
          ruta_base_id: base.id,
          fecha: fechaTarget,
          usuario_id: base.usuario_id,
          vehiculo_id: base.vehiculo_id,
          estado: EstadoRuta.ACTIVA
        }
      });

      // Clonar los clientes fijos como paradas iniciales del día
      if (base.clientes.length > 0) {
        await prisma.paradaDia.createMany({
          data: base.clientes.map((c) => ({
            ruta_dia_id: nuevaRutaDia.id,
            cliente_id: c.cliente_id,
            orden: c.orden,
            estado: EstadoParada.PENDIENTE
          }))
        });
      }
    }

    revalidatePath('/admin/rutas');
    return { success: true };
  } catch (error: any) {
    console.error('Error al generar rutas base:', error);
    return { success: false, message: 'Error al procesar las plantillas base.' };
  }
}

/**
 * Enlaza un pedido dinámico (Llamado/Web) a una ruta en ejecución e incrementa el orden de parada
 */
export async function asignarPedidoARutaAction(pedidoId: string, rutaDiaId: string) {
  try {
    // 1. Obtener el pedido para saber quién es el cliente
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId }
    });

    if (!pedido) return { success: false, message: 'Pedido no encontrado.' };

    // 2. Contar cuántas paradas ya tiene el camión para dejar este al final
    const conteoParadas = await prisma.paradaDia.count({
      where: { ruta_dia_id: rutaDiaId }
    });

    // 3. Crear la parada vinculada al pedido
    await prisma.paradaDia.create({
      data: {
        ruta_dia_id: rutaDiaId,
        cliente_id: pedido.cliente_id,
        pedido_id: pedido.id,
        orden: conteoParadas + 1,
        estado: EstadoParada.PENDIENTE
      }
    });

    // 4. Actualizar el estado del Pedido original a ASIGNADO
    await prisma.pedido.update({
      where: { id: pedidoId },
      data: { 
        ruta_dia_id: rutaDiaId,
        estado: EstadoPedido.ASIGNADO
      }
    });

    revalidatePath('/admin/rutas');
    return { success: true };
  } catch (error: any) {
    console.error('Error al vincular pedido:', error);
    return { success: false, message: 'No se pudo asignar el pedido al camión.' };
  }
}

export async function buscarClientePorTelefonoAction(telefono: string) {
  try {
    const cliente = await prisma.cliente.findFirst({
      where: { telefono: { contains: telefono } }
    });
    return { success: true, cliente };
  } catch (error) {
    return { success: false, cliente: null };
  }
}

export async function obtenerProductosAction() {
  try {
    const productos = await prisma.producto.findMany(); // Sin el where, trae todo
    return { success: true, productos };
  } catch (error) {
    return { success: false, productos: [] };
  }
}

export async function guardarPedidoRapidoAction(datos: {
  fecha_solicitada: string;
  cliente_id?: string;
  nuevo_cliente?: { nombre: string; telefono: string; direccion: string };
  producto_id: string;
  cantidad: number;
}) {
  try {
    let clienteId = datos.cliente_id;

    // Buscamos un usuario para asignarlo como creador del pedido (requisito de tu DB)
    const usuarioRegistro = await prisma.usuario.findFirst();
    if (!usuarioRegistro) throw new Error("No existe ningún usuario en el sistema para registrar la orden.");

    // 1. Si no hay cliente_id, significa que es un cliente nuevo y debemos crearlo
    if (!clienteId && datos.nuevo_cliente) {
      const nuevo = await prisma.cliente.create({
        data: {
          nombre: datos.nuevo_cliente.nombre,
          telefono: datos.nuevo_cliente.telefono,
          direccion: datos.nuevo_cliente.direccion,
          // 👇 SOLUCIÓN: Usamos el Enum importado de Prisma. 
          // Si 'HOGAR' te da error, bórralo, pon el punto y elige una de tus opciones (ej: TipoCliente.PARTICULAR o TipoCliente.INDIVIDUAL)
          tipo: TipoCliente.DOMICILIO, 
        }
      });
      clienteId = nuevo.id;
    }

    if (!clienteId) throw new Error("No se pudo definir el cliente.");

    // 2. Obtener el producto para guardar el precio histórico
    const producto = await prisma.producto.findUnique({ where: { id: datos.producto_id } });
    if (!producto) throw new Error("Producto no encontrado");

    const fechaTarget = new Date(datos.fecha_solicitada + 'T12:00:00');

    // 3. Crear el pedido
    await prisma.pedido.create({
      data: {
        cliente_id: clienteId,
        fecha_solicitada: fechaTarget,
        estado: EstadoPedido.PENDIENTE_CONFIRMACION,
        // 👇 SOLUCIÓN: Usamos el Enum importado de Prisma.
        // Si 'LLAMADO' te da error, bórralo, pon el punto y elige tu opción (ej: CanalOrigen.TELEFONO, CanalOrigen.WHATSAPP, etc.)
        canal_origen: CanalOrigen.LLAMADO, 
        usuario_registro_id: usuarioRegistro.id, 
        items: {
          create: {
            producto_id: producto.id,
            cantidad: datos.cantidad,
            tipo_transaccion: 'VENTA',
            precio_historico: producto.precio_venta_nueva 
          }
        }
      }
    });

    revalidatePath('/admin/rutas');
    return { success: true };
  } catch (error: any) {
    console.error('Error al guardar pedido rápido:', error);
    return { success: false, message: error.message };
  }
}