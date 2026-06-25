'use client';

import React, { useState, useEffect } from 'react';
import NuevoPedidoModal from './NuevoPedidoModal';
import { obtenerRutasPorFechaAction, generarRutasDesdeBaseAction } from './actions';

export default function RutasManager() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [rutas, setRutas] = useState<any[]>([]);
  const [pedidosFlotantes, setPedidosFlotantes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);

  const diasSemanaUnidad = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  const numDia = new Date(fechaSeleccionada + 'T12:00:00').getDay();
  const nombreDiaSemana = diasSemanaUnidad[numDia];

  const cargarDatos = async () => {
    setCargando(true);
    const res = await obtenerRutasPorFechaAction(fechaSeleccionada);
    if (res.success) {
      setRutas(res.rutas || []);
      // Pedidos que aún no se suben a ninguna hoja de ruta
      const flotantes = (res.pedidos || []).filter((p: any) => !p.ruta_dia_id);
      setPedidosFlotantes(flotantes);
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

  const cambiarDia = (offset: number) => {
    const d = new Date(fechaSeleccionada + 'T12:00:00');
    d.setDate(d.getDate() + offset);
    setFechaSeleccionada(d.toISOString().split('T')[0]);
  };

  // Función auxiliar para agrupar las paradas/pedidos de un repartidor por su sector
  const agruparPorSector = (paradas: any[]) => {
    return paradas.reduce((grupos: any, parada: any) => {
      const sector = parada.cliente?.sector || 'SIN SECTOR ASIGNADO';
      if (!grupos[sector]) grupos[sector] = [];
      grupos[sector].push(parada);
      return grupos;
    }, {});
  };

  return (
    <div className="space-y-4 font-sans antialiased text-gray-900 selection:bg-blue-500 selection:text-white">
      
      {/* BARRA DE NAVEGACIÓN TEMPORAL */}
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button onClick={() => cambiarDia(-1)} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold transition-colors">
            ⬅️ Anterior
          </button>
          <input 
            type="date" 
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="border border-gray-300 rounded p-1 text-xs font-bold focus:ring-2 focus:ring-blue-500 text-gray-800"
          />
          <button onClick={() => cambiarDia(1)} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold transition-colors">
            Siguiente ➡️
          </button>
        </div>

        <div className="text-xs font-extrabold text-gray-700 bg-blue-50 px-3 py-1.5 rounded border border-blue-100 uppercase tracking-wider">
          📅 Agenda: <span className="text-blue-700">{nombreDiaSemana}</span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setModalAbierto(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold rounded shadow-sm transition-colors"
          >
            ➕ Ingresar Pedido
          </button>
          {rutas.length === 0 && (
            <button 
              onClick={manejarGenerarBase}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm transition-colors"
            >
              ⚡ Iniciar Hojas del Día
            </button>
          )}
        </div>
      </div>

      {cargando ? (
        <div className="text-center py-12 text-gray-500 font-bold text-xs tracking-widest">PROCESANDO INFORMACIÓN...</div>
      ) : (
        <div className="space-y-6">
          
          {/* BOLSA DE PEDIDOS PENDIENTES (FLAG / FLOTANTES) */}
          {pedidosFlotantes.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <h3 className="text-xs font-black text-amber-800 mb-2 uppercase tracking-tight">⚠️ Pedidos sin Asignar a Repartidor ({pedidosFlotantes.length})</h3>
              <div className="flex flex-wrap gap-2">
                {pedidosFlotantes.map((p: any) => (
                  <div key={p.id} className="bg-white p-2 rounded border border-amber-300 text-xs shadow-sm flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded text-[10px]">
                      {p.items?.[0]?.cantidad || 1}x
                    </span>
                    <div>
                      <p className="font-bold text-gray-800">{p.cliente?.nombre}</p>
                      <p className="text-[10px] text-gray-500">📍 {p.cliente?.sector || 'Sin Sector'} - {p.cliente?.direccion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA PRINCIPAL: LISTADO DE REPARTIDORES (PLANILLA COMPLETA) */}
          {rutas.length === 0 ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400 text-xs font-medium">
              No hay Hojas de Ruta activas. Presione "Iniciar Hojas del Día" para cargar los repartidores base.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {rutas.map((ruta) => {
                const sectoresGrupales = agruparPorSector(ruta.paradas);

                return (
                  <div key={ruta.id} className="bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden">
                    
                    {/* ENCABEZADO DEL REPARTIDOR (MÁXIMA PRIORIDAD HUMANA) */}
                    <div className="bg-slate-800 text-white p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-700">
                      <div>
                        <h2 className="text-sm font-black tracking-wide uppercase flex items-center gap-2">
                          👤 Repartidor: <span className="text-blue-400">{ruta.usuario?.nombre}</span>
                        </h2>
                        <p className="text-[11px] text-gray-400 font-medium">Planilla de despachos asignados para hoy</p>
                      </div>

                      {/* MICRO BOTÓN DE ASIGNACIÓN DE VEHÍCULO DIARIO */}
                      <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded border border-slate-700 self-start sm:self-center">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Camión Diario:</span>
                        <span className="bg-blue-600 text-white font-black text-[11px] px-2 py-0.5 rounded tracking-wider">
                          🚚 {ruta.vehiculo?.marca || 'Base'} ({ruta.vehiculo?.patente || 'S/P'})
                        </span>
                        <button 
                          onClick={() => alert('Próximamente: Cambiar vehículo rápido')} 
                          className="text-[10px] bg-slate-700 hover:bg-slate-600 px-1 py-0.5 rounded transition-colors text-gray-300 font-bold"
                        >
                          ⚙️
                        </button>
                      </div>
                    </div>

                    {/* CUERPO INTERNO: AGRUPACIONES AUTOMÁTICAS POR SECTOR */}
                    <div className="p-2 bg-slate-50 space-y-4">
                      {ruta.paradas.length === 0 ? (
                        <p className="text-xs text-gray-400 p-4 italic text-center">Este repartidor no tiene entregas agendadas todavía.</p>
                      ) : (
                        Object.keys(sectoresGrupales).map((nombreSector) => (
                          <div key={nombreSector} className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
                            
                            {/* ENCABEZADO DE SECTOR ESTILO EXCEL */}
                            <div className="bg-amber-400 text-slate-900 font-black text-xs px-3 py-1.5 uppercase tracking-wider flex items-center justify-between">
                              <span>🗺️ Sector: {nombreSector}</span>
                              <span className="bg-slate-900 text-white text-[10px] px-1.5 py-0.2 rounded font-bold">
                                {sectoresGrupales[nombreSector].length} Entregas
                              </span>
                            </div>

                            {/* TABLA DENSA INTERNA */}
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs divide-y divide-gray-200">
                                <thead className="bg-slate-100 text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                                  <tr>
                                    <th className="p-2 w-[50px] text-center">N°</th>
                                    <th className="p-2 w-[60px] text-center">CANT</th>
                                    <th className="p-2 w-[180px]">CLIENTE</th>
                                    <th className="p-2">DIRECCIÓN DE DESPACHO</th>
                                    <th className="p-2 w-[110px] text-center">ESTADO</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                  {sectoresGrupales[nombreSector].map((parada: any, index: number) => (
                                    <tr key={parada.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="p-2 text-center font-bold text-gray-400">{index + 1}</td>
                                      <td className="p-2 text-center">
                                        <span className="bg-blue-50 text-blue-700 font-black px-1.5 py-0.5 rounded border border-blue-200 text-[11px]">
                                          {parada.pedido?.items?.[0]?.cantidad || 'Fijo'}x
                                        </span>
                                      </td>
                                      <td className="p-2 font-bold text-gray-900 truncate max-w-[180px]" title={parada.cliente?.nombre}>
                                        {parada.cliente?.nombre}
                                      </td>
                                      <td className="p-2 text-gray-700 font-medium text-[12px]" title={parada.cliente?.direccion}>
                                        📍 {parada.cliente?.direccion}
                                      </td>
                                      <td className="p-2 text-center">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-tight ${
                                          parada.estado === 'ENTREGADO' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                                        }`}>
                                          {parada.estado}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                          </div>
                        ))
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* MODAL PARA CREAR PEDIDO RAPIDO */}
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