'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Plane,
  Coffee,
  RotateCcw,
  Truck,
  Save,
  X,
  Loader2,
  UserCheck,
  Info
} from 'lucide-react';
import {
  obtenerAsistenciaMesAction,
  guardarAsistenciaDiaAction,
  guardarAsistenciaRangoAction,
  RegistroAsistenciaDia
} from '../actions';
import { handleDateInputSoloHabiles } from '@/lib/fechas';

interface Props {
  usuarioId: string;
  nombreUsuario: string;
  rol: string;
  onNotify: (type: 'ok' | 'err', msg: string) => void;
}

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function CalendarioAsistencia({ usuarioId, nombreUsuario, rol, onNotify }: Props) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1); // 1-12
  const [diasMap, setDiasMap] = useState<Record<string, RegistroAsistenciaDia>>({});
  const [stats, setStats] = useState({
    totalPresente: 0,
    totalAusente: 0,
    totalLicencia: 0,
    totalVacaciones: 0,
    totalLibre: 0,
    porcentajeAsistencia: 100,
    totalRutasMes: 0
  });

  const [loading, setLoading] = useState(false);
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);
  const [modalEstado, setModalEstado] = useState<'PRESENTE' | 'AUSENTE' | 'LICENCIA' | 'VACACIONES' | 'LIBRE' | 'RESET'>('PRESENTE');
  const [modalNota, setModalNota] = useState('');
  const [isSaving, startSaving] = useTransition();

  // Estados y helpers para Registro Masivo por Rango (Vacaciones, Licencias, etc.)
  const [isRangoModalOpen, setIsRangoModalOpen] = useState(false);
  const [rangoDesde, setRangoDesde] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [rangoHasta, setRangoHasta] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // 15 días por defecto
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [rangoEstado, setRangoEstado] = useState<'VACACIONES' | 'LICENCIA' | 'LIBRE' | 'PRESENTE' | 'AUSENTE' | 'RESET'>('VACACIONES');
  const [rangoNota, setRangoNota] = useState('');

  const calcularDiasRango = (desdeStr: string, hastaStr: string) => {
    if (!desdeStr || !hastaStr) return 0;
    const d1 = new Date(`${desdeStr}T00:00:00`);
    const d2 = new Date(`${hastaStr}T00:00:00`);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d1 > d2) return 0;
    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const aplicarPresetDias = (dias: number) => {
    const base = rangoDesde ? new Date(`${rangoDesde}T00:00:00`) : new Date();
    if (isNaN(base.getTime())) return;
    const nuevaHasta = new Date(base);
    nuevaHasta.setDate(base.getDate() + (dias - 1));
    const y = nuevaHasta.getFullYear();
    const m = String(nuevaHasta.getMonth() + 1).padStart(2, '0');
    const d = String(nuevaHasta.getDate()).padStart(2, '0');
    setRangoHasta(`${y}-${m}-${d}`);
  };

  const handleGuardarRango = () => {
    if (!rangoDesde || !rangoHasta) {
      onNotify('err', 'Debes seleccionar fecha Desde y Hasta.');
      return;
    }
    const numDias = calcularDiasRango(rangoDesde, rangoHasta);
    if (numDias <= 0) {
      onNotify('err', 'La fecha "Desde" no puede ser posterior a la fecha "Hasta".');
      return;
    }

    startSaving(async () => {
      const res = await guardarAsistenciaRangoAction(
        usuarioId,
        rangoDesde,
        rangoHasta,
        rangoEstado,
        rangoNota
      );
      if (res.success) {
        onNotify('ok', `Se registraron exitosamente ${res.diasActualizados ?? numDias} días como ${rangoEstado}.`);
        setIsRangoModalOpen(false);
        await cargarMes(anio, mes);
      } else {
        onNotify('err', res.message || 'Error al guardar el rango de asistencia.');
      }
    });
  };

  // Cargar mes
  const cargarMes = async (targetAnio: number, targetMes: number) => {
    setLoading(true);
    const res = await obtenerAsistenciaMesAction(usuarioId, targetAnio, targetMes);
    if (res.success && res.diasMap && res.stats) {
      setDiasMap(res.diasMap);
      setStats(res.stats);
    } else {
      onNotify('err', res.message || 'Error al cargar asistencia del mes.');
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarMes(anio, mes);
  }, [usuarioId, anio, mes]);

  const handlePrevMes = () => {
    if (mes === 1) {
      setAnio(a => a - 1);
      setMes(12);
    } else {
      setMes(m => m - 1);
    }
  };

  const handleNextMes = () => {
    if (mes === 12) {
      setAnio(a => a + 1);
      setMes(1);
    } else {
      setMes(m => m + 1);
    }
  };

  const handleMesActual = () => {
    const cur = new Date();
    setAnio(cur.getFullYear());
    setMes(cur.getMonth() + 1);
  };

  // Abrir modal de edición de día
  const handleOpenDayModal = (diaNum: number) => {
    const diaDosDigitos = diaNum < 10 ? `0${diaNum}` : `${diaNum}`;
    const mesDosDigitos = mes < 10 ? `0${mes}` : `${mes}`;
    const fechaStr = `${anio}-${mesDosDigitos}-${diaDosDigitos}`;

    const registroActual = diasMap[fechaStr];
    setSelectedDayStr(fechaStr);
    setModalEstado(registroActual?.estado || 'PRESENTE');
    setModalNota(registroActual?.nota || '');
  };

  // Guardar cambio de asistencia
  const handleGuardarDia = () => {
    if (!selectedDayStr) return;
    startSaving(async () => {
      const res = await guardarAsistenciaDiaAction(
        usuarioId,
        anio,
        mes,
        selectedDayStr,
        modalEstado,
        modalNota
      );
      if (res.success) {
        onNotify('ok', `Asistencia actualizada para el ${selectedDayStr}`);
        setSelectedDayStr(null);
        await cargarMes(anio, mes);
      } else {
        onNotify('err', res.message || 'Error al guardar asistencia.');
      }
    });
  };

  // Construir matriz de días para el calendario
  // Obtener qué día de la semana comienza el mes (0: Dom, 1: Lun, etc.)
  const primerDiaMes = new Date(anio, mes - 1, 1).getDay();
  // Ajustar para que Lunes sea 0 y Domingo sea 6
  const paddingDias = (primerDiaMes + 6) % 7;
  const diasEnMes = new Date(anio, mes, 0).getDate();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 shadow-xs">
      
      {/* Barra Superior con Selector de Mes y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-blue-50 text-[#013299] rounded-xl">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              Control y Calendario de Asistencia
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Seguimiento de jornadas, rutas operadas, licencias y ausencias de <span className="font-bold text-slate-800">{nombreUsuario}</span>
            </p>
          </div>
        </div>

        {/* Controles de Navegación de Mes y Botón Rango */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsRangoModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#013299] hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow-sm transition-all"
          >
            <CalendarRange className="h-4 w-4" />
            <span>Registrar por Rango (Vacaciones)</span>
          </button>

          <button
            type="button"
            onClick={handleMesActual}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
          >
            Mes Actual
          </button>
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={handlePrevMes}
              title="Mes anterior"
              className="p-1 hover:bg-white rounded-lg text-slate-600 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2.5 text-xs font-black text-slate-800 min-w-[130px] text-center">
              {NOMBRES_MESES[mes - 1]} {anio}
            </span>
            <button
              type="button"
              onClick={handleNextMes}
              title="Mes siguiente"
              className="p-1 hover:bg-white rounded-lg text-slate-600 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI de Métricas de Asistencia del Mes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        
        {/* Presente */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[10px] font-black uppercase tracking-wider truncate mr-1">Días Asistidos</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          </div>
          <span className="text-xl font-black text-emerald-950 mt-1">
            {stats.totalPresente} <span className="text-xs font-bold text-emerald-700">días</span>
          </span>
        </div>

        {/* Inasistencias */}
        <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-[10px] font-black uppercase tracking-wider truncate mr-1">Inasistencias</span>
            <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
          </div>
          <span className="text-xl font-black text-rose-950 mt-1">
            {stats.totalAusente} <span className="text-xs font-bold text-rose-700">faltas</span>
          </span>
        </div>

        {/* Licencias Médicas */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[10px] font-black uppercase tracking-wider truncate mr-1">Licencias Médicas</span>
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          </div>
          <span className="text-xl font-black text-amber-950 mt-1">
            {stats.totalLicencia} <span className="text-xs font-bold text-amber-700">días</span>
          </span>
        </div>

        {/* Vacaciones / Permisos */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-blue-800">
            <span className="text-[10px] font-black uppercase tracking-wider truncate mr-1">Vacaciones / Permiso</span>
            <Plane className="h-4 w-4 text-blue-600 shrink-0" />
          </div>
          <span className="text-xl font-black text-blue-950 mt-1">
            {stats.totalVacaciones} <span className="text-xs font-bold text-blue-700">días</span>
          </span>
        </div>

        {/* Porcentaje Asistencia */}
        <div className="col-span-2 sm:col-span-3 lg:col-span-1 bg-gradient-to-br from-[#013299] to-blue-900 text-white rounded-xl p-3 flex flex-col justify-between shadow-xs min-w-0">
          <div className="flex items-center justify-between text-blue-200">
            <span className="text-[10px] font-black uppercase tracking-wider truncate mr-1">Cumplimiento</span>
            <UserCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          </div>
          <span className="text-xl font-black text-white mt-1">
            {stats.porcentajeAsistencia}%
          </span>
        </div>

      </div>

      {/* Grilla del Calendario Mensual */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/30">
        
        {/* Cabecera Días de la Semana */}
        <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200 text-center text-xs font-bold text-slate-600 py-2.5">
          {DIAS_SEMANA.map(d => (
            <span key={d}>{d}</span>
          ))}
        </div>

        {/* Días del Mes */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 font-semibold text-xs flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-[#013299]" />
            Cargando asistencia de {NOMBRES_MESES[mes - 1]}...
          </div>
        ) : (
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-white">
            
            {/* Celdas vacías de padding */}
            {Array.from({ length: paddingDias }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 bg-slate-50/50 p-2 opacity-30 pointer-events-none" />
            ))}

            {/* Días activos */}
            {Array.from({ length: diasEnMes }).map((_, i) => {
              const diaNum = i + 1;
              const diaDosDigitos = diaNum < 10 ? `0${diaNum}` : `${diaNum}`;
              const mesDosDigitos = mes < 10 ? `0${mes}` : `${mes}`;
              const fechaStr = `${anio}-${mesDosDigitos}-${diaDosDigitos}`;
              const registro = diasMap[fechaStr];

              const esHoy =
                hoy.getFullYear() === anio &&
                hoy.getMonth() + 1 === mes &&
                hoy.getDate() === diaNum;

              // Obtener día de la semana (0: domingo, 6: sábado)
              const diaSemanaIndex = new Date(anio, mes - 1, diaNum).getDay();
              const esFinDeSemana = diaSemanaIndex === 0 || diaSemanaIndex === 6;

              return (
                <div
                  key={fechaStr}
                  onClick={() => handleOpenDayModal(diaNum)}
                  className={`h-24 p-2 transition-all cursor-pointer flex flex-col justify-between hover:bg-blue-50/50 relative group ${
                    esHoy ? 'bg-blue-50/30 ring-2 ring-[#013299] ring-inset' : ''
                  }`}
                >
                  {/* Fila Número del Día */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-lg ${
                        esHoy
                          ? 'bg-[#013299] text-white'
                          : esFinDeSemana
                            ? 'text-slate-400'
                            : 'text-slate-800'
                      }`}
                    >
                      {diaNum}
                    </span>

                    {/* Botón flotante al hacer hover */}
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-blue-600 bg-blue-100/80 px-1.5 py-0.5 rounded transition-opacity">
                      Editar
                    </span>
                  </div>

                  {/* Estado Visual de la Asistencia */}
                  <div className="mt-1 space-y-1">
                    {registro?.estado === 'PRESENTE' && (
                      <div className="bg-emerald-100/90 text-emerald-900 border border-emerald-200/90 rounded-lg px-1.5 py-0.5 text-[10px] font-black flex items-center gap-1 truncate">
                        {registro.esAutoRuta ? (
                          <>
                            <Truck className="h-3 w-3 text-emerald-700 shrink-0" />
                            <span className="truncate">Ruta Activa</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-700 shrink-0" />
                            <span>Presente</span>
                          </>
                        )}
                      </div>
                    )}

                    {registro?.estado === 'AUSENTE' && (
                      <div className="bg-rose-100 text-rose-900 border border-rose-200 rounded-lg px-1.5 py-0.5 text-[10px] font-black flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-rose-700 shrink-0" />
                        <span>Falta</span>
                      </div>
                    )}

                    {registro?.estado === 'LICENCIA' && (
                      <div className="bg-amber-100 text-amber-900 border border-amber-200 rounded-lg px-1.5 py-0.5 text-[10px] font-black flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-700 shrink-0" />
                        <span>Licencia</span>
                      </div>
                    )}

                    {registro?.estado === 'VACACIONES' && (
                      <div className="bg-blue-100 text-blue-900 border border-blue-200 rounded-lg px-1.5 py-0.5 text-[10px] font-black flex items-center gap-1">
                        <Plane className="h-3 w-3 text-blue-700 shrink-0" />
                        <span>Vacaciones</span>
                      </div>
                    )}

                    {registro?.estado === 'LIBRE' && (
                      <div className="bg-slate-100 text-slate-700 border border-slate-200 rounded-lg px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1">
                        <Coffee className="h-3 w-3 text-slate-500 shrink-0" />
                        <span>Libre</span>
                      </div>
                    )}

                    {/* Si no hay registro y es fin de semana */}
                    {!registro && esFinDeSemana && (
                      <span className="text-[10px] font-medium text-slate-400 italic block">
                        Descanso
                      </span>
                    )}

                    {/* Nota breve si existe */}
                    {registro?.nota && (
                      <p className="text-[9px] text-slate-500 font-medium truncate" title={registro.nota}>
                        {registro.nota}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

          </div>
        )}

      </div>

      {/* MODAL PARA EDITAR / REGISTRAR ASISTENCIA DEL DÍA SELECCIONADO */}
      {selectedDayStr && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm !m-0 !top-0 !left-0 !right-0 !bottom-0 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden !m-0 animate-in zoom-in-95 duration-150">
            
            {/* Header Modal */}
            <div className="p-4 bg-[#013299] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider text-blue-200 block">Registrar Asistencia</span>
                <h4 className="text-sm font-extrabold text-white">
                  {selectedDayStr} · {nombreUsuario}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayStr(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido del Formulario de Asistencia */}
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2 uppercase tracking-wide">
                  Estado de Asistencia
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'PRESENTE', label: 'Presente / Asistió', color: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: CheckCircle2 },
                    { id: 'AUSENTE', label: 'Inasistencia / Falta', color: 'bg-rose-50 text-rose-800 border-rose-300', icon: XCircle },
                    { id: 'LICENCIA', label: 'Licencia Médica', color: 'bg-amber-50 text-amber-800 border-amber-300', icon: AlertTriangle },
                    { id: 'VACACIONES', label: 'Vacaciones / Permiso', color: 'bg-blue-50 text-blue-800 border-blue-300', icon: Plane },
                    { id: 'LIBRE', label: 'Día Libre / Feriado', color: 'bg-slate-50 text-slate-700 border-slate-300', icon: Coffee },
                    { id: 'RESET', label: 'Restablecer Automático', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: RotateCcw },
                  ].map(opt => {
                    const isSelected = modalEstado === opt.id;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setModalEstado(opt.id as any)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all text-left ${
                          isSelected
                            ? `${opt.color} ring-2 ring-[#013299] shadow-xs`
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Observación o Nota o Explicación RESET */}
              {modalEstado === 'RESET' ? (
                <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-[#013299] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-blue-900">¿Qué hace Restablecer Automático?</p>
                    <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                      Borra el registro manual guardado para este día. El sistema volverá a calcular la asistencia automáticamente según las rutas de entrega operadas por el chofer: si tuvo ruta completada figurará como <strong>Presente (Automático por Ruta)</strong>; si no tuvo ruta, volverá a estado normal/sin registro.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 uppercase tracking-wide">
                    Observación / Motivo (Opcional)
                  </label>
                  <input
                    type="text"
                    value={modalNota}
                    onChange={e => setModalNota(e.target.value)}
                    placeholder="Ej: Licencia médica #4321, Llegada tarde justificada..."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              )}

              {/* Acciones */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDayStr(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGuardarDia}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#013299] hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow-md shadow-[#013299]/20 hover:shadow-none transition-all disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar Asistencia
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* MODAL PARA REGISTRO MASIVO POR RANGO (VACACIONES, LICENCIAS, ETC.) */}
      {isRangoModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm !m-0 !top-0 !left-0 !right-0 !bottom-0 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden !m-0 animate-in zoom-in-95 duration-150">
            
            {/* Header Modal Rango */}
            <div className="p-4 bg-[#013299] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-lg">
                  <CalendarRange className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider text-blue-200 block">
                    Registro Masivo por Período
                  </span>
                  <h4 className="text-sm font-extrabold text-white">
                    Registrar Rango de Fechas · {nombreUsuario}
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRangoModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido Modal Rango */}
            <div className="p-5 space-y-4">
              
              {/* Fechas Desde / Hasta */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">
                  Rango de Fechas
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">Fecha Desde:</span>
                    <input
                      type="date"
                      value={rangoDesde}
                      onChange={e => setRangoDesde(handleDateInputSoloHabiles(e.target.value))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">Fecha Hasta:</span>
                    <input
                      type="date"
                      value={rangoHasta}
                      onChange={e => setRangoHasta(handleDateInputSoloHabiles(e.target.value))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                </div>

                {/* Atajos rápidos y contador de días */}
                <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400 font-medium text-[11px]">Atajos:</span>
                    <button
                      type="button"
                      onClick={() => aplicarPresetDias(7)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md text-[11px] transition-colors"
                    >
                      7 Días
                    </button>
                    <button
                      type="button"
                      onClick={() => aplicarPresetDias(15)}
                      className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-[#013299] font-bold rounded-md text-[11px] transition-colors border border-blue-200"
                    >
                      15 Días (Vacaciones)
                    </button>
                    <button
                      type="button"
                      onClick={() => aplicarPresetDias(30)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md text-[11px] transition-colors"
                    >
                      30 Días
                    </button>
                  </div>

                  <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                    calcularDiasRango(rangoDesde, rangoHasta) > 0
                      ? 'bg-blue-50 text-[#013299] border border-blue-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {calcularDiasRango(rangoDesde, rangoHasta) > 0
                      ? `${calcularDiasRango(rangoDesde, rangoHasta)} días seleccionados`
                      : 'Rango no válido'}
                  </span>
                </div>
              </div>

              {/* Selector de Estado */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2 uppercase tracking-wide">
                  Estado a Asignar en todos estos días
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'VACACIONES', label: 'Vacaciones', color: 'bg-blue-50 text-blue-800 border-blue-300', icon: Plane },
                    { id: 'LICENCIA', label: 'Licencia Médica', color: 'bg-amber-50 text-amber-800 border-amber-300', icon: AlertTriangle },
                    { id: 'LIBRE', label: 'Días Libres / Feriado', color: 'bg-slate-50 text-slate-700 border-slate-300', icon: Coffee },
                    { id: 'PRESENTE', label: 'Presente', color: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: CheckCircle2 },
                    { id: 'AUSENTE', label: 'Inasistencia', color: 'bg-rose-50 text-rose-800 border-rose-300', icon: XCircle },
                    { id: 'RESET', label: 'Restablecer Auto', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: RotateCcw },
                  ].map(opt => {
                    const isSelected = rangoEstado === opt.id;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRangoEstado(opt.id as any)}
                        className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all text-left ${
                          isSelected
                            ? `${opt.color} ring-2 ring-[#013299] shadow-xs`
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nota opcional o aclaración RESET */}
              {rangoEstado === 'RESET' ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-[#013299] shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                    Restablecerá todos los días de este rango al cálculo automático según los despachos y rutas reales.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 uppercase tracking-wide">
                    Observación / Motivo (Opcional)
                  </label>
                  <input
                    type="text"
                    value={rangoNota}
                    onChange={e => setRangoNota(e.target.value)}
                    placeholder="Ej: Vacaciones legales verano, Licencia médica #5432..."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              )}

              {/* Acciones */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRangoModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGuardarRango}
                  disabled={isSaving || calcularDiasRango(rangoDesde, rangoHasta) <= 0}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#013299] hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow-md shadow-[#013299]/20 hover:shadow-none transition-all disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Aplicar Rango ({calcularDiasRango(rangoDesde, rangoHasta)} días)
                </button>
              </div>

            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
