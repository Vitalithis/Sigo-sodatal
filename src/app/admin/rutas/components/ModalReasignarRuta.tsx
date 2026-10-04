'use client';

import React, { useState } from 'react';
import { Truck, UserCheck, AlertTriangle, X, Save, Check } from 'lucide-react';
import { reasignarChoferVehiculoRutaAction } from '../actions';

interface ModalReasignarRutaProps {
  isOpen: boolean;
  onClose: () => void;
  ruta: any;
  todasLasRutas: any[];
  choferes: any[];
  vehiculos: any[];
  onSuccess: () => void;
}

export default function ModalReasignarRuta({
  isOpen,
  onClose,
  ruta,
  todasLasRutas,
  choferes,
  vehiculos,
  onSuccess,
}: ModalReasignarRutaProps) {
  const [usuarioId, setUsuarioId] = useState<string>(ruta?.usuario_id || ruta?.usuario?.id || '');
  const [vehiculoId, setVehiculoId] = useState<string>(ruta?.vehiculo_id || ruta?.vehiculo?.id || '');
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !ruta) return null;

  const choferSeleccionado = choferes.find((c) => c.id === usuarioId);
  const vehiculoHabitualChofer = choferSeleccionado?.vehiculo;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioId || !vehiculoId) {
      setErrorMsg('Debes seleccionar tanto un conductor como un vehículo.');
      return;
    }

    setCargando(true);
    setErrorMsg(null);

    const res = await reasignarChoferVehiculoRutaAction(ruta.id, usuarioId, vehiculoId);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg(res.message || 'Error al reasignar la ruta.');
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Cabecera */}
        <div className="bg-[#013299] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20">
              <Truck className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">
                Reasignar Conductor y Vehículo
              </h3>
              <p className="text-[11px] text-blue-200 font-medium">
                {ruta.ruta_base?.nombre || 'Hoja de Ruta del Día'} · [Patente actual: {ruta.vehiculo?.patente || 'S/P'}]
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={cargando}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Mensaje de regla */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <p className="font-bold">Regla de asignación de flota:</p>
              <p className="text-[11px] text-amber-800">
                Puedes cambiar el conductor si el habitual está ausente, o cambiar el camión si el habitual está en mantención. 
                <b> No se permite asignar el mismo vehículo a 2 rutas que estén activas al mismo tiempo.</b>
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs font-semibold leading-relaxed">
              {errorMsg}
            </div>
          )}

          {/* Selector de Conductor */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#013299]" />
              <span>Conductor para esta jornada</span>
            </label>
            <select
              value={usuarioId}
              onChange={(e) => {
                setUsuarioId(e.target.value);
                setErrorMsg(null);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] outline-none transition-all cursor-pointer"
              required
            >
              <option value="">-- Seleccionar Conductor --</option>
              {choferes.map((c) => {
                const enOtraRuta = todasLasRutas.find(
                  (r) => r.id !== ruta.id && r.usuario_id === c.id && r.estado === 'ACTIVA'
                );
                return (
                  <option key={c.id} value={c.id} disabled={!!enOtraRuta}>
                    {c.nombre} {c.apellido || ''} ({c.licencia_tipo || 'Clase B'})
                    {c.vehiculo ? ` · [Habitual: ${c.vehiculo.patente}]` : ''}
                    {enOtraRuta ? ' (⚠️ Ocupado en otra ruta hoy)' : ''}
                  </option>
                );
              })}
            </select>

            {/* Sugerencia de vehículo habitual del chofer seleccionado */}
            {vehiculoHabitualChofer && (
              <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-100 flex items-center justify-between text-xs mt-1.5">
                <div className="flex items-center gap-2 text-blue-900">
                  <Truck className="w-4 h-4 text-[#013299] shrink-0" />
                  <span>
                    Vehículo habitual de {choferSeleccionado?.nombre}:{' '}
                    <b className="font-mono text-[#013299]">[{vehiculoHabitualChofer.patente}]</b> {vehiculoHabitualChofer.marca} {vehiculoHabitualChofer.modelo}
                  </span>
                </div>
                {vehiculoId !== vehiculoHabitualChofer.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setVehiculoId(vehiculoHabitualChofer.id);
                      setErrorMsg(null);
                    }}
                    className="text-[11px] font-bold text-[#013299] hover:underline shrink-0 ml-2"
                  >
                    Usar este camión
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Selector de Vehículo */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#013299]" />
              <span>Vehículo para esta jornada</span>
            </label>
            <select
              value={vehiculoId}
              onChange={(e) => {
                setVehiculoId(e.target.value);
                setErrorMsg(null);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] outline-none transition-all cursor-pointer"
              required
            >
              <option value="">-- Seleccionar Vehículo --</option>
              {vehiculos.map((v) => {
                const enOtraRuta = todasLasRutas.find(
                  (r) => r.id !== ruta.id && r.vehiculo_id === v.id && r.estado === 'ACTIVA'
                );
                return (
                  <option key={v.id} value={v.id} disabled={!!enOtraRuta}>
                    [{v.patente}] {v.marca} {v.modelo}
                    {enOtraRuta
                      ? ` (⚠️ En uso hoy por: ${enOtraRuta.usuario?.nombre || 'otra ruta'})`
                      : ''}
                  </option>
                );
              })}
            </select>
            <p className="text-[10px] text-slate-400">
              Solo se muestran habilitados los camiones que no estén comprometidos en otra ruta activa hoy.
            </p>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={cargando}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="bg-[#013299] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 uppercase tracking-wider disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{cargando ? 'Guardando...' : 'Confirmar Reasignación'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
