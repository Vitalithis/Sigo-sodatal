'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Truck, 
  MapPin, 
  Clock, 
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Play,
  Package,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { 
  obtenerCalendarioVisitasMesAction, 
  obtenerDetalleVisitasFechaAction, 
  generarRutasDesdeBaseAction 
} from '../actions';
import { DiaSemana } from '@lib/prisma/generated';
import { getHoyHabilStr, esFinDeSemana } from '@/lib/fechas';

interface CalendarDay {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}

interface ResumenDia {
  total: number;
  porFrecuencia: {
    SEMANAL: number;
    QUINCENAL: number;
    MENSUAL: number;
    A_PEDIDO: number;
  };
  tieneRutaGenerada: boolean;
  tienePlantilla: boolean;
}

export default function VistaCalendarioRutas() {
  const formatDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [frecuenciaFiltro, setFrecuenciaFiltro] = useState<string>('TODAS');
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(() => getHoyHabilStr());
  
  // Resumen del mes completo
  const [resumenMes, setResumenMes] = useState<Record<string, ResumenDia>>({});
  const [cargandoMes, setCargandoMes] = useState<boolean>(false);

  // Detalle del día seleccionado
  const [detalleDia, setDetalleDia] = useState<any>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState<boolean>(false);
  const [generandoRuta, setGenerandoRuta] = useState<boolean>(false);
  const [mensajeAlerta, setMensajeAlerta] = useState<{ texto: string; error: boolean } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // ── Cargar resumen del mes ──
  const cargarResumenMes = useCallback(async (y: number, m: number) => {
    setCargandoMes(true);
    const res = await obtenerCalendarioVisitasMesAction(y, m + 1);
    if (res.success && res.resumenDias) {
      setResumenMes(res.resumenDias);
    }
    setCargandoMes(false);
  }, []);

  useEffect(() => {
    cargarResumenMes(year, month);
  }, [year, month, cargarResumenMes]);

  // ── Cargar detalle del día seleccionado ──
  const cargarDetalleDia = useCallback(async (fStr: string) => {
    setCargandoDetalle(true);
    const res = await obtenerDetalleVisitasFechaAction(fStr);
    if (res.success) {
      setDetalleDia(res);
    }
    setCargandoDetalle(false);
  }, []);

  useEffect(() => {
    cargarDetalleDia(fechaSeleccionada);
  }, [fechaSeleccionada, cargarDetalleDia]);

  // ── Generar ruta base directamente desde el calendario ──
  const handleCargarRutaDesdeCalendario = async () => {
    if (!detalleDia?.diaSemana) return;
    setGenerandoRuta(true);
    setMensajeAlerta(null);

    const res = await generarRutasDesdeBaseAction(fechaSeleccionada, detalleDia.diaSemana as DiaSemana);
    if (res.success) {
      setMensajeAlerta({ texto: res.message || 'Hojas de ruta cargadas correctamente.', error: false });
      await cargarResumenMes(year, month);
      await cargarDetalleDia(fechaSeleccionada);
    } else {
      setMensajeAlerta({ texto: res.message || 'Error al cargar la ruta base.', error: true });
    }
    setGenerandoRuta(false);
  };

  // ── Generación de cuadrícula de días ──
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Lunes = 0

  const days: CalendarDay[] = [];
  const todayStr = formatDateStr(new Date());

  // Días del mes anterior
  for (let i = startDayOfWeek; i > 0; i--) {
    const prevDate = new Date(year, month, 1 - i);
    days.push({
      date: prevDate,
      dateStr: formatDateStr(prevDate),
      isCurrentMonth: false,
      isToday: formatDateStr(prevDate) === todayStr,
    });
  }

  // Días del mes actual
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    const currDate = new Date(year, month, i);
    days.push({
      date: currDate,
      dateStr: formatDateStr(currDate),
      isCurrentMonth: true,
      isToday: formatDateStr(currDate) === todayStr,
    });
  }

  // Días del mes siguiente
  const remainingDays = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remainingDays; i++) {
    const nextDate = new Date(year, month + 1, i);
    days.push({
      date: nextDate,
      dateStr: formatDateStr(nextDate),
      isCurrentMonth: false,
      isToday: formatDateStr(nextDate) === todayStr,
    });
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => {
    const hoyHabil = getHoyHabilStr();
    const [y, m, d] = hoyHabil.split('-').map(Number);
    const fecha = new Date(y, m - 1, d);
    setCurrentDate(fecha);
    setFechaSeleccionada(hoyHabil);
  };

  const mesNombre = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  // ── Formatear fecha bonita para el panel lateral ──
  const formatearFechaTitulo = (fStr: string) => {
    try {
      const [y, m, d] = fStr.split('-').map(Number);
      const fecha = new Date(y, m - 1, d);
      return fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return fStr;
    }
  };

  // ── Filtrado de paradas por frecuencia ──
  const filtrarParadas = (paradas: any[]) => {
    if (frecuenciaFiltro === 'TODAS') return paradas;
    return paradas.filter(p => (p.cliente?.frecuencia || 'SEMANAL') === frecuenciaFiltro);
  };

  // ── Totales de visitas en el mes para el filtro ──
  const contarVisitasMes = (frec: string) => {
    return Object.values(resumenMes).reduce((acc, curr) => {
      if (frec === 'TODAS') return acc + (curr.total || 0);
      return acc + (curr.porFrecuencia?.[frec as keyof typeof curr.porFrecuencia] || 0);
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* ── Header & Filtros de Frecuencia ── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#013299]">
            <CalendarIcon className="h-5 w-5" />
            <h2 className="text-lg font-black tracking-tight text-slate-800">Calendario de Visitas por Cliente</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Frecuencia calculada por cliente (Semanal, Quincenal, Mensual) y sincronizada según su última visita.
          </p>
        </div>

        {/* Filtro por Frecuencia con Contadores */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-slate-400" /> Frecuencia:
          </span>
          {[
            { key: 'TODAS', label: 'Todas' },
            { key: 'SEMANAL', label: 'Semanal' },
            { key: 'QUINCENAL', label: 'Quincenal' },
            { key: 'MENSUAL', label: 'Mensual' },
            { key: 'A_PEDIDO', label: 'A Pedido' },
          ].map((f) => {
            const count = contarVisitasMes(f.key);
            const isSelected = frecuenciaFiltro === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFrecuenciaFiltro(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#013299] text-white shadow-sm ring-2 ring-[#013299]/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{f.label}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Grilla Calendario (2 Columnas en LG) ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-black capitalize text-slate-800">{mesNombre}</h3>
              <button
                onClick={goToday}
                className="text-[11px] font-bold text-[#013299] hover:underline bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100"
              >
                Hoy
              </button>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={prevMonth} 
                title="Mes anterior"
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button 
                onClick={nextMonth} 
                title="Mes siguiente"
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 uppercase py-1">
            <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span>
            <span className="text-slate-300">Sáb</span><span className="text-slate-300">Dom</span>
          </div>

          {/* Celdas del calendario */}
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day, idx) => {
              const isSelected = day.dateStr === fechaSeleccionada;
              const infoDia = resumenMes[day.dateStr];
              
              // Conteo según filtro
              let visitasCount = 0;
              if (infoDia) {
                if (frecuenciaFiltro === 'TODAS') {
                  visitasCount = infoDia.total;
                } else {
                  visitasCount = infoDia.porFrecuencia?.[frecuenciaFiltro as keyof typeof infoDia.porFrecuencia] || 0;
                }
              }

              const tieneRuta = infoDia?.tieneRutaGenerada;
              const tienePlantilla = infoDia?.tienePlantilla;

              const isWeekend = esFinDeSemana(day.dateStr);

              return (
                <button
                  key={idx}
                  disabled={isWeekend}
                  onClick={() => !isWeekend && setFechaSeleccionada(day.dateStr)}
                  title={isWeekend ? 'Fin de semana no laborable (solo Lunes a Viernes)' : undefined}
                  className={`min-h-[76px] p-2 rounded-2xl text-left border transition-all flex flex-col justify-between group ${
                    isWeekend
                      ? 'opacity-40 cursor-not-allowed bg-slate-100/60 border-dashed border-slate-200 text-slate-400 select-none'
                      : isSelected
                      ? 'border-[#013299] bg-blue-50/70 ring-2 ring-[#013299]/30 shadow-sm'
                      : day.isToday
                      ? 'border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/70'
                      : day.isCurrentMonth
                      ? 'border-slate-100 bg-white hover:bg-slate-50/80 hover:border-slate-300'
                      : 'border-transparent bg-slate-50/40 text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-black ${
                      isWeekend
                        ? 'text-slate-400'
                        : isSelected 
                        ? 'text-[#013299]' 
                        : day.isToday 
                        ? 'text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full' 
                        : day.isCurrentMonth 
                        ? 'text-slate-700' 
                        : 'text-slate-300'
                    }`}>
                      {day.date.getDate()}
                    </span>

                    {tieneRuta && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Hoja de ruta activa" />
                    )}
                  </div>

                  {/* Indicador de visitas */}
                  <div className="mt-1">
                    {day.isCurrentMonth && visitasCount > 0 ? (
                      <div className={`px-1.5 py-0.5 rounded-md text-[10px] font-black flex items-center gap-1 transition-all ${
                        tieneRuta
                          ? 'bg-emerald-100/90 text-emerald-800'
                          : 'bg-blue-100/90 text-[#013299]'
                      }`}>
                        {tieneRuta ? (
                          <CheckCircle2 className="w-2.5 h-2.5 shrink-0 text-emerald-600" />
                        ) : (
                          <Clock className="w-2.5 h-2.5 shrink-0 text-[#013299]" />
                        )}
                        <span className="truncate">
                          {visitasCount} {tieneRuta ? 'visitas' : 'prog.'}
                        </span>
                      </div>
                    ) : day.isCurrentMonth && tienePlantilla && visitasCount === 0 ? (
                      <span className="text-[9px] text-slate-300 font-bold block truncate">
                        Sin visitas
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Leyenda del calendario */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-[11px] text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Hoja de Ruta Generada / En Despacho</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              <span>Visitas Programadas (Proyección por frecuencia)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              <span>Ciclo Quincenal / Mensual al día</span>
            </div>
          </div>
        </div>

        {/* ── Panel lateral: Detalle de Rutas y Paradas del Día Seleccionado ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col space-y-4">
          <div className="border-b border-slate-100 pb-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#013299] uppercase tracking-wider">
                Planificación del Día
              </span>
              {detalleDia?.tipo === 'GENERADA' ? (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Hoja de Ruta Activa
                </span>
              ) : detalleDia?.tipo === 'PROYECTADA' ? (
                <span className="bg-blue-100 text-[#013299] text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Programación Base
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                  Sin Ruta
                </span>
              )}
            </div>

            <h3 className="text-sm font-extrabold capitalize text-slate-800">
              {formatearFechaTitulo(fechaSeleccionada)}
            </h3>

            {frecuenciaFiltro !== 'TODAS' && (
              <p className="text-[11px] text-slate-500 font-medium">
                Filtrando visitas con frecuencia: <strong className="text-[#013299]">{frecuenciaFiltro}</strong>
              </p>
            )}
          </div>

          {/* Feedback de acciones */}
          {mensajeAlerta && (
            <div className={`p-3 rounded-xl text-xs font-bold ${
              mensajeAlerta.error 
                ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              {mensajeAlerta.texto}
            </div>
          )}

          {/* Banner de acción si es ruta proyectada */}
          {detalleDia?.tipo === 'PROYECTADA' && detalleDia.rutas?.length > 0 && (
            <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3.5 space-y-2">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-[#013299] shrink-0 mt-0.5" />
                <p className="text-xs text-blue-950 font-medium leading-relaxed">
                  Estas visitas se calculan automáticamente considerando la frecuencia de cada cliente y su última visita.
                </p>
              </div>
              <button
                onClick={handleCargarRutaDesdeCalendario}
                disabled={generandoRuta}
                className="w-full bg-[#013299] hover:bg-blue-900 disabled:opacity-50 text-white font-bold text-xs py-2 px-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                {generandoRuta ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Cargando Hoja de Ruta...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Cargar Ruta Base para este día</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Estado de carga */}
          {cargandoDetalle ? (
            <div className="py-16 text-center text-xs font-semibold text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-300 mb-2" />
              Calculando agendamiento y ciclos de visita...
            </div>
          ) : !detalleDia || detalleDia.rutas?.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">
                {detalleDia?.message || 'No hay visitas programadas para este día.'}
              </p>
              <p className="text-[11px] text-slate-400">
                Selecciona un día entre Lunes y Viernes con plantillas de ruta asignadas.
              </p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto max-h-[500px] pr-1">
              {detalleDia.rutas.map((r: any) => {
                const todasLasParadas = r.paradas || [];
                const paradas = filtrarParadas(todasLasParadas);

                return (
                  <div key={r.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3">
                    {/* Header de Camión / Repartidor */}
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-[#013299]" />
                        <span className="font-extrabold text-xs text-slate-800">
                          {r.vehiculo?.patente || 'Camión'} — {r.usuario?.nombre}
                        </span>
                      </div>
                      <span className="text-[10px] font-black bg-blue-100 text-[#013299] px-2 py-0.5 rounded-full">
                        {paradas.length} visita(s)
                      </span>
                    </div>

                    {/* Lista de Paradas */}
                    <div className="space-y-2">
                      {paradas.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic py-2 text-center">
                          No hay clientes con frecuencia {frecuenciaFiltro} programados para esta ruta.
                        </p>
                      ) : (
                        paradas.map((p: any, idx: number) => {
                          const freq = p.cliente?.frecuencia || 'SEMANAL';
                          const freqBadgeCls = 
                            freq === 'QUINCENAL' ? 'bg-amber-100 text-amber-900 border-amber-200' :
                            freq === 'MENSUAL' ? 'bg-purple-100 text-purple-900 border-purple-200' :
                            freq === 'A_PEDIDO' ? 'bg-slate-200 text-slate-700 border-slate-300' :
                            'bg-blue-100 text-blue-900 border-blue-200';

                          return (
                            <div key={p.id} className="bg-white border border-slate-200 p-3 rounded-xl text-xs space-y-1.5 shadow-2xs">
                              <div className="flex justify-between items-start gap-2">
                                <div className="space-y-0.5">
                                  <p className="font-extrabold text-slate-900 text-xs">
                                    {idx + 1}. {p.cliente?.nombre}
                                  </p>
                                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate max-w-[200px]">{p.cliente?.direccion}</span>
                                  </p>
                                </div>

                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border uppercase shrink-0 ${freqBadgeCls}`}>
                                  {freq}
                                </span>
                              </div>

                              {/* Info de Última Visita y Justificación */}
                              <div className="text-[10px] pt-1 border-t border-slate-100 flex flex-wrap items-center justify-between text-slate-500 gap-1">
                                <div>
                                  {p.ultima_visita ? (
                                    <span className="font-medium">
                                      🕒 Última entrega: <strong className="text-slate-700">{new Date(p.ultima_visita).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</strong> ({p.info_visita?.diasDesdeUltima} días)
                                    </span>
                                  ) : (
                                    <span className="font-bold text-emerald-700">
                                      ⭐ Primera visita
                                    </span>
                                  )}
                                </div>

                                {/* Esperado habitual */}
                                <div className="flex items-center gap-1 font-bold text-slate-600">
                                  <span>20L: {p.bot20_esperado}</span>
                                  <span>•</span>
                                  <span>10L: {p.bot10_esperado}</span>
                                  <span>•</span>
                                  <span>Soda: {p.soda_esperada}</span>
                                </div>
                              </div>

                              {/* Estado de entrega si ya es ruta generada */}
                              {!p.es_proyectada && (
                                <div className="pt-1 flex items-center justify-between text-[10px]">
                                  <span className="font-bold text-slate-400">Estado de visita:</span>
                                  <span className={`font-black px-1.5 py-0.2 rounded ${
                                    p.estado === 'ENTREGADO' 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : p.estado === 'POSTERGADO'
                                      ? 'bg-amber-100 text-amber-800'
                                      : p.estado === 'FALLIDO'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {p.estado === 'ENTREGADO' ? '✅ Entregado' : p.estado === 'POSTERGADO' ? '⚠️ Postergado' : p.estado === 'FALLIDO' ? '❌ Fallido' : '⏳ Pendiente'}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
