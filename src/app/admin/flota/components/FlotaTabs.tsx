'use client';

import React, { useState } from 'react';
import ChoferesManager from './ChoferesManager';
import VehicleManager from './VehicleManager';

interface Props {
  choferesIniciales: any[];
  vehiculosIniciales: any[];
}

export default function FlotaTabs({ choferesIniciales, vehiculosIniciales }: Props) {
  const [pestana, setPestana] = useState<'choferes' | 'vehiculos'>('choferes');

  return (
    <div className="space-y-4">
      <div className="flex border-b border-gray-200 bg-white rounded-t-lg">
        <button
          onClick={() => setPestana('choferes')}
          className={`px-4 py-2.5 text-xs font-bold uppercase border-b-2 transition-all ${
            pestana === 'choferes'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          👤 Choferes / Repartidores ({choferesIniciales.length})
        </button>
        <button
          onClick={() => setPestana('vehiculos')}
          className={`px-4 py-2.5 text-xs font-bold uppercase border-b-2 transition-all ${
            pestana === 'vehiculos'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🚚 Vehículos / Flota ({vehiculosIniciales.length})
        </button>
      </div>

      {pestana === 'choferes' ? (
        <ChoferesManager choferesIniciales={choferesIniciales} />
      ) : (
        <VehicleManager initialVehiculos={vehiculosIniciales} />
      )}
    </div>
  );
}