'use client';

import React, { useState } from 'react';
import { crearChoferAction, crearVehiculoAction, obtenerChoferesAction, obtenerVehiculosAction } from './actions';

interface Props {
  choferesIniciales: any[];
  vehiculosIniciales: any[];
}

export default function GestionFlotaManager({ choferesIniciales, vehiculosIniciales }: Props) {
  const [pestana, setPestana] = useState<'choferes' | 'vehiculos'>('choferes');
  const [choferes, setChoferes] = useState(choferesIniciales);
  const [vehiculos, setVehiculos] = useState(vehiculosIniciales);
  const [cargando, setCargando] = useState(false);

  // States Formularios
  const [formChofer, setFormChofer] = useState({ nombre: '', apellido: '', rut: '', telefono: '', email: '', vehiculo_id: '', licencia_tipo: 'Clase A4' });
  const [formVehiculo, setFormVehiculo] = useState({ patente: '', marca: '', modelo: '', anio: new Date().getFullYear(), kilometraje_actual: 0 });

  const refrescarDatos = async () => {
    setCargando(true);
    const rc = await obtenerChoferesAction();
    const rv = await obtenerVehiculosAction();
    if (rc.success) setChoferes(rc.choferes);
    if (rv.success) setVehiculos(rv.vehiculos);
    setCargando(false);
  };

  const registroChofer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formChofer.nombre || !formChofer.rut) return alert('Nombre y RUT son obligatorios.');
    setCargando(true);
    const res = await crearChoferAction(formChofer);
    if (res.success) {
      setFormChofer({ nombre: '', apellido: '', rut: '', telefono: '', email: '', vehiculo_id: '', licencia_tipo: 'Clase A4' });
      await refrescarDatos();
    } else {
      alert('Error: ' + res.message);
    }
    setCargando(false);
  };

  const registroVehiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVehiculo.patente) return alert('La patente es obligatoria.');
    setCargando(true);
    const res = await crearVehiculoAction(formVehiculo);
    if (res.success) {
      setFormVehiculo({ patente: '', marca: '', modelo: '', anio: new Date().getFullYear(), kilometraje_actual: 0 });
      await refrescarDatos();
    } else {
      alert('Error: ' + res.message);
    }
    setCargando(false);
  };

  return (
    <div className="space-y-4 font-sans text-gray-900">
      
      {/* SELECTOR DE PESTAÑAS */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-lg">
        <button
          onClick={() => setPestana('choferes')}
          className={`px-4 py-2.5 text-xs font-bold uppercase border-b-2 transition-all ${
            pestana === 'choferes' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          👤 Choferes / Repartidores ({choferes.length})
        </button>
        <button
          onClick={() => setPestana('vehiculos')}
          className={`px-4 py-2.5 text-xs font-bold uppercase border-b-2 transition-all ${
            pestana === 'vehiculos' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🚚 Camiones / Flota ({vehiculos.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA 1: FORMULARIO DE INGRESO RAPIDO */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm h-fit">
          <h2 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3 pb-1.5 border-b border-gray-100">
            ➕ {pestana === 'choferes' ? 'Nuevo Repartidor' : 'Nuevo Vehículo'}
          </h2>

          {pestana === 'choferes' ? (
            <form onSubmit={registroChofer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-600 mb-1">Nombre y Apellido</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Nombre" value={formChofer.nombre} onChange={e => setFormChofer({...formChofer, nombre: e.target.value})} className="border border-gray-300 rounded p-1.5 w-full font-medium" required />
                  <input type="text" placeholder="Apellido" value={formChofer.apellido} onChange={e => setFormChofer({...formChofer, apellido: e.target.value})} className="border border-gray-300 rounded p-1.5 w-full font-medium" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-600 mb-1">RUT</label>
                  <input type="text" placeholder="12.345.678-9" value={formChofer.rut} onChange={e => setFormChofer({...formChofer, rut: e.target.value})} className="border border-gray-300 rounded p-1.5 w-full font-medium" required />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Teléfono</label>
                  <input type="text" placeholder="+569..." value={formChofer.telefono} onChange={e => setFormChofer({...formChofer, telefono: e.target.value})} className="border border-gray-300 rounded p-1.5 w-full font-medium" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-gray-600 mb-1">Email de Acceso</label>
                <input type="email" placeholder="chofer@sodatal.cl" value={formChofer.email} onChange={e => setFormChofer({...formChofer, email: e.target.value})} className="border border-gray-300 rounded p-1.5 w-full font-medium" required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Licencia</label>
                  <select value={formChofer.licencia_tipo} onChange={e => setFormChofer({...formChofer, licencia_tipo: e.target.value})} className="border border-gray-300 rounded p-1.5 w-full font-bold bg-white text-gray-700">
                    <option value="Clase A4">Clase A4 (Camiones)</option>
                    <option value="Clase A5">Clase A5</option>
                    <option value="Clase B">Clase B (Particular)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Camión Habitual</label>
                  <select value={formChofer.vehiculo_id} onChange={e => setFormChofer({...formChofer, vehiculo_id: e.target.value})} className="border border-gray-300 rounded p-1.5 w-full font-bold bg-white text-gray-700">
                    <option value="">-- Sin asignar --</option>
                    {vehiculos.map(v => (
                      <option key={v.id} value={v.id}>{v.marca} ({v.patente})</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={cargando} className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 rounded transition-colors uppercase tracking-wider text-[11px]">
                {cargando ? 'Guardando...' : '💾 Registrar Chofer'}
              </button>
            </form>
          ) : (
            <form onSubmit={registroVehiculo} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Patente</label>
                  <input type="text" placeholder="ABCD12" value={formVehiculo.patente} onChange={e => setFormVehiculo({...formVehiculo, patente: e.target.value})} className="border border-gray-300 rounded p-1.5 w-full font-black uppercase placeholder:normal-case" required />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1 font-sans">Año</label>
                  <input type="number" value={formVehiculo.anio} onChange={e => setFormVehiculo({...formVehiculo, anio: Number(e.target.value)})} className="border border-gray-300 rounded p-1.5 w-full font-medium" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Marca</label>
                  <input type="text" placeholder="Hyundai" value={formVehiculo.marca} onChange={e => setFormVehiculo({...formVehiculo, marca: e.target.value})} className="border border-gray-300 rounded p-1.5 w-full font-medium" required />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Modelo</label>
                  <input type="text" placeholder="Porter" value={formVehiculo.modelo} onChange={e => setFormVehiculo({...formVehiculo, modelo: e.target.value})} className="border border-gray-300 rounded p-1.5 w-full font-medium" required />
                </div>
              </div>
              <div>
                <label className="block font-bold text-gray-600 mb-1">Kilometraje Inicial</label>
                <input type="number" value={formVehiculo.kilometraje_actual} onChange={e => setFormVehiculo({...formVehiculo, kilometraje_actual: Number(e.target.value)})} className="border border-gray-300 rounded p-1.5 w-full font-bold text-blue-700" />
              </div>
              <button type="submit" disabled={cargando} className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-2 rounded transition-colors uppercase tracking-wider text-[11px]">
                {cargando ? 'Guardando...' : '💾 Registrar Camión'}
              </button>
            </form>
          )}
        </div>

        {/* COLUMNA 2 Y 3: PLANILLAS DE VISUALIZACIÓN */}
        <div className="lg:col-span-2 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3 pb-1.5 border-b border-gray-100">
            📊 Listado de Registros Activos
          </h2>

          {cargando ? (
            <div className="text-center py-12 text-xs font-bold text-gray-400 tracking-widest uppercase">Actualizando Planilla...</div>
          ) : (
            <div className="overflow-x-auto">
              {pestana === 'choferes' ? (
                <table className="w-full text-left text-xs divide-y divide-gray-200">
                  <thead className="bg-slate-50 text-[10px] font-bold text-gray-500 uppercase">
                    <tr>
                      <th className="p-2">Nombre</th>
                      <th className="p-2">RUT / Fono</th>
                      <th className="p-2">Licencia</th>
                      <th className="p-2">Vehículo Asignado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {choferes.length === 0 ? (
                      <tr><td colSpan={4} className="p-4 text-center text-gray-400 italic">No hay choferes registrados.</td></tr>
                    ) : (
                      choferes.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2 font-bold text-gray-900">{c.nombre} {c.apellido}</td>
                          <td className="p-2 text-gray-600 font-medium">
                            <div>{c.rut}</div>
                            <div className="text-[10px] text-gray-400">{c.telefono || 'Sin fono'}</div>
                          </td>
                          <td className="p-2 font-extrabold text-blue-700"><span className="bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">{c.licencia_tipo || 'Clase B'}</span></td>
                          <td className="p-2">
                            {c.vehiculo ? (
                              <span className="bg-slate-900 text-white font-black px-2 py-0.5 rounded text-[11px] tracking-wider">
                                🚚 {c.vehiculo.patente}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">No asignado</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs divide-y divide-gray-200">
                  <thead className="bg-slate-50 text-[10px] font-bold text-gray-500 uppercase">
                    <tr>
                      <th className="p-2">Patente</th>
                      <th className="p-2">Vehículo</th>
                      <th className="p-2">Año</th>
                      <th className="p-2">Kilometraje</th>
                      <th className="p-2 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vehiculos.length === 0 ? (
                      <tr><td colSpan={5} className="p-4 text-center text-gray-400 italic">No hay camiones registrados.</td></tr>
                    ) : (
                      vehiculos.map((v: any) => (
                        <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2 font-black text-gray-900"><span className="bg-amber-400 text-slate-900 px-2 py-0.5 rounded border border-amber-500 tracking-wider text-[11px]">{v.patente}</span></td>
                          <td className="p-2 text-gray-700 font-bold">{v.marca} {v.modelo}</td>
                          <td className="p-2 font-medium text-gray-500">{v.anio}</td>
                          <td className="p-2 font-bold text-blue-700">{v.kilometraje_actual.toLocaleString('es-CL')} Km</td>
                          <td className="p-2 text-center">
                            <span className="bg-green-50 text-green-700 border border-green-200 font-bold px-1.5 py-0.5 rounded text-[10px] uppercase">{v.estado}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}