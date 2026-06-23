'use client';

import React, { useState, useEffect } from 'react';
import { obtenerRutasPorFechaAction, generarRutasDesdeBaseAction, asignarPedidoARutaAction } from './actions';

export default function RutasManager() {
  // Inicializa con la fecha de hoy en formato local YYYY-MM-DD
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [rutas, setRutas] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  // Mapeo para saber qué día de la semana cae en base al calendario
  const diasSemanaUnidad = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  const numDia = new Date(fechaSeleccionada + 'T12:00:00').getDay();
  const nombreDiaSemana = diasSemanaUnidad[numDia];

  const cargarDatos = async () => {
    setCargando(true);
    const res = await obtenerRutasPorFechaAction(fechaSeleccionada);
    if (res.success) {
      setRutas(res.rutas || []);
      setPedidos(res.pedidos || []);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, [fechaSeleccionada]);

  const manejarGenerarBase = async () => {
    if (confirm(`¿Quieres cargar la plantilla automática para los días ${nombreDiaSemana}?`)) {
      setCargando(true);
      const res = await generarRutasDesdeBaseAction(fechaSeleccionada, nombreDiaSemana);
      if (!res.success) alert(res.message);
      await cargarDatos();
    }
  };

  const manejarAsignarPedido = async (pedidoId: string, rutaDiaId: string) => {
    const res = await asignarPedidoARutaAction(pedidoId, rutaDiaId);
    if (res.success) {
      await cargarDatos();
    } else {
      alert(res.message);
    }
  };

  // Cambiar de día con las flechas
  const cambiarDia = (offset: number) => {
    const d = new Date(fechaSeleccionada + 'T12:00:00');
    d.setDate(d.getDate() + offset);
    setFechaSeleccionada(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      
      {/* BARRA DE NAVEGACIÓN TEMPORAL (LIBRE MOVIMIENTO) */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <button onClick={() => cambiarDia(-1)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors">
            ⬅️ Anterior
          </button>
          <input 
            type="date" 
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="border border-gray-300 rounded-md p-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 text-gray-800"
          />
          <button onClick={() => cambiarDia(1)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors">
            Siguiente ➡️
          </button>
        </div>

        <div className="text-sm font-bold text-gray-700 bg-blue-50 px-4 py-2 rounded-md border border-blue-100">
          📅 Agenda: <span className="text-blue-700">{nombreDiaSemana}</span>
        </div>

        {rutas.length === 0 && (
          <button 
            onClick={manejarGenerarBase}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
          >
            ⚡ Cargar Camiones Base
          </button>
        )}
      </div>

      {cargando ? (
        <div className="text-center py-12 text-gray-500 font-medium">Procesando información de rutas...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMNA IZQUIERDA: RUTAS Y CAMIONES ACTIVOS EN ESA FECHA */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">🚚 Distribución sobre Camión ({rutas.length})</h2>
            
            {rutas.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
                No hay camiones despachados ni rutas iniciadas para esta fecha.
              </div>
            ) : (
              rutas.map((ruta) => (
                <div key={ruta.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm">Camión: {ruta.vehiculo.marca} ({ruta.vehiculo.patente})</h3>
                      <p className="text-xs text-gray-300">Repartidor: {ruta.usuario.nombre} {ruta.usuario.apellido || ''}</p>
                    </div>
                    <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {ruta.estado}
                    </span>
                  </div>

                  {/* Listado de paradas del camión */}
                  <div className="p-3 divide-y divide-gray-100">
                    {ruta.paradas.length === 0 ? (
                      <p className="text-xs text-gray-400 p-2 italic">Sin paradas asignadas aún.</p>
                    ) : (
                      ruta.paradas.map((parada: any) => (
                        <div key={parada.id} className="py-2.5 flex items-center justify-between text-sm group">
                          <div className="flex items-start gap-3">
                            <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                              {parada.orden}
                            </span>
                            <div>
                              <p className="font-semibold text-gray-800">{parada.cliente.nombre}</p>
                              <p className="text-xs text-gray-500">📍 {parada.cliente.direccion}</p>
                              {parada.pedido ? (
                                <span className="inline-block mt-1 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                                  📦 Pedido Solicitado: {parada.pedido.items.map((i: any) => `${i.cantidad}x ${i.producto.nombre}`).join(', ')}
                                </span>
                              ) : (
                                <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                                  ⏰ Cliente de Ruta Fija
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            parada.estado === 'ENTREGADO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {parada.estado}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* COLUMNA DERECHA: BOLSA DE PEDIDOS DE LA FECHA SELECCIONADA */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">📥 Pedidos del Día ({pedidos.length})</h2>
            
            {pedidos.length === 0 ? (
              <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-sm text-gray-400">
                No hay pedidos de clientes registrados para este día.
              </div>
            ) : (
              <div className="space-y-3">
                {pedidos.map((p) => (
                  <div key={p.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-gray-800">{p.cliente.nombre}</h4>
                        <p className="text-xs text-gray-500">📍 {p.cliente.direccion}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        p.estado === 'PENDIENTE_CONFIRMACION' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {p.estado}
                      </span>
                    </div>

                    <div className="text-xs bg-gray-50 p-2 rounded text-gray-600">
                      <strong>Detalle:</strong> {p.items.map((i: any) => `${i.cantidad}x ${i.producto.nombre}`).join(', ')}
                    </div>

                    {/* Si el pedido no está asignado a ningún camión y hay rutas abiertas, se ofrece el botón de asignación */}
                    {!p.ruta_dia_id && rutas.length > 0 ? (
                      <div className="pt-2 border-t border-gray-100 space-y-1">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase">Subir a camión disponible:</p>
                        <div className="flex flex-wrap gap-1">
                          {rutas.map((r) => (
                            <button
                              key={r.id}
                              onClick={() => manejarAsignarPedido(p.id, r.id)}
                              className="bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-700 text-xs px-2 py-1 rounded transition-colors font-medium border border-gray-200"
                            >
                              🚚 Patente: {r.vehiculo.patente}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : p.ruta_dia_id ? (
                      <p className="text-[11px] text-green-600 font-medium flex items-center gap-1 pt-1">
                        ✅ Ya incorporado en hoja de ruta.
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}