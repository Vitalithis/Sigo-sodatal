import React from 'react';
import RutasBaseManager from './RutasBaseManager';
import { obtenerRutasBaseAction } from '@/app/(admin)/rutas-base/actions';
import { obtenerChoferesAction, obtenerVehiculosAction } from '@/app/(admin)/admin/choferes/actions';

export const metadata = {
  title: 'Plantillas de Rutas Fijas - SIGO Sodatal',
  description: 'Configuración de los circuitos fijos semanales por repartidor.',
};

export default async function AdminRutasBasePage() {
  const resRutasBase = await obtenerRutasBaseAction();
  const resChoferes = await obtenerChoferesAction();
  const resVehiculos = await obtenerVehiculosAction();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#212529]">Estructura de Rutas Base Semanales</h1>
        <p className="text-xs text-gray-500 mt-0.5">Define qué clientes visita cada camión de forma fija según el día de la semana</p>
      </div>

      <RutasBaseManager 
        rutasBaseIniciales={resRutasBase.rutasBase || []}
        choferes={resChoferes.choferes || []}
        vehiculos={resVehiculos.vehiculos || []}
      />
    </div>
  );
}