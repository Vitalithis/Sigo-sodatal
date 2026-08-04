'use client';

import React, { useState } from 'react';
import { crearRutaBaseAction, buscarClientesBaseAction, agregarClienteARutaBaseAction, obtenerRutasBaseAction } from './actions';
import { DiaSemana } from '@/lib/prisma/generated/edge';

interface Props {
  rutasBaseIniciales: any[];
  choferes: any[];
  vehiculos: any[];
}

export default function RutasBaseManager({ rutasBaseIniciales, choferes, vehiculos }: Props) {
  const [rutasBase, setRutasBase] = useState(rutasBaseIniciales);
  const [cargando, setCargando] = useState(false);
  
  // Formulario cabecera
  const [form, setForm] = useState<{
    nombre: string;
    dia_semana: DiaSemana;
    usuario_id: string;
    vehiculo_id: string;
  }>({ 
    nombre: '', 
    dia_semana: 'LUNES' as DiaSemana,
    usuario_id: '', 
    vehiculo_id: '' 
  });
  
  // Buscador de clientes por ruta seleccionada
  const [busquedas, setBusquedas] = useState<{ [key: string]: string }>({});
  const [resultadosCli, setResultadosCli] = useState<{ [key: string]: any[] }>({});

  const dias: DiaSemana[] = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES']; 

  const refrescar = async () => {
    setCargando(true);
    const res = await obtenerRutasBaseAction();
    if (res.success) setRutasBase(res.rutasBase);
    setCargando(false);
  };

  const manejarCrearRuta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.usuario_id || !form.vehiculo_id) return alert('Debes seleccionar Chofer y Camión.');
    setCargando(true);
    const res = await crearRutaBaseAction(form);
    if (res.success) {
      setForm({ nombre: '', dia_semana: 'LUNES', usuario_id: '', vehiculo_id: '' });
      await refrescar();
    } else {
      alert(res.message);
    }
    setCargando(false);
  };

  const buscarClientes = async (rutaId: string, valor: string) => {
    setBusquedas(prev => ({ ...prev, [rutaId]: valor }));
    if (valor.trim().length < 2) {
      setResultadosCli(prev => ({ ...prev, [rutaId]: [] }));
      return;
    }
    const res = await buscarClientesBaseAction(valor);
    if (res.success) {
      setResultadosCli(prev => ({ ...prev, [rutaId]: res.clientes }));
    }
  };

  const vincularClientefijo = async (rutaId: string, clienteId: string) => {
    setCargando(true);
    const res = await agregarClienteARutaBaseAction(rutaId, clienteId);
    if (res.success) {
      setBusquedas(prev => ({ ...prev, [rutaId]: '' }));
      setResultadosCli(prev => ({ ...prev, [rutaId]: [] }));
      await refrescar();
    } else {
      alert(res.message);
    }
    setCargando(false);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 font-sans text-gray-900">
      
      {/* PANEL IZQUIERDO: CONFIGURADOR DE NUEVAS PLANTILLAS */}
      <div className="xl:col-span-1 bg-white p-4 rounded-lg border border-gray-200 shadow-sm h-fit">
        <h2 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3 pb-1.5 border-b border-gray-100">
          🛠️ Nueva Plantilla de Ruta
        </h2>
        <form onSubmit={manejarCrearRuta} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-gray-600 mb-1">Nombre Descriptivo</label>
            <input type="text" placeholder="Ej: Ruta Centro - Sur" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="border border-gray-300 rounded p-1.5 w-full font-medium" required />
          </div>
          <div>
            <label className="block font-bold text-gray-600 mb-1">Día Fijo de Operación</label>
            <select 
              value={form.dia_semana} 
              onChange={e => setForm({...form, dia_semana: e.target.value as DiaSemana})}
              className="border border-gray-300 rounded p-1.5 w-full font-bold bg-white text-gray-700"
            >
              {dias.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-bold text-gray-600 mb-1">Repartidor Encargado</label>
            <select value={form.usuario_id} onChange={e => setForm({...form, usuario_id: e.target.value})} className="border border-gray-300 rounded p-1.5 w-full font-medium bg-white" required>
              <option value="">-- Seleccionar Chofer --</option>
              {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-bold text-gray-600 mb-1">Camión Habitual</label>
            <select value={form.vehiculo_id} onChange={e => setForm({...form, vehiculo_id: e.target.value})} className="border border-gray-300 rounded p-1.5 w-full font-medium bg-white" required>
              <option value="">-- Seleccionar Vehículo --</option>
              {vehiculos.map(v => <option key={v.id} value={v.id}>{v.marca} ({v.patente})</option>)}
            </select>
          </div>
          <button type="submit" disabled={cargando} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 rounded transition-colors uppercase tracking-wider text-[11px] mt-2">
            {cargando ? 'Guardando...' : '⚡ Crear Estructura'}
          </button>
        </form>
      </div>

      {/* PANEL DERECHO: DETALLE DE PLANTILLAS ACTIVAS Y ASIGNACIÓN DE CLIENTES FIJOS */}
      <div className="xl:col-span-3 space-y-4">
        {rutasBase.length === 0 ? (
          <div className="bg-white p-8 text-center text-xs text-gray-400 font-medium border border-dashed rounded-lg">
            No hay plantillas base definidas todavía. Crea una a la izquierda para empezar a estructurar tus días comerciales.
          </div>
        ) : (
          rutasBase.map((rb: any) => (
            <div key={rb.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              
              {/* Bloque 1: Cabecera e Info de la ruta */}
              <div className="p-3 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="bg-slate-800 text-white text-[10px] font-black px-1.5 py-0.5 rounded tracking-wide uppercase">{rb.dia_semana}</span>
                    <h3 className="text-xs font-black text-slate-800 truncate">{rb.nombre}</h3>
                  </div>
                  <p className="text-[11px] text-gray-600 font-bold">👤 {rb.usuario?.nombre} {rb.usuario?.apellido}</p>
                  <p className="text-[10px] text-gray-400 font-medium">🚚 {rb.vehiculo?.marca} ({rb.vehiculo?.patente})</p>
                </div>

                {/* Mini Buscador integrado para agregar clientes comerciales en caliente */}
                <div className="mt-4 relative text-xs">
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">🔍 Añadir Cliente Fijo:</label>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o calle..."
                    value={busquedas[rb.id] || ''}
                    onChange={e => buscarClientes(rb.id, e.target.value)}
                    className="w-full border border-gray-300 rounded p-1 text-[11px] font-medium"
                  />
                  
                  {resultadosCli[rb.id] && resultadosCli[rb.id].length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 divide-y divide-gray-100 max-h-40 overflow-y-auto">
                      {resultadosCli[rb.id].map(c => (
                        <button
                          key={c.id}
                          onClick={() => vincularClientefijo(rb.id, c.id)}
                          className="w-full text-left p-1.5 hover:bg-blue-50 transition-colors text-[11px] font-medium flex flex-col"
                        >
                          <span className="font-bold text-gray-800">{c.nombre}</span>
                          <span className="text-[9px] text-gray-400 truncate">📍 {c.direccion}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bloque 2 y 3: Tabla de Clientes Fijos asignados */}
              <div className="p-2 md:col-span-2 overflow-x-auto">
                <table className="w-full text-left text-[11px] divide-y divide-gray-200">
                  <thead className="bg-slate-100 text-[9px] font-bold text-gray-500 uppercase">
                    <tr>
                      <th className="p-1 w-[40px] text-center">Orden</th>
                      <th className="p-1">Cliente Fijo</th>
                      <th className="p-1">Dirección de Entrega</th>
                      <th className="p-1 w-[60px] text-center">Sector</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rb.clientes.length === 0 ? (
                      <tr><td colSpan={4} className="p-4 text-center text-gray-400 italic text-[10px]">Sin clientes fijos asignados a este recorrido.</td></tr>
                    ) : (
                      rb.clientes.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="p-1 text-center font-bold text-gray-400">{c.orden}°</td>
                          <td className="p-1 font-bold text-gray-900">{c.cliente?.nombre}</td>
                          <td className="p-1 text-gray-600 font-medium truncate max-w-[160px]" title={c.cliente?.direccion}>📍 {c.cliente?.direccion}</td>
                          <td className="p-1 text-center"><span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1 rounded uppercase">{c.cliente?.sector || 'GENERAL'}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}