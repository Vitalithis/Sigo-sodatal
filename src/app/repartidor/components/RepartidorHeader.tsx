'use client';

import React from 'react';
import { Truck, Calendar } from 'lucide-react';

interface Props {
  nombreUsuario: string;
  vehiculoPatente?: string | null;
}

export default function RepartidorHeader({ nombreUsuario, vehiculoPatente }: Props) {
  const fechaHoy = new Date().toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  return (
    <header className="sticky top-0 z-30 bg-[#013299] text-white shadow-md">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        
        {/* Brand & Truck info */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-white/10 rounded-xl border border-white/15">
            <Truck className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black tracking-tight leading-none">SODATAL</span>
              <span className="text-[9px] font-extrabold uppercase bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded leading-none">
                Repartidor
              </span>
            </div>
            <p className="text-[11px] text-blue-100/80 font-medium mt-0.5">
              {vehiculoPatente ? `Camión: ${vehiculoPatente}` : 'En ruta'}
            </p>
          </div>
        </div>

        {/* User badge & Date */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
            <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black flex items-center justify-center">
              {nombreUsuario.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-bold truncate max-w-[100px]">{nombreUsuario.split(' ')[0]}</span>
          </div>
          <span className="text-[10px] text-blue-200/90 font-semibold capitalize flex items-center gap-1 mt-1">
            <Calendar className="w-3 h-3" /> {fechaHoy}
          </span>
        </div>

      </div>
    </header>
  );
}
