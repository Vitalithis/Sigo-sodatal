'use client';

import React, { useState } from 'react';
import ListaParadas from './ListaParadas';
import { 
  Navigation, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Truck, 
  Search, 
  MapPin, 
  Eye, 
  X, 
  Phone,
  ChevronRight,
  Package
} from 'lucide-react';

interface Props {
  rutaHoy: any | null;
  todasLasRutas: any[];
  usuarioId: string;
  fechaStrHoy: string;
}

export default function RutasRepartidorView({ rutaHoy, todasLasRutas, usuarioId, fechaStrHoy }: Props) {
  const [tabActiva, setTabActiva] = useState<'HOY' | 'HISTORIAL'>('HOY');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'ACTIVA' | 'FINALIZADA'>('TODOS');
  const [rutaDetalleSeleccionada, setRutaDetalleSeleccionada] = useState<any | null>(null);

  // Estadísticas de la ruta de hoy
  const paradasHoy = rutaHoy?.paradas || [];
  const totalHoy = paradasHoy.length;
  const completadasHoy = paradasHoy.filter((p: any) => p.estado === 'ENTREGADO').length;
  const pendientesHoy = paradasHoy.filter((p: any) => p.estado === 'PENDIENTE').length;
  const postergadasHoy = paradasHoy.filter((p: any) => p.estado === 'POSTERGADO').length;
  const porcentajeHoy = totalHoy > 0 ? Math.round((completadasHoy / totalHoy) * 100) : 0;

  // Filtrado de historial
  const rutasFiltradas = todasLasRutas.filter((r) => {
    const fechaFormat = new Date(r.fecha).toLocaleDateString('es-CL');
    const patente = r.vehiculo?.patente || '';
    const matchesSearch = fechaFormat.includes(busqueda) || patente.toLowerCase().includes(busqueda.toLowerCase());
    
    if (filtroEstado === 'ACTIVA') return matchesSearch && r.estado === 'ACTIVA';
    if (filtroEstado === 'FINALIZADA') return matchesSearch && r.estado !== 'ACTIVA';
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Selector de pestañas Responsive */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center max-w-md">
        <button
          onClick={() => setTabActiva('HOY')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
            tabActiva === 'HOY'
              ? 'bg-[#013299] text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>Ruta de Hoy</span>
          {totalHoy > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              tabActiva === 'HOY' ? 'bg-white text-[#013299]' : 'bg-slate-100 text-slate-600'
            }`}>
              {completadasHoy}/{totalHoy}
            </span>
          )}
        </button>

        <button
          onClick={() => setTabActiva('HISTORIAL')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
            tabActiva === 'HISTORIAL'
              ? 'bg-[#013299] text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Historial de Despachos</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
            tabActiva === 'HISTORIAL' ? 'bg-white text-[#013299]' : 'bg-slate-100 text-slate-600'
          }`}>
            {todasLasRutas.length}
          </span>
        </button>
      </div>

      {/* PESTAÑA 1: RUTA DE HOY */}
      {tabActiva === 'HOY' && (
        <div className="space-y-6">
          {rutaHoy ? (
            <>
              {/* Tarjeta de Resumen y Progreso del Día */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                        Ruta Activa
                      </span>
                      {rutaHoy.vehiculo && (
                        <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-[#013299]" /> {rutaHoy.vehiculo.marca} ({rutaHoy.vehiculo.patente})
                        </span>
                      )}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                      Hoja de Ruta en Curso
                    </h1>
                    <p className="text-xs text-slate-500">
                      Fecha: {new Date(rutaHoy.fecha).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Porcentaje en círculo o badge */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-2xl font-black text-slate-900">{porcentajeHoy}%</span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avance</p>
                    </div>
                  </div>
                </div>

                {/* Barra de Progreso */}
                <div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
                    <div 
                      className="bg-gradient-to-r from-amber-400 to-emerald-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${porcentajeHoy}%` }}
                    />
                  </div>
                </div>

                {/* Métricas de Estado */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-1">
                  <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100 text-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                    <span className="text-[10px] font-bold uppercase text-emerald-800 block">Entregadas</span>
                    <span className="text-lg font-black text-emerald-950">{completadasHoy}</span>
                  </div>

                  <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-100 text-center">
                    <Clock className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                    <span className="text-[10px] font-bold uppercase text-amber-800 block">Pendientes</span>
                    <span className="text-lg font-black text-amber-950">{pendientesHoy}</span>
                  </div>

                  <div className="bg-rose-50/60 p-3 rounded-2xl border border-rose-100 text-center">
                    <AlertTriangle className="w-5 h-5 text-rose-600 mx-auto mb-1" />
                    <span className="text-[10px] font-bold uppercase text-rose-800 block">Postergadas</span>
                    <span className="text-lg font-black text-rose-950">{postergadasHoy}</span>
                  </div>
                </div>
              </div>

              {/* Lista interactiva de paradas */}
              <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
                <ListaParadas paradasIniciales={rutaHoy.paradas} usuarioId={usuarioId} />
              </div>
            </>
          ) : (
            <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-blue-50 text-[#013299] rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-black text-slate-800">No hay hoja de ruta activa para hoy</h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Aún no se ha asignado o generado una hoja de ruta para tu camión en la jornada de hoy ({fechaStrHoy}).
                Puedes revisar el historial de tus despachos anteriores en la pestaña superior.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setTabActiva('HISTORIAL')}
                  className="inline-flex items-center gap-2 bg-[#013299] hover:bg-blue-800 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-md transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Ver Historial de Despachos</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: HISTORIAL DE RUTAS Y DESPACHOS */}
      {tabActiva === 'HISTORIAL' && (
        <div className="space-y-4">
          
          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por fecha (ej: 15/10/2026) o patente..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299]"
              />
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              {(['TODOS', 'ACTIVA', 'FINALIZADA'] as const).map((estado) => (
                <button
                  key={estado}
                  onClick={() => setFiltroEstado(estado)}
                  className={`text-xs font-bold px-3 py-2 rounded-xl transition-all ${
                    filtroEstado === estado
                      ? 'bg-[#013299] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {estado === 'TODOS' ? 'Todas' : estado === 'ACTIVA' ? 'Activas' : 'Finalizadas'}
                </button>
              ))}
            </div>
          </div>

          {/* Listado de Rutas */}
          {rutasFiltradas.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No se encontraron rutas con los filtros seleccionados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rutasFiltradas.map((ruta) => {
                const total = ruta.paradas?.length || 0;
                const ent = ruta.paradas?.filter((p: any) => p.estado === 'ENTREGADO').length || 0;
                const pend = ruta.paradas?.filter((p: any) => p.estado === 'PENDIENTE').length || 0;
                const post = ruta.paradas?.filter((p: any) => p.estado === 'POSTERGADO').length || 0;
                const pct = total > 0 ? Math.round((ent / total) * 100) : 0;
                const esHoy = new Date(ruta.fecha).toISOString().split('T')[0] === fechaStrHoy;

                return (
                  <div
                    key={ruta.id}
                    className={`bg-white p-5 rounded-3xl border shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                      esHoy ? 'border-[#013299] ring-2 ring-[#013299]/10' : 'border-slate-200/80'
                    }`}
                  >
                    <div>
                      {/* Cabecera de la tarjeta */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          ruta.estado === 'ACTIVA'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {ruta.estado === 'ACTIVA' ? 'En Curso' : 'Finalizada'}
                        </span>
                        {esHoy && (
                          <span className="text-[10px] font-extrabold bg-[#013299] text-white px-2 py-0.5 rounded-full">
                            Hoy
                          </span>
                        )}
                      </div>

                      {/* Fecha y Vehículo */}
                      <div className="mt-3">
                        <h3 className="font-black text-slate-900 text-base">
                          {new Date(ruta.fecha).toLocaleDateString('es-CL', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </h3>
                        {ruta.vehiculo && (
                          <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
                            <Truck className="w-3.5 h-3.5 text-[#013299]" />
                            <span>{ruta.vehiculo.marca} {ruta.vehiculo.modelo} ({ruta.vehiculo.patente})</span>
                          </p>
                        )}
                      </div>

                      {/* Progreso de Paradas */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-600">Paradas: {ent}/{total}</span>
                          <span className="text-[#013299] font-black">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-[#013299] h-full rounded-full transition-all" 
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 pt-1">
                          <span className="text-emerald-700">✓ {ent} completadas</span>
                          <span>•</span>
                          <span className="text-amber-700">⏳ {pend} pendientes</span>
                          {post > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-rose-700">⚠ {post} postergadas</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botón Ver Detalle */}
                    <div className="pt-4 mt-3 border-t border-slate-100">
                      <button
                        onClick={() => setRutaDetalleSeleccionada(ruta)}
                        className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-[#013299] hover:text-white text-slate-800 text-xs font-bold py-2.5 rounded-xl transition-all"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Ver Detalle de Paradas ({total})</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* Modal Detalle de Ruta Seleccionada */}
      {rutaDetalleSeleccionada && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 bg-[#013299] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider">
                  Detalle del Despacho
                </span>
                <h3 className="text-lg font-black mt-0.5">
                  Ruta del {new Date(rutaDetalleSeleccionada.fecha).toLocaleDateString('es-CL', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </h3>
                {rutaDetalleSeleccionada.vehiculo && (
                  <p className="text-xs text-blue-100 mt-1">
                    Camión: {rutaDetalleSeleccionada.vehiculo.marca} ({rutaDetalleSeleccionada.vehiculo.patente})
                  </p>
                )}
              </div>
              <button
                onClick={() => setRutaDetalleSeleccionada(null)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Lista de Paradas */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                <span>Secuencia de Entrega ({rutaDetalleSeleccionada.paradas?.length || 0} paradas)</span>
                <span>Estado</span>
              </div>

              {rutaDetalleSeleccionada.paradas?.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">Esta ruta no contiene paradas registradas.</p>
              ) : (
                rutaDetalleSeleccionada.paradas?.map((parada: any, idx: number) => {
                  const esEntregado = parada.estado === 'ENTREGADO';
                  const esPostergado = parada.estado === 'POSTERGADO';

                  return (
                    <div
                      key={parada.id}
                      className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 ${
                        esEntregado
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : esPostergado
                          ? 'bg-rose-50/40 border-rose-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                            {parada.cliente?.nombre || 'Cliente sin nombre'}
                          </h4>
                          <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{parada.cliente?.direccion}</span>
                          </p>

                          {/* Cantidades entregadas / esperadas */}
                          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] font-semibold text-slate-600">
                            {(parada.bot20_entregado > 0 || parada.bot20_esperado > 0) && (
                              <span className="bg-blue-50 text-[#013299] px-2 py-0.5 rounded-md">
                                20L: {parada.bot20_entregado || parada.bot20_esperado} u.
                              </span>
                            )}
                            {(parada.bot10_entregado > 0 || parada.bot10_esperado > 0) && (
                              <span className="bg-sky-50 text-sky-800 px-2 py-0.5 rounded-md">
                                10L: {parada.bot10_entregado || parada.bot10_esperado} u.
                              </span>
                            )}
                            {(parada.soda_entregada > 0 || parada.soda_esperada > 0) && (
                              <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md">
                                Soda: {parada.soda_entregada || parada.soda_esperada} u.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Estado */}
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full shrink-0 ${
                        esEntregado
                          ? 'bg-emerald-100 text-emerald-800'
                          : esPostergado
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {esEntregado ? 'Entregada' : esPostergado ? 'Postergada' : 'Pendiente'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setRutaDetalleSeleccionada(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
