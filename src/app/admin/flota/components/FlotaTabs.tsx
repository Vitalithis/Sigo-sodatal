'use client';

import React, { useState } from 'react';
import { Users, Truck } from 'lucide-react';
import ChoferesManager from './ChoferesManager';
import VehicleManager from './VehicleManager';

interface Props {
  choferesIniciales: any[];
  vehiculosIniciales: any[];
}

export default function FlotaTabs({ choferesIniciales, vehiculosIniciales }: Props) {
  const [pestana, setPestana] = useState<'choferes' | 'vehiculos'>('choferes');

  return (
    <div className="space-y-6">
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1 shadow-sm gap-1">
        <button
          onClick={() => setPestana('choferes')}
          className={`flex-1 py-3 px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
            pestana === 'choferes'
              ? 'bg-slate-100 text-[#013299] shadow-xs'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Choferes / Repartidores ({choferesIniciales.length})</span>
        </button>
        <button
          onClick={() => setPestana('vehiculos')}
          className={`flex-1 py-3 px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
            pestana === 'vehiculos'
              ? 'bg-slate-100 text-[#013299] shadow-xs'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Vehículos / Flota ({vehiculosIniciales.length})</span>
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
