'use client';

import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Filter, ChevronLeft, ChevronRight, Truck, MapPin, Clock, Users } from 'lucide-react';
import { obtenerRutasPorFechaAction } from '../actions';

interface CalendarDay {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export default function VistaCalendarioRutas() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [frecuenciaFiltro, setFrecuenciaFiltro] = useState<string>('TODAS');
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(new Date().toISOString().split('T')[0]);
  const [rutasDia, setRutasDia] = useState<any[]>([]);
  const [cargandoRutas, setCargandoRutas] = useState<boolean>(false);

  // Helper para formatear YYYY-MM-DD
  const formatDateStr = (d: Date) => d.toISOString().split('T')[0];

  // Generar días del mes actual para el calendario
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Ajuste inicio semana (Lunes = 1, Domingo = 7)
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; 

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

  // Cargar datos para la fecha seleccionada
  useEffect(() => {
    async function load() {
      setCargandoRutas(true);
      const res = await obtenerRutasPorFechaAction(fechaSeleccionada);
      if (res.success) {
        setRutasDia(res.rutas || []);
      }
      setCargandoRutas(false);
    }
    load();
  }, [fechaSeleccionada]);

  // Filtrar paradas según la frecuencia seleccionada
  const paradasFiltradas = (paradas: any[]) => {
    if (frecuenciaFiltro === 'TODAS') return paradas;
    return paradas.filter(p => (p.cliente?.frecuencia || 'SEMANAL') === frecuenciaFiltro);
  };

  const mesNombre = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="space-y-6">
      {/* Header & Filtros de Frecuencia */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#013299]">
            <CalendarIcon className="h-5 w-5" />
            <h2 className="text-lg font-black tracking-tight text-slate-800">Calendario de Agendamiento y Rutas</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Visualiza y filtra los despachos programados según la frecuencia de visita del cliente.
          </p>
        </div>

        {/* Filtro por Frecuencia */}
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
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFrecuenciaFiltro(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                frecuenciaFiltro === f.key
                  ? 'bg-[#013299] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grilla Calendario (2 Cols en LG) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold capitalize text-slate-800">{mesNombre}</h3>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 uppercase py-1">
            <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              const isSelected = day.dateStr === fechaSeleccionada;
              return (
                <button
                  key={idx}
                  onClick={() => setFechaSeleccionada(day.dateStr)}
                  className={`min-h-[64px] p-2 rounded-xl text-left border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#013299] bg-blue-50/70 ring-2 ring-[#013299]/20'
                      : day.isToday
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : day.isCurrentMonth
                      ? 'border-slate-100 bg-white hover:bg-slate-50'
                      : 'border-transparent bg-slate-50/40 text-slate-300'
                  }`}
                >
                  <span className={`text-xs font-black ${isSelected ? 'text-[#013299]' : day.isToday ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {day.date.getDate()}
                  </span>

                  {day.isCurrentMonth && (
                    <div className="flex gap-1 items-center mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                      <span className="text-[9px] font-bold text-slate-400">Despacho</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel lateral: Detalle de Rutas y Paradas según Frecuencia */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#013299] uppercase tracking-wider">Fecha Seleccionada</span>
              <h3 className="text-base font-extrabold text-slate-800">{fechaSeleccionada}</h3>
            </div>
            {frecuenciaFiltro !== 'TODAS' && (
              <span className="bg-blue-100 text-[#013299] px-2.5 py-1 rounded-lg text-xs font-bold">
                Filtro: {frecuenciaFiltro}
              </span>
            )}
          </div>

          {cargandoRutas ? (
            <div className="py-12 text-center text-xs font-semibold text-slate-400">
              Cargando agendamiento del día...
            </div>
          ) : rutasDia.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-xs font-bold text-slate-600">No hay hojas de ruta creadas para este día.</p>
              <p className="text-[11px] text-slate-400">
                Selecciona otro día o inicia la hoja de ruta desde el módulo de despacho.
              </p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto max-h-[480px] pr-1">
              {rutasDia.map((r: any) => {
                const paradas = paradasFiltradas(r.paradas || []);
                return (
                  <div key={r.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-[#013299]" />
                        <span className="font-extrabold text-xs text-slate-800">
                          {r.vehiculo?.patente || 'Camión'} — {r.usuario?.nombre}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {paradas.length} visita(s)
                      </span>
                    </div>

                    <div className="space-y-2">
                      {paradas.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">No hay visitas de frecuencia {frecuenciaFiltro} en esta ruta.</p>
                      ) : (
                        paradas.map((p: any, idx: number) => (
                          <div key={p.id} className="bg-white border border-slate-200 p-2.5 rounded-lg text-xs flex justify-between items-center">
                            <div>
                              <p className="font-bold text-slate-800">{idx + 1}. {p.cliente?.nombre}</p>
                              <p className="text-[10px] text-slate-500">{p.cliente?.direccion}</p>
                            </div>
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-extrabold px-2 py-0.5 rounded">
                              {p.cliente?.frecuencia || 'SEMANAL'}
                            </span>
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
      </div>
    </div>
  );
}
