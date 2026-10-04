'use client';

import React, { useState } from 'react';
import {
  Users,
  ChevronDown,
  ChevronRight,
  Truck,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  CreditCard,
  CalendarDays,
  ShieldCheck,
} from 'lucide-react';
import CalendarioAsistencia from './CalendarioAsistencia';

interface PersonalAppProps {
  initialUsuarios: any[];
}

const ROL_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
  OFICINA: 'bg-blue-100 text-blue-700 border-blue-200',
  REPARTIDOR: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PENDIENTE: 'bg-slate-100 text-slate-600 border-slate-200',
};

function formatDate(dateStr?: string | Date | null): string {
  if (!dateStr) return 'No registrada';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'No registrada';
    return d.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'No registrada';
  }
}

export default function PersonalApp({ initialUsuarios }: PersonalAppProps) {
  const [usuarios] = useState(initialUsuarios || []);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const showToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const repartidores = usuarios.filter((u: any) => u.rol === 'REPARTIDOR');
  const otrosUsuarios = usuarios.filter((u: any) => u.rol !== 'REPARTIDOR');

  return (
    <div className="space-y-6">
      {/* Toast Flotante */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[120] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-semibold transition-all !m-0 ${
            toast.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toast.type === 'ok' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header Principal */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 text-[#013299] rounded-2xl">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Fichas de Personal y Control de Asistencia
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Datos personales, vehículos asignados, calendario de jornadas, licencias y vacaciones.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
            Total Personal: <span className="font-black text-slate-900">{usuarios.length}</span>
          </span>
        </div>
      </div>

      {/* ── SECCIÓN 1: REPARTIDORES ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Truck className="h-4 w-4 text-[#013299]" />
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
            Repartidores
          </h2>
          <span className="ml-auto bg-[#013299] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {repartidores.length}
          </span>
        </div>

        {repartidores.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
            <Truck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-500">No hay repartidores registrados.</p>
          </div>
        )}

        {repartidores.map((u: any) => {
          const isExpanded = expandedId === u.id;

          return (
            <div
              key={u.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all"
            >
              {/* Fila Resumen Usuario */}
              <button
                type="button"
                onClick={() => toggleExpand(u.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors text-left"
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-[#013299] flex items-center justify-center font-black text-white text-base shrink-0">
                  {(u.nombre || 'U').charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-slate-900 text-base">
                      {u.nombre} {u.apellido || ''}
                    </span>
                    <span
                      className={`text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase ${ROL_COLORS[u.rol]}`}
                    >
                      {u.rol}
                    </span>
                    {u.rut && (
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {u.rut}
                      </span>
                    )}
                    {u.vehiculo?.patente && (
                      <span className="text-[11px] font-mono font-bold bg-blue-50 text-[#013299] px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {u.vehiculo.patente}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap font-medium">
                    {u.email && (
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {u.email}
                      </span>
                    )}
                    {u.telefono && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {u.telefono}
                      </span>
                    )}
                  </div>
                </div>

                {/* Botón Ver Ficha y Chevron */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl border border-slate-200 transition-colors">
                    <CalendarIcon className="h-3.5 w-3.5 text-[#013299]" />
                    {isExpanded ? 'Ocultar Ficha' : 'Ver Ficha y Asistencia'}
                  </span>
                  <div className="p-1 rounded-full text-slate-400">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-slate-600" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </button>

              {/* Contenido Desplegable: Ficha de Personal + Calendario de Asistencia */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-5">
                  {/* Tarjeta de Información Personal */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 mb-3">
                      <ShieldCheck className="h-4 w-4 text-[#013299]" />
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                        Ficha del Trabajador
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">RUT</span>
                        <span className="font-black text-slate-800">{u.rut || 'No registrado'}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Teléfono</span>
                        <span className="font-black text-slate-800">{u.telefono || 'No registrado'}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Fecha de Ingreso</span>
                        <span className="font-black text-slate-800">{formatDate(u.fecha_ingreso)}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Vehículo Asignado</span>
                        <span className="font-black text-slate-800">
                          {u.vehiculo?.patente ? `${u.vehiculo.patente} (${u.vehiculo.modelo || 'Camión'})` : 'Sin vehículo asignado'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Calendario de Asistencia */}
                  <CalendarioAsistencia
                    usuarioId={u.id}
                    nombreUsuario={`${u.nombre} ${u.apellido || ''}`}
                    rol={u.rol}
                    onNotify={showToast}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── SECCIÓN 2: OTROS USUARIOS DEL SISTEMA (Oficina / Admin) ── */}
      {otrosUsuarios.length > 0 && (
        <div className="space-y-3 pt-3">
          <div className="flex items-center gap-2 px-1">
            <Users className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-black text-slate-600 uppercase tracking-widest">
              Otros Usuarios del Sistema
            </h2>
            <span className="ml-auto bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {otrosUsuarios.length}
            </span>
          </div>

          <div className="space-y-3">
            {otrosUsuarios.map((u: any) => {
              const isExpanded = expandedId === u.id;
              return (
                <div
                  key={u.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all"
                >
                  {/* Fila Resumen Usuario */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(u.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors text-left"
                  >
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-base shrink-0">
                      {(u.nombre || 'U').charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-base">
                          {u.nombre} {u.apellido || ''}
                        </span>
                        <span
                          className={`text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase ${ROL_COLORS[u.rol]}`}
                        >
                          {u.rol}
                        </span>
                        {u.rut && (
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {u.rut}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap font-medium">
                        {u.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            {u.email}
                          </span>
                        )}
                        {u.telefono && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {u.telefono}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Acciones & Chevron */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 transition-colors">
                        <CalendarIcon className="h-3.5 w-3.5 text-[#013299]" />
                        {isExpanded ? 'Ocultar Ficha' : 'Ver Ficha y Asistencia'}
                      </span>
                      <div className="p-1 rounded-full text-slate-400">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-slate-600" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Contenido Desplegable: Datos + Asistencia */}
                  {isExpanded && (
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-5">
                      {/* Tarjeta de Información Personal */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 mb-3">
                          <ShieldCheck className="h-4 w-4 text-slate-700" />
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                            Ficha de Usuario
                          </h4>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">RUT</span>
                            <span className="font-black text-slate-800">{u.rut || 'No registrado'}</span>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Teléfono</span>
                            <span className="font-black text-slate-800">{u.telefono || 'No registrado'}</span>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Fecha de Ingreso</span>
                            <span className="font-black text-slate-800">{formatDate(u.fecha_ingreso)}</span>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Rol de Sistema</span>
                            <span className="font-black text-slate-800">{u.rol}</span>
                          </div>
                        </div>
                      </div>

                      {/* Calendario de Asistencia */}
                      <CalendarioAsistencia
                        usuarioId={u.id}
                        nombreUsuario={`${u.nombre} ${u.apellido || ''}`}
                        rol={u.rol}
                        onNotify={showToast}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
