'use client';

import React, { useState, useEffect } from 'react';
import { DiaSemana } from '@/lib/prisma/generated';
import { getFormularioRutaBaseData, guardarRutaBaseAction } from './actions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NuevaRutaBaseModal({ isOpen, onClose, onSuccess }: Props) {
  const [nombre, setNombre] = useState('');
  const [diaSemana, setDiaSemana] = useState<DiaSemana>(DiaSemana.LUNES);
  const [usuarioId, setUsuarioId] = useState('');
  const [vehiculoId, setVehiculoId] = useState('');
  
  const [choferes, setChoferes] = useState<any[]>([]);
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cargarOpciones = async () => {
        const res = await getFormularioRutaBaseData();
        if (res.success) {
          setChoferes(res.choferes || []);
          setVehiculos(res.vehiculos || []);
          if (res.choferes?.length > 0) setUsuarioId(res.choferes[0].id);
          if (res.vehiculos?.length > 0) setVehiculoId(res.vehiculos[0].id);
        }
      };
      cargarOpciones();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !usuarioId || !vehiculoId) {
      alert('Por favor rellena todos los campos obligatorios.');
      return;
    }

    setCargando(true);
    const res = await guardarRutaBaseAction({
      nombre,
      dia_semana: diaSemana,
      usuario_id: usuarioId,
      vehiculo_id: vehiculoId
    });
    setCargando(false);

    if (res.success) {
      alert('¡Plantilla de Ruta Base creada correctamente!');
      setNombre('');
      onSuccess();
    } else {
      alert(res.message || 'Error al guardar la ruta base.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-xs text-gray-900 font-sans">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full overflow-hidden">
        
        <div className="bg-slate-800 p-3 text-white flex justify-between items-center">
          <h3 className="font-black uppercase tracking-wider">🛠️ Nueva Plantilla de Ruta Base</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-sm">✕</button>
        </div>

        <form onSubmit={manejarEnvio} className="p-4 space-y-3">
          <div>
            <label className="block font-bold text-gray-700 uppercase mb-1">Nombre de la Ruta (Ej: Ruta Norte o Sector Centro):</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Reparto Troncal Lunes"
              className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase mb-1">Día de la Semana Asignado:</label>
            <select
              value={diaSemana}
              onChange={(e) => setDiaSemana(e.target.value as DiaSemana)}
              className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 font-bold cursor-pointer"
            >
              {Object.values(DiaSemana).map((dia) => (
                <option key={dia} value={dia}>{dia}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase mb-1">Chofer / Repartidor:</label>
            {choferes.length === 0 ? (
              <p className="text-red-600 font-medium italic">⚠️ No hay usuarios con Rol 'REPARTIDOR' activos en la base de datos.</p>
            ) : (
              <select
                value={usuarioId}
                onChange={(e) => setUsuarioId(e.target.value)}
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
              >
                {choferes.map((ch) => (
                  <option key={ch.id} value={ch.id}>👤 {ch.nombre} {ch.apellido}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase mb-1">Vehículo / Camión:</label>
            {vehiculos.length === 0 ? (
              <p className="text-red-600 font-medium italic">⚠️ No hay vehículos con estado 'ACTIVO' en la base de datos.</p>
            ) : (
              <select
                value={vehiculoId}
                onChange={(e) => setVehiculoId(e.target.value)}
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
              >
                {vehiculos.map((v) => (
                  <option key={v.id} value={v.id}>🚚 {v.marca} {v.modelo} ({v.patente})</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando || choferes.length === 0 || vehiculos.length === 0}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition-colors shadow-sm disabled:opacity-40"
            >
              {cargando ? 'Guardando...' : '💾 Crear Plantilla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}