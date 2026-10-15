import React from 'react';
import { prisma } from '@lib/prisma';
import { getUsuarioActual } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import CuadraturasRepartidorClient from './components/CuadraturasRepartidorClient';

export const metadata = {
  title: 'Cuadraturas y Rendición - Repartidor SODATAL',
  description: 'Control diario de caja, recaudación, envases y kilometraje.',
};

export default async function RepartidorCuadraturasPage() {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect('/login');

  const hoy = new Date();
  hoy.setHours(hoy.getHours() - 4);
  const fechaStr = hoy.toISOString().split('T')[0];
  const inicioDia = new Date(`${fechaStr}T00:00:00.000Z`);
  const finDia = new Date(`${fechaStr}T23:59:59.999Z`);

  // Cuadratura de hoy
  const cuadraturaHoy = await prisma.cuadratura.findFirst({
    where: {
      usuario_id: usuario.id,
      fecha: { gte: inicioDia, lte: finDia },
    },
    include: {
      salida: { include: { producto: true } },
      retorno: { include: { producto: true } },
      botellones_vacios: true,
      ventas: { include: { producto: true, guia: true } },
      gastos: true,
    },
  });

  // Historial de cuadraturas del repartidor
  const historial = await prisma.cuadratura.findMany({
    where: {
      usuario_id: usuario.id,
    },
    include: {
      salida: { include: { producto: true } },
      retorno: { include: { producto: true } },
      botellones_vacios: true,
      gastos: true,
    },
    orderBy: {
      fecha: 'desc',
    },
    take: 50,
  });

  // Vehículo asignado
  const vehiculo = usuario.vehiculo_id
    ? await prisma.vehiculo.findUnique({
        where: { id: usuario.vehiculo_id },
        select: {
          patente: true,
          marca: true,
          modelo: true,
          kilometraje_actual: true,
        },
      })
    : null;

  return (
    <div className="space-y-6">
      <CuadraturasRepartidorClient
        cuadraturaHoy={cuadraturaHoy as any}
        historial={historial as any}
        nombreRepartidor={usuario.nombre}
        vehiculo={vehiculo}
        fechaStrHoy={fechaStr}
      />
    </div>
  );
}
