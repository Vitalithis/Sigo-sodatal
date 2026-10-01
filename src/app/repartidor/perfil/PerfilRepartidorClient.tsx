'use client';

import React, { useState } from 'react';
import { signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { User, Truck, ShieldCheck, LogOut, Phone, Mail, FileText, Calendar } from 'lucide-react';

interface Props {
  usuario: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    rut: string;
    telefono: string;
    licencia_tipo?: string | null;
    fecha_ingreso?: string;
  };
  vehiculo: {
    patente: string;
    marca: string;
    modelo: string;
    anio: number;
  } | null;
}

export default function PerfilRepartidorClient({ usuario, vehiculo }: Props) {
  const router = useRouter();
  const [loadingLogout, setLoadingLogout] = useState(false);

  const handleCerrarSesion = async () => {
    setLoadingLogout(true);
    try {
      await signOut();
      router.push('/login');
    } catch (e) {
      console.error(e);
      router.push('/login');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* Tarjeta de Identificación */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center relative overflow-hidden">
        <div className="w-20 h-20 bg-[#013299] text-white text-2xl font-black rounded-full flex items-center justify-center mx-auto shadow-lg shadow-[#013299]/20 border-4 border-white">
          {usuario.nombre.charAt(0).toUpperCase()}
        </div>

        <h1 className="text-lg font-black text-slate-900 mt-3">{usuario.nombre} {usuario.apellido}</h1>
        <p className="text-xs font-extrabold text-[#013299] uppercase tracking-wider bg-blue-50 inline-block px-3 py-1 rounded-full mt-1 border border-blue-100">
          Repartidor Oficial SODATAL
        </p>
      </div>

      {/* Información Personal y Contacto */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
          Datos Personales
        </h2>

        <div className="space-y-2.5 text-xs text-slate-700 font-medium">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#013299]" /> RUT Personal:
            </span>
            <span className="font-bold text-slate-900">{usuario.rut}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-[#013299]" /> Teléfono:
            </span>
            <span className="font-bold text-slate-900">{usuario.telefono}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-[#013299]" /> Email:
            </span>
            <span className="font-bold text-slate-900 truncate max-w-[180px]">{usuario.email}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#013299]" /> Licencia Conducir:
            </span>
            <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
              Clase {usuario.licencia_tipo || 'B'}
            </span>
          </div>
        </div>
      </div>

      {/* Camión Asignado */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
          <Truck className="w-4 h-4 text-[#013299]" /> Vehículo de Flota Asignado
        </h2>

        {vehiculo ? (
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="font-extrabold text-slate-900 text-sm">{vehiculo.marca} {vehiculo.modelo}</p>
              <p className="text-xs text-slate-500 font-medium">Año {vehiculo.anio}</p>
            </div>
            <span className="bg-amber-400 text-slate-900 text-sm font-black px-3 py-1 rounded-xl shadow-sm tracking-wider">
              {vehiculo.patente}
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic py-1">Sin vehículo asignado actualmente.</p>
        )}
      </div>

      {/* Botón Cerrar Sesión */}
      <div className="pt-2">
        <button
          onClick={handleCerrarSesion}
          disabled={loadingLogout}
          className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-xs py-3.5 rounded-2xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4 text-rose-600" />
          {loadingLogout ? 'Cerrando sesión...' : 'Cerrar Sesión'}
        </button>
      </div>

    </div>
  );
}
