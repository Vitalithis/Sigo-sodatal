'use client';

import React, { useState } from 'react';
import { crearChoferAction, obtenerChoferesAction } from '../actions';

interface Props {
  choferesIniciales: any[];
}

export default function ChoferesManager({ choferesIniciales }: Props) {
  const [choferes, setChoferes] = useState(choferesIniciales);
  const [cargando, setCargando] = useState(false);

  const [formChofer, setFormChofer] = useState({
    nombre: '',
    apellido: '',
    rut: '',
    telefono: '',
    email: '',
    licencia_tipo: 'Clase A4',
  });

  const refrescarDatos = async () => {
    setCargando(true);
    const rc = await obtenerChoferesAction();
    if (rc.success) setChoferes(rc.choferes);
    setCargando(false);
  };

  const registroChofer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formChofer.nombre || !formChofer.rut) return alert('Nombre y RUT son obligatorios.');
    setCargando(true);
    const res = await crearChoferAction(formChofer);
    if (res.success) {
      setFormChofer({ nombre: '', apellido: '', rut: '', telefono: '', email: '', licencia_tipo: 'Clase A4' });
      await refrescarDatos();
    } else {
      alert('Error: ' + res.message);
    }
    setCargando(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-gray-900">
      {/* COLUMNA 1: FORMULARIO */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm h-fit">
        <h2 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3 pb-1.5 border-b border-gray-100">
          ➕ Nuevo Repartidor
        </h2>

        <form onSubmit={registroChofer} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-gray-600 mb-1">Nombre y Apellido</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Nombre"
                value={formChofer.nombre}
                onChange={(e) => setFormChofer({ ...formChofer, nombre: e.target.value })}
                className="border border-gray-300 rounded p-1.5 w-full font-medium"
                required
              />
              <input
                type="text"
                placeholder="Apellido"
                value={formChofer.apellido}
                onChange={(e) => setFormChofer({ ...formChofer, apellido: e.target.value })}
                className="border border-gray-300 rounded p-1.5 w-full font-medium"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-gray-600 mb-1">RUT</label>
              <input
                type="text"
                placeholder="12.345.678-9"
                value={formChofer.rut}
                onChange={(e) => setFormChofer({ ...formChofer, rut: e.target.value })}
                className="border border-gray-300 rounded p-1.5 w-full font-medium"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-gray-600 mb-1">Teléfono</label>
              <input
                type="text"
                placeholder="+569..."
                value={formChofer.telefono}
                onChange={(e) => setFormChofer({ ...formChofer, telefono: e.target.value })}
                className="border border-gray-300 rounded p-1.5 w-full font-medium"
              />
            </div>
          </div>
          <div>
            <label className="block font-bold text-gray-600 mb-1">Email de Acceso</label>
            <input
              type="email"
              placeholder="chofer@sodatal.cl"
              value={formChofer.email}
              onChange={(e) => setFormChofer({ ...formChofer, email: e.target.value })}
              className="border border-gray-300 rounded p-1.5 w-full font-medium"
              required
            />
          </div>
          <div>
            <label className="block font-bold text-gray-600 mb-1">Licencia</label>
            <select
              value={formChofer.licencia_tipo}
              onChange={(e) => setFormChofer({ ...formChofer, licencia_tipo: e.target.value })}
              className="border border-gray-300 rounded p-1.5 w-full font-bold bg-white text-gray-700"
            >
              <option value="Clase A4">Clase A4 (Camiones)</option>
              <option value="Clase A5">Clase A5</option>
              <option value="Clase B">Clase B (Particular)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={cargando}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 rounded transition-colors uppercase tracking-wider text-[11px]"
          >
            {cargando ? 'Guardando...' : '💾 Registrar Chofer'}
          </button>
        </form>
      </div>

      {/* COLUMNA 2 Y 3: PLANILLA */}
      <div className="lg:col-span-2 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3 pb-1.5 border-b border-gray-100">
          📊 Listado de Choferes
        </h2>

        {cargando ? (
          <div className="text-center py-12 text-xs font-bold text-gray-400 tracking-widest uppercase">
            Actualizando Planilla...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-gray-200">
              <thead className="bg-slate-50 text-[10px] font-bold text-gray-500 uppercase">
                <tr>
                  <th className="p-2">Nombre</th>
                  <th className="p-2">RUT / Fono</th>
                  <th className="p-2">Licencia</th>
                  <th className="p-2">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {choferes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-400 italic">
                      No hay choferes registrados.
                    </td>
                  </tr>
                ) : (
                  choferes.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2 font-bold text-gray-900">
                        {c.nombre} {c.apellido}
                      </td>
                      <td className="p-2 text-gray-600 font-medium">
                        <div>{c.rut}</div>
                        <div className="text-[10px] text-gray-400">{c.telefono || 'Sin fono'}</div>
                      </td>
                      <td className="p-2 font-extrabold text-blue-700">
                        <span className="bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">
                          {c.licencia_tipo || 'Clase B'}
                        </span>
                      </td>
                      <td className="p-2 text-gray-600">{c.email}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
