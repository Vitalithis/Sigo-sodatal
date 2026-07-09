'use server';

import { prisma } from '@/src/lib/prisma';
import { revalidatePath } from 'next/cache';
import { CategoriaProducto } from '@/src/lib/prisma/generated';

// ────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────
export interface ProduccionDiariaInput {
  fecha: string; // YYYY-MM-DD
  botellon10_cantidad: number;
  botellon20_cantidad: number;
  sodas_cantidad: number;
  ph: number;
  ppm: number;
  observaciones?: string;
  usuario_id: string;
}

export interface TuboCO2Input {
  fecha_llegada: string; // YYYY-MM-DD
  peso_kg: number;
  rendimiento_estimado?: number; // opcional: si no se manda, se autocompleta desde configuración
}

export interface ConfiguracionCO2Input {
  co2_rendimiento_45kg?: number;
  co2_rendimiento_35kg?: number;
  co2_alerta_porcentaje?: number;
}

export type ProduccionDiariaResult =
  | { success: true; produccion: Awaited<ReturnType<typeof prisma.produccionDiaria.create>>; alertaCO2: string | null }
  | { success: false; message: string };

// ────────────────────────────────────────────────────────────────
// PRODUCCIÓN DIARIA
// ────────────────────────────────────────────────────────────────

export async function obtenerProduccionAction(desde?: string, hasta?: string) {
  try {
    const where: any = {};
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = new Date(`${desde}T00:00:00`);
      if (hasta) where.fecha.lte = new Date(`${hasta}T23:59:59`);
    }

    const produccion = await prisma.produccionDiaria.findMany({
      where,
      include: { usuario: { select: { nombre: true, apellido: true } } },
      orderBy: { fecha: 'desc' },
      take: 90,
    });

    return { success: true, produccion };
  } catch (error: any) {
    return { success: false, produccion: [], message: error.message };
  }
}

export async function crearProduccionDiariaAction(data: ProduccionDiariaInput): Promise<ProduccionDiariaResult> {
  try {
    if (!data.fecha) return { success: false, message: 'Debes indicar la fecha de producción.' };
    if (!data.usuario_id) return { success: false, message: 'Debes seleccionar quién registra la producción.' };
    if (data.ph === undefined || data.ph === null) return { success: false, message: 'Debes indicar el pH medido.' };
    if (data.ppm === undefined || data.ppm === null) return { success: false, message: 'Debes indicar el PPM medido.' };

    const fechaNormalizada = new Date(`${data.fecha}T00:00:00`);

    const existente = await prisma.produccionDiaria.findUnique({ where: { fecha: fechaNormalizada } });
    if (existente) {
      return { success: false, message: 'Ya existe un registro de producción para esa fecha.' };
    }

    const botellon10 = Math.max(0, Math.trunc(data.botellon10_cantidad || 0));
    const botellon20 = Math.max(0, Math.trunc(data.botellon20_cantidad || 0));
    const sodas = Math.max(0, Math.trunc(data.sodas_cantidad || 0));

    let alertaCO2: string | null = null;

    const registro = await prisma.$transaction(async (tx) => {
      const creado = await tx.produccionDiaria.create({
        data: {
          fecha: fechaNormalizada,
          botellon10_cantidad: botellon10,
          botellon20_cantidad: botellon20,
          sodas_cantidad: sodas,
          ph: data.ph,
          ppm: data.ppm,
          observaciones: data.observaciones || null,
          usuario_id: data.usuario_id,
        },
      });

      // Regla de negocio 2: el stock de fábrica sube con la producción del día
      const movimientos: { categoria: CategoriaProducto; cantidad: number }[] = [
        { categoria: 'BOTELLON10', cantidad: botellon10 },
        { categoria: 'BOTELLON20', cantidad: botellon20 },
        { categoria: 'SODA', cantidad: sodas },
      ];

      for (const mov of movimientos) {
        if (mov.cantidad <= 0) continue;
        const producto = await tx.producto.findFirst({ where: { categoria: mov.categoria, activo: true } });
        if (!producto) continue; // no bloquea la producción si el producto no existe en catálogo
        await tx.stockFabrica.upsert({
          where: { producto_id: producto.id },
          create: { producto_id: producto.id, cantidad: mov.cantidad },
          update: { cantidad: { increment: mov.cantidad } },
        });
      }

      // Regla de negocio 4: consumo de CO₂ al producir sodas
      if (sodas > 0) {
        const tuboActivo = await tx.tuboCO2.findFirst({ where: { activo: true }, orderBy: { fecha_llegada: 'asc' } });

        if (!tuboActivo) {
          alertaCO2 = 'Se registraron sodas pero no hay un tubo de CO₂ activo. Ingresa un tubo nuevo cuanto antes.';
        } else {
          const kgConsumidos = sodas * (tuboActivo.peso_kg / tuboActivo.rendimiento_estimado);
          const nuevoKgConsumidos = tuboActivo.kg_consumidos + kgConsumidos;
          const seAgoto = nuevoKgConsumidos >= tuboActivo.peso_kg;

          await tx.tuboCO2.update({
            where: { id: tuboActivo.id },
            data: {
              kg_consumidos: nuevoKgConsumidos,
              sodas_producidas_total: { increment: sodas },
              activo: !seAgoto,
              fecha_cierre: seAgoto ? new Date() : null,
            },
          });

          if (seAgoto) {
            alertaCO2 = 'El tubo de CO₂ activo se agotó con esta producción. Ingresa un tubo nuevo antes de seguir produciendo sodas.';
          } else {
            const restante = Math.max(tuboActivo.peso_kg - nuevoKgConsumidos, 0);
            const porcentajeRestante = (restante / tuboActivo.peso_kg) * 100;

            const configAlerta = await tx.configuracion.findUnique({ where: { clave: 'co2_alerta_porcentaje' } });
            const umbral = configAlerta ? parseFloat(configAlerta.valor) : 20;

            if (porcentajeRestante <= umbral) {
              alertaCO2 = `El tubo de CO₂ activo quedó al ${porcentajeRestante.toFixed(1)}% de su capacidad. Considera tener un tubo de respaldo listo.`;
            }
          }
        }
      }

      return creado;
    });

    revalidatePath('/admin/produccion');
    return { success: true, produccion: registro, alertaCO2 };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ────────────────────────────────────────────────────────────────
// TUBOS DE CO₂
// ────────────────────────────────────────────────────────────────

export async function obtenerTubosCO2Action() {
  try {
    const tubos = await prisma.tuboCO2.findMany({ orderBy: { fecha_llegada: 'desc' }, take: 50 });
    return { success: true, tubos };
  } catch (error: any) {
    return { success: false, tubos: [], message: error.message };
  }
}

export async function crearTuboCO2Action(data: TuboCO2Input) {
  try {
    if (!data.fecha_llegada) return { success: false, message: 'Debes indicar la fecha de llegada del tubo.' };
    if (!data.peso_kg || data.peso_kg <= 0) return { success: false, message: 'Debes indicar el peso del tubo en kg.' };

    let rendimiento = data.rendimiento_estimado;

    if (!rendimiento) {
      const clave = data.peso_kg === 45 ? 'co2_rendimiento_45kg' : data.peso_kg === 35 ? 'co2_rendimiento_35kg' : null;
      if (clave) {
        const config = await prisma.configuracion.findUnique({ where: { clave } });
        rendimiento = config ? parseInt(config.valor, 10) : undefined;
      }
    }

    if (!rendimiento || rendimiento <= 0) {
      return {
        success: false,
        message: 'No hay un rendimiento configurado para ese peso de tubo. Indica el rendimiento estimado manualmente.',
      };
    }

    await prisma.$transaction(async (tx) => {
      // Solo puede existir un tubo activo a la vez: cerramos cualquier otro que siga activo
      await tx.tuboCO2.updateMany({
        where: { activo: true },
        data: { activo: false, fecha_cierre: new Date() },
      });

      await tx.tuboCO2.create({
        data: {
          fecha_llegada: new Date(`${data.fecha_llegada}T00:00:00`),
          peso_kg: data.peso_kg,
          rendimiento_estimado: rendimiento,
          activo: true,
        },
      });
    });

    revalidatePath('/admin/produccion');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function cerrarTuboCO2Action(tuboId: string) {
  try {
    await prisma.tuboCO2.update({
      where: { id: tuboId },
      data: { activo: false, fecha_cierre: new Date() },
    });
    revalidatePath('/admin/produccion');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ────────────────────────────────────────────────────────────────
// CONFIGURACIÓN CO₂ (rendimientos y umbral de alerta)
// ────────────────────────────────────────────────────────────────

export async function obtenerConfiguracionCO2Action() {
  try {
    const config = await prisma.configuracion.findMany({
      where: { clave: { in: ['co2_rendimiento_45kg', 'co2_rendimiento_35kg', 'co2_alerta_porcentaje'] } },
    });
    return { success: true, config };
  } catch (error: any) {
    return { success: false, config: [], message: error.message };
  }
}

export async function actualizarConfiguracionCO2Action(valores: ConfiguracionCO2Input) {
  try {
    const entradas = Object.entries(valores).filter(([, v]) => v !== undefined && v !== null) as [string, number][];
    if (entradas.length === 0) return { success: false, message: 'No hay valores para actualizar.' };

    for (const [clave, valor] of entradas) {
      await prisma.configuracion.upsert({
        where: { clave },
        create: { clave, valor: String(valor) },
        update: { valor: String(valor) },
      });
    }

    revalidatePath('/admin/produccion');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ────────────────────────────────────────────────────────────────
// Datos auxiliares
// ────────────────────────────────────────────────────────────────

export async function obtenerResponsablesProduccionAction() {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { rol: { in: ['ADMIN', 'OFICINA'] }, activo: true },
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, apellido: true },
    });
    return { success: true, usuarios };
  } catch (error: any) {
    return { success: false, usuarios: [], message: error.message };
  }
}