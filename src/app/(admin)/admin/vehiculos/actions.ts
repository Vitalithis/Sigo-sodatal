'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface VehiculoInput {
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  kilometraje_actual: number;
  estado: 'ACTIVO' | 'EN_MANTENCION' | 'FUERA_DE_SERVICIO';
}

export interface MantencionInput {
  vehiculo_id: string;
  fecha: string;
  tipo: string;
  kilometraje: number;
  mano_de_obra: number;
  observaciones?: string;
  taller: string;
  repuestos: { nombre: string; cantidad: number; costo_unitario: number }[];
}

// ==========================================
// ACTIONS DE VEHÍCULOS
// ==========================================

export async function crearVehiculoAction(data: VehiculoInput) {
  try {
    const patenteNormalizada = data.patente.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Cambiado de prisma.vehiculos a prisma.vehiculo (singular según tu schema)
    const existe = await prisma.vehiculo.findUnique({
      where: { patente: patenteNormalizada }
    });

    if (existe) {
      return { success: false, message: 'La patente ya se encuentra registrada en el sistema.' };
    }

    const nuevo = await prisma.vehiculo.create({
      data: {
        patente: patenteNormalizada,
        marca: data.marca,
        modelo: data.modelo,
        anio: Number(data.anio),
        kilometraje_actual: Number(data.kilometraje_actual),
        estado: data.estado
      }
    });

    revalidatePath('/admin/vehiculos');
    return { success: true, data: nuevo };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error interno al crear vehículo.' };
  }
}

export async function editarVehiculoAction(id: string, data: Partial<VehiculoInput>) {
  try {
    // Cambiado a prisma.vehiculo
    const actualizado = await prisma.vehiculo.update({
      where: { id },
      data: {
        ...(data.marca && { marca: data.marca }),
        ...(data.modelo && { modelo: data.modelo }),
        ...(data.anio && { anio: Number(data.anio) }),
        ...(data.kilometraje_actual && { kilometraje_actual: Number(data.kilometraje_actual) }),
        ...(data.estado && { estado: data.estado })
      }
    });

    revalidatePath('/admin/vehiculos');
    return { success: true, data: actualizado };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al actualizar el vehículo.' };
  }
}

// ==========================================
// ACTIONS DE MANTENCIONES Y ALERTAS
// ==========================================

export async function registrarMantencionAction(data: MantencionInput) {
  try {
    const costoRepuestosTotal = data.repuestos.reduce(
      (sum, r) => sum + (r.cantidad * r.costo_unitario), 0
    );
    const costoTotal = costoRepuestosTotal + Number(data.mano_de_obra);

    const resultado = await prisma.$transaction(async (tx) => {
      // Cambiado a tx.mantencion
      const mantencion = await tx.mantencion.create({
        data: {
          vehiculo_id: data.vehiculo_id,
          fecha: new Date(data.fecha),
          tipo: data.tipo,
          kilometraje: Number(data.kilometraje),
          mano_de_obra: Number(data.mano_de_obra),
          costo_repuestos: costoRepuestosTotal,
          costo_total: costoTotal,
          taller: data.taller,
          observaciones: data.observaciones || ''
        }
      });

      // Cambiado a tx.repuestoMantencion (Prisma mapea repuestos_mantencion como camelCase)
      if (data.repuestos.length > 0) {
        await tx.repuestoMantencion.createMany({
          data: data.repuestos.map(r => ({
            mantencion_id: mantencion.id,
            nombre: r.nombre,
            cantidad: Number(r.cantidad),
            costo_unitario: Number(r.costo_unitario)
          }))
        });
      }

      // Cambiado a tx.vehiculo
      const vehiculo = await tx.vehiculo.findUnique({ where: { id: data.vehiculo_id } });
      if (vehiculo && Number(data.kilometraje) > vehiculo.kilometraje_actual) {
        await tx.vehiculo.update({
          where: { id: data.vehiculo_id },
          data: { kilometraje_actual: Number(data.kilometraje) }
        });
      }

      // Cambiado a tx.alertaVehiculo y usando enum 'KM' en mayúsculas
      await tx.alertaVehiculo.updateMany({
        where: {
          vehiculo_id: data.vehiculo_id,
          tipo: 'KM',
          valor_km: { lte: Number(data.kilometraje) },
          activa: true
        },
        data: { activa: false }
      });

      return mantencion;
    });

    revalidatePath('/admin/vehiculos');
    return { success: true, data: resultado };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al asentar la mantención técnica.' };
  }
}

export async function crearAlertaVehiculoAction(vehiculoId: string, tipo: 'KM' | 'FECHA', valorKm?: number, fechaAlerta?: string) {
  try {
    // Cambiado a prisma.alertaVehiculo
    const nuevaAlerta = await prisma.alertaVehiculo.create({
      data: {
        vehiculo_id: vehiculoId,
        tipo,
        valor_km: valorKm ? Number(valorKm) : null,
        fecha_alerta: fechaAlerta ? new Date(fechaAlerta) : null,
        activa: true
      }
    });

    revalidatePath('/admin/vehiculos');
    return { success: true, data: nuevaAlerta };
  } catch (error: any) {
    return { success: false, message: 'No se pudo configurar la alerta preventiva.' };
  }
}
// Acción para modificar una alerta existente
export async function modificarAlertaAction(
  alertaId: string,
  valores: { valor_km?: number; fecha_alerta?: string; tipo: 'KM' | 'FECHA' }
) {
  try {
    await prisma.alertaVehiculo.update({
      where: { id: alertaId },
      data: {
        tipo: valores.tipo,
        valor_km: valores.tipo === 'KM' ? valores.valor_km : null,
        fecha_alerta: valores.tipo === 'FECHA' && valores.fecha_alerta ? new Date(valores.fecha_alerta) : null,
      },
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al modificar la alerta.' };
  }
}

// Acción para eliminar/quitar una alerta manualmente
export async function eliminarAlertaAction(alertaId: string) {
  try {
    await prisma.alertaVehiculo.delete({
      where: { id: alertaId },
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al eliminar la alerta.' };
  }
}