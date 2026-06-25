import React from 'react';
import GestionFlotaManager from './GestionFlotaManager';
import { obtenerChoferesAction, obtenerVehiculosAction } from './actions';

export const metadata = {
  title: 'Gestión de Personal y Flota - SIGO Sodatal',
  description: 'Administración de choferes, repartidores y camiones de reparto.',
};

export default async function AdminChoferesPage() {
  const resChoferes = await obtenerChoferesAction();
  const resVehiculos = await obtenerVehiculosAction();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#212529]">Control de Flota y Repartidores</h1>
        <p className="text-xs text-gray-500 mt-0.5">Alta de conductores asignados y camiones operativos para el ruteo</p>
      </div>

      <GestionFlotaManager 
        choferesIniciales={resChoferes.choferes || []} 
        vehiculosIniciales={resVehiculos.vehiculos || []} 
      />
    </div>
  );
}