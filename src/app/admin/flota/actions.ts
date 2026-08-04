'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Obtener vehículos (solo lectura, para poblar el selector de asignación)
export async function obtenerVehiculosAction() {
  try {
    const vehiculos = await prisma.vehiculo.findMany({
      where: { estado: 'ACTIVO' },
      orderBy: { patente: 'asc' },
    });
    return { success: true, vehiculos };
  } catch (error: any) {
    return { success: false, message: error.message, vehiculos: [] };
  }
}

// Obtener choferes (Usuarios con rol REPARTIDOR)
export async function obtenerChoferesAction() {
  try {
    const choferes = await prisma.usuario.findMany({
      where: { rol: 'REPARTIDOR' },
      include: { vehiculo: true },
      orderBy: { nombre: 'asc' },
    });
    return { success: true, choferes };
  } catch (error: any) {
    return { success: false, message: error.message, choferes: [] };
  }
}



// ==========================================================================
// ACTIONS DE VEHÍCULOS — pegar esto al final de src/app/admin/flota/actions.ts
// (junto a los imports de arriba: agrega 'revalidatePath' si no lo tienes ya)
// ==========================================================================
//
// import { revalidatePath } from 'next/cache';
//
// Asegúrate de que el archivo ya tenga 'use server'; al principio y el
// import de prisma: import { prisma } from '@/lib/prisma';

export interface VehiculoInput {
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  kilometraje_actual: number;
  estado: 'ACTIVO' | 'EN_MANTENCION' | 'FUERA_DE_SERVICIO';
}

// ---------------------------------------------------------------------
// VEHÍCULOS — CRUD
// ---------------------------------------------------------------------

export async function crearVehiculoAction(data: VehiculoInput) {
  try {
    await prisma.vehiculo.create({
      data: {
        patente: data.patente.toUpperCase().trim(),
        marca: data.marca,
        modelo: data.modelo,
        anio: data.anio,
        kilometraje_actual: data.kilometraje_actual,
        estado: data.estado,
      },
    });
    revalidatePath('/admin/flota');
    return { success: true };
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { success: false, message: 'Ya existe un vehículo con esa patente.' };
    }
    return { success: false, message: 'Error al crear el vehículo.' };
  }
}

export async function editarVehiculoAction(id: string, data: Partial<VehiculoInput>) {
  try {
    await prisma.vehiculo.update({
      where: { id },
      data,
    });
    revalidatePath('/admin/flota');
    return { success: true };
  } catch (error) {
    return { success: false, message: 'Error al actualizar el vehículo.' };
  }
}

// ---------------------------------------------------------------------
// MANTENCIONES
// ---------------------------------------------------------------------

interface RepuestoInput {
  nombre: string;
  cantidad: number;
  costo_unitario: number;
}

interface MantencionInput {
  vehiculo_id: string;
  fecha: string;
  tipo: string;
  kilometraje: number;
  mano_de_obra: number;
  taller: string;
  observaciones?: string;
  repuestos: RepuestoInput[];
}

export async function registrarMantencionAction(payload: MantencionInput) {
  try {
    const costoRepuestos = payload.repuestos.reduce(
      (acc, r) => acc + r.cantidad * r.costo_unitario,
      0
    );
    const costo_total = Math.round(payload.mano_de_obra + costoRepuestos);

    await prisma.mantencion.create({
      data: {
        vehiculo_id: payload.vehiculo_id,
        fecha: new Date(payload.fecha),
        tipo: payload.tipo,
        kilometraje: payload.kilometraje,
        mano_de_obra: payload.mano_de_obra,
        costo_total,
        taller: payload.taller,
        observaciones: payload.observaciones || null,
        repuestos: {
          create: payload.repuestos.map((r) => ({
            nombre: r.nombre,
            cantidad: r.cantidad,
            costo_unitario: r.costo_unitario,
          })),
        },
      },
    });

    // Si el kilometraje registrado en la mantención es mayor al actual del
    // vehículo, actualizamos el odómetro para mantenerlo al día.
    await prisma.vehiculo.updateMany({
      where: { id: payload.vehiculo_id, kilometraje_actual: { lt: payload.kilometraje } },
      data: { kilometraje_actual: payload.kilometraje },
    });

    revalidatePath('/admin/flota');
    return { success: true };
  } catch (error) {
    return { success: false, message: 'Error al registrar la mantención.' };
  }
}

// ---------------------------------------------------------------------
// ALERTAS
// ---------------------------------------------------------------------

export async function crearAlertaVehiculoAction(
  vehiculoId: string,
  tipo: 'KM' | 'FECHA',
  valor_km?: number,
  fecha_alerta?: string
) {
  try {
    await prisma.alertaVehiculo.create({
      data: {
        vehiculo_id: vehiculoId,
        tipo,
        valor_km: tipo === 'KM' ? valor_km : null,
        fecha_alerta: tipo === 'FECHA' && fecha_alerta ? new Date(fecha_alerta) : null,
      },
    });
    revalidatePath('/admin/flota');
    return { success: true };
  } catch (error) {
    return { success: false, message: 'Error al crear la alerta.' };
  }
}

export async function modificarAlertaAction(
  id: string,
  data: { tipo: 'KM' | 'FECHA'; valor_km?: number; fecha_alerta?: string }
) {
  try {
    await prisma.alertaVehiculo.update({
      where: { id },
      data: {
        tipo: data.tipo,
        valor_km: data.tipo === 'KM' ? data.valor_km : null,
        fecha_alerta: data.tipo === 'FECHA' && data.fecha_alerta ? new Date(data.fecha_alerta) : null,
      },
    });
    revalidatePath('/admin/flota');
    return { success: true };
  } catch (error) {
    return { success: false, message: 'Error al modificar la alerta.' };
  }
}

export async function eliminarAlertaAction(id: string) {
  try {
    await prisma.alertaVehiculo.delete({ where: { id } });
    revalidatePath('/admin/flota');
    return { success: true };
  } catch (error) {
    return { success: false, message: 'Error al eliminar la alerta.' };
  }
}

// ---------------------------------------------------------------------
// COMBUSTIBLE
// ---------------------------------------------------------------------

interface CargaCombustibleInput {
  vehiculo_id: string;
  fecha: string;
  kilometraje: number;
  litros: number;
  monto: number;
  taller_o_bencinera: string;
  numero_factura?: number;
}

export async function registrarCargaCombustibleAction(payload: CargaCombustibleInput) {
  try {
    await prisma.cargaCombustible.create({
      data: {
        vehiculo_id: payload.vehiculo_id,
        fecha: new Date(payload.fecha),
        kilometraje: payload.kilometraje,
        litros: payload.litros,
        monto: payload.monto,
        taller_o_bencinera: payload.taller_o_bencinera,
        numero_factura: payload.numero_factura ?? null,
      },
    });

    await prisma.vehiculo.updateMany({
      where: { id: payload.vehiculo_id, kilometraje_actual: { lt: payload.kilometraje } },
      data: { kilometraje_actual: payload.kilometraje },
    });

    revalidatePath('/admin/flota');
    return { success: true };
  } catch (error) {
    return { success: false, message: 'Error al registrar la carga de combustible.' };
  }
}// ==========================================================================
// AGREGAR ESTO a src/app/admin/flota/actions.ts (junto a obtenerChoferesAction)
// ==========================================================================

interface ChoferInput {
  nombre: string;
  apellido: string;
  rut: string;
  telefono: string;
  email: string;
  licencia_tipo: string;
}

export async function crearChoferAction(data: ChoferInput) {
  try {
    await prisma.usuario.create({
      data: {
        nombre: data.nombre,
        apellido: data.apellido || null,
        rut: data.rut,
        telefono: data.telefono,
        email: data.email,
        licencia_tipo: data.licencia_tipo,
        rol: 'REPARTIDOR',
        fecha_ingreso: new Date(),
      },
    });
    revalidatePath('/admin/flota');
    return { success: true };
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const campo = error.meta?.target?.[0];
      if (campo === 'rut') return { success: false, message: 'Ya existe un chofer con ese RUT.' };
      if (campo === 'email') return { success: false, message: 'Ya existe un chofer con ese email.' };
      return { success: false, message: 'Ese registro ya existe.' };
    }
    return { success: false, message: 'Error al crear el chofer.' };
  }
}