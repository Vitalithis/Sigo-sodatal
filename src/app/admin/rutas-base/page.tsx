import React from 'react';
import RutasBaseManager from './RutasBaseManager';
import { obtenerRutasBaseAction } from '@/app/admin/rutas-base/actions';
import { obtenerChoferesAction, obtenerVehiculosAction } from '@/app/admin/flota/actions';export const metadata = {
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
      </div>

      <RutasBaseManager 
        rutasBaseIniciales={resRutasBase.rutasBase || []}
        choferes={resChoferes.choferes || []}
        vehiculos={resVehiculos.vehiculos || []}
      />
    </div>
  );
}