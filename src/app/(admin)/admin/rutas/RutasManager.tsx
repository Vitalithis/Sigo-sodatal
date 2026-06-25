'use client';

import React, { useState, useEffect } from 'react';
import NuevoPedidoModal from './NuevoPedidoModal';
import { DiaSemana, EstadoParada } from '@prisma/client'; 
import { 
  obtenerRutasPorFechaAction, 
  generarRutasDesdeBaseAction, 
  cambiarOrdenParadaAction,
  asignarPedidoARutaAction,
  actualizarEstadoParadaAction
} from './actions';

export default function RutasManager() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [rutas, setRutas] = useState<any[]>([]);
  const [pedidosFlotantes, setPedidosFlotantes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState<{ texto: string; error: boolean } | null>(null);

  // Mapeo estético de días de la semana
  const diasSemanaUnidad = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  const numDia = new Date(fechaSeleccionada + 'T12:00:00').getDay();
  const nombreDiaSemana = diasSemanaUnidad[numDia];

  const cargarDatos = async () => {
    setCargando(true);
    setMensajeEstado(null);
    const res = await obtenerRutasPorFechaAction(fechaSeleccionada);
    if (res.success) {
      setRutas(res.rutas || []);
      setPedidosFlotantes(res.pedidos || []);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, [fechaSeleccionada]);

  // Ejecutador del botón "Iniciar Hoja del Día"
  const handleIniciarHojasDelDia = async () => {
    setCargando(true);
    setMensajeEstado(null);
    
    // Convertimos el nombre del día en el formato estricto del Enum de Prisma (Ej: 'JUEVES')
    const diaEnum = nombreDiaSemana as DiaSemana;

    const respuesta = await generarRutasDesdeBaseAction(fechaSeleccionada, diaEnum);
    
    if (respuesta.success) {
      setMensajeEstado({ texto: respuesta.message, error: false });
      // Volver a consultar de inmediato para renderizar los camiones cargados
      await cargarDatos();
    } else {
      setMensajeEstado({ texto: respuesta.message || 'Error desconocido.', error: true });
      setCargando(false);
    }
  };

  const handleCambiarEstadoParada = async (paradaId: string, estado: string) => {
    const res = await actualizarEstadoParadaAction(paradaId, estado as EstadoParada);
    if (res.success) {
      cargarDatos();
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtro e Iniciador */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Día de Planificación</label>
            <input 
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="pt-5">
            <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md font-black text-xs border border-blue-100">
              📆 {nombreDiaSemana}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleIniciarHojasDelDia}
            disabled={cargando}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded shadow-sm transition-colors uppercase tracking-wider"
          >
            {cargando ? 'Procesando...' : '🚀 Iniciar Hoja del Día'}
          </button>
          <button
            onClick={() => setModalAbierto(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded shadow-sm transition-colors uppercase tracking-wider"
          >
            ➕ Pedido Rápido
          </button>
        </div>
      </div>

      {/* Alertas de Feedback */}
      {mensajeEstado && (
        <div className={`p-3 rounded-lg border text-sm font-semibold ${
          mensajeEstado.error ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {mensajeEstado.texto}
        </div>
      )}

      {/* Visualización Principal de Hojas de Ruta */}
      {cargando ? (
        <div className="text-center py-12 text-sm font-medium text-gray-500">Cargando la planificación de la jornada...</div>
      ) : (
        <div>
          {rutas.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 p-12 text-center rounded-xl">
              <p className="text-gray-600 font-bold text-base">No hay Hojas de Ruta activas en esta fecha.</p>
              <p className="text-xs text-gray-400 mt-1">Haga clic en "Iniciar Hoja del Día" si ya configuró sus plantillas de ruta base para el día {nombreDiaSemana}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {rutas.map((ruta) => {
                return (
                  <div key={ruta.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Encabezado del Camión */}
                    <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-sm tracking-wide flex items-center gap-1.5">
                          🚚 {ruta.vehiculo?.marca} {ruta.vehiculo?.modelo} 
                          <span className="bg-blue-600 text-[11px] px-2 py-0.5 rounded font-mono font-bold">
                            {ruta.vehiculo?.patente}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">Repartidor: {ruta.usuario?.nombre} {ruta.usuario?.apellido}</p>
                      </div>
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black text-[10px] px-2 py-1 rounded">
                        {ruta.estado}
                      </span>
                    </div>

                    {/* Paradas de la Ruta */}
                    <div className="p-4">
                      {ruta.paradas.length === 0 ? (
                        <p className="text-xs text-gray-400 italic py-4 text-center">Ruta vacía. No tiene clientes ni paradas asignadas todavía.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-gray-100 text-gray-500 uppercase text-[10px] tracking-wider">
                                <th className="p-2 w-12 text-center">N°</th>
                                <th className="p-2">Cliente</th>
                                <th className="p-2">Dirección</th>
                                <th className="p-2 text-center">Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ruta.paradas.map((parada: any, index: number) => (
                                <tr key={parada.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                                  <td className="p-2 text-center font-bold text-gray-400">{index + 1}</td>
                                  <td className="p-2">
                                    <p className="font-bold text-gray-800">{parada.cliente?.nombre}</p>
                                    {parada.pedido && (
                                      <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                        📦 Pedido Dinámico
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2 text-gray-500 font-medium truncate max-w-[200px]" title={parada.cliente?.direccion}>
                                    📍 {parada.cliente?.direccion}
                                  </td>
                                  <td className="p-2 text-center">
                                    <select
                                      value={parada.estado}
                                      onChange={(e) => handleCambiarEstadoParada(parada.id, e.target.value)}
                                      className={`text-[10px] font-extrabold px-2 py-1 rounded border cursor-pointer focus:outline-none ${
                                        parada.estado === 'ENTREGADO' 
                                          ? 'bg-green-50 text-green-700 border-green-200 font-extrabold'
                                          : 'bg-slate-50 text-slate-600 border-slate-200'
                                      }`}
                                    >
                                      <option value="PENDIENTE">⏳ PENDIENTE</option>
                                      <option value="ENTREGADO">✅ ENTREGADO</option>
                                    </select>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL NUEVO PEDIDO */}
      <NuevoPedidoModal 
        fecha={fechaSeleccionada} 
        isOpen={modalAbierto} 
        onClose={() => setModalAbierto(false)}
        onSuccess={() => {
          setModalAbierto(false);
          cargarDatos(); 
        }} 
      />
    </div>
  );
}