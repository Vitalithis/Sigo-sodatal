'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Truck, User, Calendar, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { crearRutaContencionAction } from '../actions';

interface ModalRutaContencionProps {
  isOpen: boolean;
  fechaSeleccionada: string;
  choferes: any[];
  vehiculos: any[];
  onClose: () => void;
  onSuccess: (mensaje: string) => void;
}

export default function ModalRutaContencion({
  isOpen,
  fechaSeleccionada,
  choferes,
  vehiculos,
  onClose,
  onSuccess,
}: ModalRutaContencionProps) {
  const [nombreRuta, setNombreRuta] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [vehiculoId, setVehiculoId] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Auto-configurar nombre y primer chofer al abrir
  useEffect(() => {
    if (isOpen) {
      setNombreRuta(`Ruta Emergencia - ${fechaSeleccionada}`);
      setError('');
      if (choferes.length > 0 && !usuarioId) {
        const primerChofer = choferes[0];
        setUsuarioId(primerChofer.id);
        if (primerChofer.vehiculo_id) {
          setVehiculoId(primerChofer.vehiculo_id);
        } else if (vehiculos.length > 0) {
          setVehiculoId(vehiculos[0].id);
        }
      }
    }
  }, [isOpen, fechaSeleccionada, choferes, vehiculos]);

  // Si cambia el chofer, sugerir su vehículo asignado si tiene
  const handleCambioChofer = (id: string) => {
    setUsuarioId(id);
    const chofer = choferes.find(c => c.id === id);
    if (chofer?.vehiculo_id) {
      setVehiculoId(chofer.vehiculo_id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioId) {
      setError('Debes seleccionar un repartidor.');
      return;
    }
    if (!vehiculoId) {
      setError('Debes seleccionar un vehículo de la flota.');
      return;
    }

    setGuardando(true);
    setError('');

    const res = await crearRutaContencionAction({
      fechaStr: fechaSeleccionada,
      nombre: nombreRuta.trim(),
      usuario_id: usuarioId,
      vehiculo_id: vehiculoId,
    });

    setGuardando(false);

    if (res.success) {
      onSuccess(res.message);
      onClose();
    } else {
      setError(res.message || 'Error al crear la ruta de contención.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
        
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-5 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Ruta de Contención / Emergencia</h3>
              <p className="text-xs text-amber-100">Crear hoja de ruta vacía fuera del calendario habitual</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-xl text-xs text-amber-950 leading-relaxed">
            💡 <strong>Ruta de Contención:</strong> Se creará una hoja de ruta en blanco para el repartidor y camión seleccionados. Podrás arrastrarle pedidos flotantes o agregarle paradas de emergencia directamente.
          </div>

          {/* Fecha y Nombre */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" /> Fecha del Despacho
              </label>
              <input
                type="date"
                disabled
                value={fechaSeleccionada}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Nombre Descriptivo
              </label>
              <input
                type="text"
                required
                value={nombreRuta}
                onChange={e => setNombreRuta(e.target.value)}
                placeholder="Ej: Emergencia Sábado"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Repartidor */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-amber-600" /> Repartidor Asignado *
            </label>
            <select
              value={usuarioId}
              onChange={e => handleCambioChofer(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
            >
              <option value="">Selecciona un chofer...</option>
              {choferes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.apellido || ''} {c.vehiculo?.patente ? `(Camión habitual: ${c.vehiculo.patente})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Vehículo */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-amber-600" /> Vehículo de Reparto *
            </label>
            <select
              value={vehiculoId}
              onChange={e => setVehiculoId(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
            >
              <option value="">Selecciona un vehículo...</option>
              {vehiculos.map(v => (
                <option key={v.id} value={v.id}>
                  {v.patente} — {v.marca} {v.modelo}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Botones de acción */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="w-1/3 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="w-2/3 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-amber-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando Ruta...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Crear Hoja de Ruta
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
