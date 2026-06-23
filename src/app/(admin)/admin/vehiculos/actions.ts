'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface ConductorInput {
  rut: string;
  nombre: string; // Nombre completo (ya que no existe el campo apellido en el esquema)
  telefono: string;
  email: string; // Campo obligatorio en tu modelo Usuario
  licencia_tipo?: string | null;
  vencimiento_lic?: string | null; // Formato YYYY-MM-DD desde el formulario
  activo: boolean; // Tu esquema maneja 'activo: Boolean' en lugar de estados de string
}

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
  usuario_id?: string | null; // Cambiado conductor_id -> usuario_id según tu esquema
  fecha: string;
  tipo: string;
  kilometraje: number;
  mano_de_obra: number;
  observaciones?: string;
  taller: string;
  repuestos: { nombre: string; cantidad: number; costo_unitario: number }[];
}

export interface CargaCombustibleInput {
  vehiculo_id: string;
  usuario_id?: string | null; // Cambiado conductor_id -> usuario_id según tu esquema
  fecha: string;
  kilometraje: number;
  litros: number;
  monto: number;
  taller_o_bencinera: string;
  numero_factura?: number | null;
}

// ==========================================
// ACTIONS DE VEHÍCULOS
// ==========================================

export async function crearVehiculoAction(data: VehiculoInput) {
  try {
    const patenteNormalizada = data.patente.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
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
      const mantencion = await tx.mantencion.create({
        data: {
          vehiculo_id: data.vehiculo_id,
          usuario_id: data.usuario_id || null, // Corregido a usuario_id
          fecha: new Date(data.fecha),
          tipo: data.tipo,
          kilometraje: Number(data.kilometraje),
          mano_de_obra: Number(data.mano_de_obra),
          costo_total: costoTotal,
          taller: data.taller,
          observaciones: data.observaciones || ''
        }
      });

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

      const vehiculo = await tx.vehiculo.findUnique({ where: { id: data.vehiculo_id } });
      if (vehiculo && Number(data.kilometraje) > vehiculo.kilometraje_actual) {
        await tx.vehiculo.update({
          where: { id: data.vehiculo_id },
          data: { kilometraje_actual: Number(data.kilometraje) }
        });
      }

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
    return { success: false, message: 'No se pudo configure la alerta preventiva.' };
  }
}

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
    revalidatePath('/admin/vehiculos');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al modificar la alerta.' };
  }
}

export async function eliminarAlertaAction(alertaId: string) {
  try {
    await prisma.alertaVehiculo.delete({
      where: { id: alertaId },
    });
    revalidatePath('/admin/vehiculos');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al eliminar la alerta.' };
  }
}

// ==========================================
// ACTIONS DE RENDIMIENTO DE COMBUSTIBLE
// ==========================================

export async function registrarCargaCombustibleAction(data: CargaCombustibleInput) {
  try {
    if (!data.numero_factura || Number(data.numero_factura) <= 0) {
      return { 
        success: false, 
        message: 'El número de factura es obligatorio para registrar cargas de combustible.' 
      };
    }

    const resultado = await prisma.$transaction(async (tx) => {
      
      const nuevaCarga = await tx.cargaCombustible.create({
        data: {
          vehiculo_id: data.vehiculo_id,
          usuario_id: data.usuario_id || null, // Corregido a usuario_id
          fecha: new Date(data.fecha),
          kilometraje: Number(data.kilometraje),
          litros: Number(data.litros),
          monto: Number(data.monto),
          taller_o_bencinera: data.taller_o_bencinera,
          numero_factura: Number(data.numero_factura)
        }
      });

      const vehiculo = await tx.vehiculo.findUnique({ where: { id: data.vehiculo_id } });
      if (vehiculo && Number(data.kilometraje) > vehiculo.kilometraje_actual) {
        await tx.vehiculo.update({
          where: { id: data.vehiculo_id },
          data: { kilometraje_actual: Number(data.kilometraje) }
        });
      }

      await tx.alertaVehiculo.updateMany({
        where: {
          vehiculo_id: data.vehiculo_id,
          tipo: 'KM',
          valor_km: { lte: Number(data.kilometraje) },
          activa: true
        },
        data: { activa: false }
      });

      return nuevaCarga;
    });

    revalidatePath('/admin/vehiculos');
    return { success: true, data: resultado };
    
  } catch (error: any) {
    console.error("❌ ERROR DETECTADO EN registrarCargaCombustibleAction:", error);
    return { success: false, message: error.message || 'Error al registrar la carga de combustible.' };
  }
}

export async function obtenerCargasCombustibleAction(vehiculoId: string) {
  try {
    const cargas = await prisma.cargaCombustible.findMany({
      where: {
        vehiculo_id: vehiculoId,
      },
      orderBy: {
        fecha: 'desc',
      },
    });
    
    return { success: true, data: cargas };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al obtener el historial.' };
  }
}

// ==========================================
// ACTIONS DE CONDUCTORES / CHOFERES (Mapeados al modelo Usuario y Rol REPARTIDOR)
// ==========================================

export async function crearConductorAction(data: ConductorInput) {
  try {
    const rutNormalizado = data.rut.toUpperCase().replace(/[^0-9Kk]/g, '');

    // Buscamos si existe el RUT en la tabla de usuarios
    const existe = await prisma.usuario.findUnique({
      where: { rut: rutNormalizado }
    });

    if (existe) {
      return { success: false, message: 'El RUT ya se encuentra asignado a un usuario.' };
    }

    const nuevoConductor = await prisma.usuario.create({
      data: {
        rut: rutNormalizado,
        nombre: data.nombre,
        telefono: data.telefono || '',
        email: data.email,
        rol: 'REPARTIDOR', // Rol para choferes según tus Enums
        fecha_ingreso: new Date(),
        activo: data.activo,
        licencia_tipo: data.licencia_tipo || null,
        vencimiento_lic: data.vencimiento_lic ? new Date(data.vencimiento_lic) : null
      }
    });

    revalidatePath('/admin/vehiculos');
    return { success: true, data: nuevoConductor };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al registrar conductor.' };
  }
}

export async function editarConductorAction(id: string, data: Partial<ConductorInput>) {
  try {
    const actualizado = await prisma.usuario.update({
      where: { id },
      data: {
        ...(data.nombre && { nombre: data.nombre }),
        ...(data.telefono !== undefined && { telefono: data.telefono || '' }),
        ...(data.email && { email: data.email }),
        ...(data.licencia_tipo !== undefined && { licencia_tipo: data.licencia_tipo }),
        ...(data.vencimiento_lic && { vencimiento_lic: new Date(data.vencimiento_lic) }),
        ...(data.activo !== undefined && { activo: data.activo })
      }
    });

    revalidatePath('/admin/vehiculos');
    return { success: true, data: actualizado };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error al actualizar conductor.' };
  }
}

export async function obtenerConductoresActivosAction() {
  try {
    const conductores = await prisma.usuario.findMany({
      where: { 
        rol: 'REPARTIDOR', // Filtramos para traer solo conductores
        activo: true 
      },
      orderBy: { nombre: 'asc' } // Ordenado por nombre (ya que apellido no existe)
    });
    return { success: true, data: conductores };
  } catch (error: any) {
    return { success: false, message: 'No se pudo cargar la lista de choferes.' };
  }
}