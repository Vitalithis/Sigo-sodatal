'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  TrendingUp,
  BadgePercent,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  Save,
  Calculator,
  Truck,
  Award,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  guardarConfiguracionComisionAction,
  calcularComisionesPersonalAction,
} from '../actions';
import { normalizarConfigComision, ComisionConfig } from '../types';
import GraficoComisionesBarras from './GraficoComisionesBarras';

interface ComisionesAppProps {
  initialRepartidores: any[];
  initialConfigsMap: Record<string, ComisionConfig>;
}

function formatCLP(val: number): string {
  return `$${Math.round(val || 0).toLocaleString('es-CL')}`;
}

const defaultConfig = (): ComisionConfig => normalizarConfigComision();

export default function ComisionesApp({
  initialRepartidores,
  initialConfigsMap,
}: ComisionesAppProps) {
  const [repartidores] = useState<any[]>(initialRepartidores);
  const [configsMap, setConfigsMap] = useState<Record<string, ComisionConfig>>(() => {
    const norm: Record<string, ComisionConfig> = {};
    Object.keys(initialConfigsMap).forEach(k => {
      norm[k] = normalizarConfigComision(initialConfigsMap[k]);
    });
    return norm;
  });

  const [expandedId, setExpandedId] = useState<string | null>(repartidores[0]?.id || null);
  const [editingConfig, setEditingConfig] = useState<Record<string, ComisionConfig>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [calcingId, setCalcingId] = useState<string | null>(null);
  const [calcResults, setCalcResults] = useState<Record<string, any>>({});

  // Rango de fechas por defecto: Mes Actual
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  const [fechaInicio, setFechaInicio] = useState(primerDiaMes);
  const [fechaFin, setFechaFin] = useState(ultimoDiaMes);
  const [, startTransition] = useTransition();

  // Toast
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const showToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSetMes = (mesOffset: number) => {
    const target = new Date(hoy.getFullYear(), hoy.getMonth() + mesOffset, 1);
    const pDia = new Date(target.getFullYear(), target.getMonth(), 1).toISOString().split('T')[0];
    const uDia = new Date(target.getFullYear(), target.getMonth() + 1, 0).toISOString().split('T')[0];
    setFechaInicio(pDia);
    setFechaFin(uDia);
  };

  useEffect(() => {
    let cancel = false;
    repartidores.forEach(async (r: any) => {
      try {
        const res = await calcularComisionesPersonalAction(r.id, fechaInicio, fechaFin);
        if (res.success && !cancel) {
          setCalcResults(prev => ({ ...prev, [r.id]: res }));
        }
      } catch (err) {
        // silent catch
      }
    });
    return () => {
      cancel = true;
    };
  }, [repartidores, fechaInicio, fechaFin]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
    if (!calcResults[id]) {
      handleCalcular(id);
    }
  };

  const handleConfigChange = (uid: string, field: keyof ComisionConfig, value: any) => {
    const curr = editingConfig[uid] ?? configsMap[uid] ?? defaultConfig();
    setEditingConfig(prev => ({
      ...prev,
      [uid]: { ...curr, [field]: value },
    }));
  };

  const handleSaveConfig = async (uid: string) => {
    setSavingId(uid);
    startTransition(async () => {
      const cfg = editingConfig[uid] ?? configsMap[uid] ?? defaultConfig();
      const res = await guardarConfiguracionComisionAction(uid, cfg);
      if (res.success) {
        setConfigsMap(prev => ({ ...prev, [uid]: cfg }));
        setEditingConfig(prev => {
          const next = { ...prev };
          delete next[uid];
          return next;
        });
        showToast('ok', 'Regla de comisión guardada con éxito.');
      } else {
        showToast('err', res.message || 'Error al guardar.');
      }
      setSavingId(null);
    });
  };

  const handleCalcular = (uid: string) => {
    setCalcingId(uid);
    startTransition(async () => {
      const res = await calcularComisionesPersonalAction(uid, fechaInicio, fechaFin);
      if (res.success) {
        setCalcResults(prev => ({ ...prev, [uid]: res }));
        showToast('ok', 'Cálculo de comisiones completado.');
      } else {
        showToast('err', res.message || 'Error al calcular comisiones.');
      }
      setCalcingId(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2 text-xs font-black animate-in slide-in-from-bottom duration-200 ${
            toast.type === 'ok'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30'
              : 'bg-rose-600 text-white border-rose-500 shadow-rose-600/30'
          }`}
        >
          {toast.type === 'ok' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header del Módulo */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 text-[#013299] rounded-2xl">
            <TrendingUp className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Módulo de Comisiones y Liquidaciones
            </h1>
          </div>
        </div>

        {/* Selector de Período Global */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200/80 self-start md:self-auto">
          <div className="flex items-center gap-1.5 px-2">
            <CalendarRange className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-black text-slate-600">Período:</span>
          </div>

          <button
            type="button"
            onClick={() => handleSetMes(0)}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-2xs transition-colors"
          >
            Mes Actual
          </button>
          <button
            type="button"
            onClick={() => handleSetMes(-1)}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-2xs transition-colors"
          >
            Mes Anterior
          </button>

          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <input
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-none focus:ring-1 focus:ring-blue-400"
            />
            <span className="text-slate-400 text-xs font-bold">-</span>
            <input
              type="date"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>
      </div>

      {/* Lista de Repartidores */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Truck className="h-4 w-4 text-[#013299]" />
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
            Repartidores Registrados
          </h2>
          <span className="ml-auto bg-[#013299] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {repartidores.length}
          </span>
        </div>

        {repartidores.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
            <Truck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-500">No hay repartidores registrados en el sistema.</p>
          </div>
        )}

        {repartidores.map((u: any) => {
          const isExpanded = expandedId === u.id;
          const cfg = editingConfig[u.id] ?? configsMap[u.id] ?? defaultConfig();
          const savedCfg = configsMap[u.id] ?? defaultConfig();
          const currentEditing = editingConfig[u.id];
          const isDirty = Boolean(
            currentEditing &&
            JSON.stringify(currentEditing) !== JSON.stringify(savedCfg)
          );
          const result = calcResults[u.id];

          return (
            <div
              key={u.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all"
            >
              {/* Encabezado Repartidor */}
              <button
                type="button"
                onClick={() => toggleExpand(u.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-[#013299] flex items-center justify-center font-black text-white text-sm shrink-0">
                  {(u.nombre || 'U').charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {u.nombre} {u.apellido || ''}
                    </span>
                    <span className="text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase bg-blue-50 text-[#013299] border-blue-200">
                      REPARTIDOR
                    </span>
                    {u.vehiculo?.patente ? (
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                        {u.vehiculo.patente}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-dashed border-slate-200">
                        Sin Vehículo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{u.email}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Liquidación</span>
                    <span className="text-sm font-black text-emerald-800">
                      {result ? (
                        formatCLP(result.resumen.comisionTotalCalculada)
                      ) : (
                        <span className="text-xs font-medium text-slate-400 animate-pulse">Calculando...</span>
                      )}
                    </span>
                  </div>

                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                    <Calculator className="h-3.5 w-3.5 text-[#013299]" />
                    {isExpanded ? 'Cerrar Ficha' : 'Calcular Comisiones'}
                  </span>
                  <div className="p-1 rounded-full text-slate-400">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-slate-600" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </button>

              {/* Contenido Desplegable */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    
                    {/* FORMULARIO REGLAS DE COMISIÓN OFICIALES */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <BadgePercent className="h-4 w-4 text-[#013299]" />
                          <h3 className="font-black text-slate-900 text-sm">Reglas de Comisión Sodatal</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 text-[#013299] border border-blue-100">
                            Oficial
                          </span>
                          {isDirty ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                              <AlertCircle className="h-3 w-3 text-amber-600" />
                              Modificaciones sin guardar
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Guardado en sistema
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tarifas Unitarias Configurables */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Botellón 20L - Efectivo o Tarjeta */}
                        <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-emerald-950 uppercase tracking-wide">
                              20L Efectivo / Tarjeta
                            </label>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              En Mano ($150)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 border border-emerald-300 rounded-lg px-2.5 py-1.5 bg-white">
                            <span className="text-xs font-bold text-slate-400">$</span>
                            <input
                              type="number"
                              min={0}
                              value={cfg.monto20L_efectivoTarjeta}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                handleConfigChange(u.id, 'monto20L_efectivoTarjeta', val);
                                handleConfigChange(u.id, 'montoUnidad20L_natural', val);
                              }}
                              className="w-full text-xs font-black text-slate-800 bg-transparent focus:outline-none"
                            />
                            <span className="text-[10px] font-bold text-slate-400">/ unid</span>
                          </div>
                        </div>

                        {/* Botellón 20L - Transferencia o Crédito */}
                        <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-blue-950 uppercase tracking-wide">
                              20L Transf. / Crédito
                            </label>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                              Factura/Guía ($75)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 border border-blue-300 rounded-lg px-2.5 py-1.5 bg-white">
                            <span className="text-xs font-bold text-slate-400">$</span>
                            <input
                              type="number"
                              min={0}
                              value={cfg.monto20L_transferenciaCredito}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                handleConfigChange(u.id, 'monto20L_transferenciaCredito', val);
                                handleConfigChange(u.id, 'montoUnidad20L_empresa', val);
                              }}
                              className="w-full text-xs font-black text-slate-800 bg-transparent focus:outline-none"
                            />
                            <span className="text-[10px] font-bold text-slate-400">/ unid</span>
                          </div>
                        </div>

                        {/* Botellón 10L */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-800 uppercase tracking-wide">
                              Botellón 10L (Siempre)
                            </label>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                              Fijo ($75)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white">
                            <span className="text-xs font-bold text-slate-400">$</span>
                            <input
                              type="number"
                              min={0}
                              value={cfg.monto10L}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                handleConfigChange(u.id, 'monto10L', val);
                                handleConfigChange(u.id, 'montoUnidad10L_natural', val);
                                handleConfigChange(u.id, 'montoUnidad10L_empresa', val);
                              }}
                              className="w-full text-xs font-black text-slate-800 bg-transparent focus:outline-none"
                            />
                            <span className="text-[10px] font-bold text-slate-400">/ unid</span>
                          </div>
                        </div>

                        {/* Soda / Sifón */}
                        <div className="p-3 bg-cyan-50/70 rounded-xl border border-cyan-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-cyan-950 uppercase tracking-wide">
                              Soda / Sifón (Unitaria)
                            </label>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800">
                              Fijo ($6)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 border border-cyan-300 rounded-lg px-2.5 py-1.5 bg-white">
                            <span className="text-xs font-bold text-slate-400">$</span>
                            <input
                              type="number"
                              min={0}
                              value={cfg.montoSoda}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                handleConfigChange(u.id, 'montoSoda', val);
                                handleConfigChange(u.id, 'montoSoda_natural', val);
                                handleConfigChange(u.id, 'montoSoda_empresa', val);
                              }}
                              className="w-full text-xs font-black text-slate-800 bg-transparent focus:outline-none"
                            />
                            <span className="text-[10px] font-bold text-slate-400">/ unid</span>
                          </div>
                        </div>
                      </div>

                      {/* Botón Guardar Regla */}
                      <button
                        type="button"
                        onClick={() => handleSaveConfig(u.id)}
                        disabled={savingId === u.id || !isDirty}
                        className={`w-full flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs ${
                          !isDirty
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100/80 cursor-default'
                            : 'bg-[#013299] hover:bg-blue-900 text-white shadow-sm ring-2 ring-blue-500/20'
                        }`}
                      >
                        {savingId === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : !isDirty ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {!isDirty ? '✓ Configuración Guardada en BD' : 'Guardar Regla de Comisión'}
                      </button>

                      <div className="text-center pt-0.5">
                        {!isDirty ? (
                          <span className="text-[11px] text-emerald-700 font-medium">
                            ✓ Estos valores están guardados en la base de datos y se usan en las liquidaciones.
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-700 font-bold animate-pulse">
                            ● Hay modificaciones pendientes. Presiona "Guardar Regla de Comisión" para aplicarlas.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* PANEL DE CÁLCULO DE COMISIONES DEL PERÍODO */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-4 w-4 text-[#013299]" />
                          <h3 className="font-black text-slate-900 text-sm">Liquidación de Comisiones</h3>
                        </div>
                        <span className="text-xs text-slate-500 font-bold">
                          {fechaInicio} al {fechaFin}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCalcular(u.id)}
                        disabled={calcingId === u.id}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60 shadow-sm"
                      >
                        {calcingId === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Calculator className="h-4 w-4" />
                        )}
                        Calcular Comisiones (Recargas y Ventas)
                      </button>

                      {result && (
                        <div className="space-y-3.5 pt-1">
                          {/* Tarjeta Destacada de Comisión Total */}
                          <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl p-4 flex items-center justify-between shadow-md">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-white/20 rounded-xl shrink-0">
                                <Award className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-100 block">
                                  Comisión Total Ganada
                                </span>
                                <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
                                  <span className="text-2xl font-black text-white">
                                    {formatCLP(result.resumen.comisionTotalCalculada)}
                                  </span>
                                  <div className="inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-xs px-3 py-1 rounded-xl text-white border border-white/20">
                                    <span className="text-[11px] font-medium text-amber-100">Total entregado:</span>
                                    <span className="text-sm font-black text-white">
                                      {(result.resumen.totalBot20L ?? ((result.resumen.natural?.bot20L || 0) + (result.resumen.empresa?.bot20L || 0))) +
                                       (result.resumen.totalBot10L ?? ((result.resumen.natural?.bot10L || 0) + (result.resumen.empresa?.bot10L || 0))) +
                                       (result.resumen.totalSoda ?? ((result.resumen.natural?.soda || 0) + (result.resumen.empresa?.soda || 0)))} unidades
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right text-xs text-amber-100 font-bold shrink-0">
                              <span className="block text-[11px] text-amber-200">
                                {result.resumen.totalParadasEntregadas} paradas entregadas
                              </span>
                            </div>
                          </div>

                          {/* Suma de Productos Entregados: Total 20L, 10L y Sodas */}
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-blue-900">Botellón 20L</span>
                                <span className="text-xs font-black text-blue-950">
                                  {(result.resumen.totalBot20L ?? ((result.resumen.natural?.bot20L || 0) + (result.resumen.empresa?.bot20L || 0)))} un.
                                </span>
                              </div>
                              <div className="text-[10px] text-blue-700 font-bold flex justify-between">
                                <span>Emp: {result.resumen.empresa?.bot20L ?? 0}</span>
                                <span>Nat: {result.resumen.natural?.bot20L ?? 0}</span>
                              </div>
                            </div>

                            <div className="p-2.5 bg-slate-100/80 border border-slate-300 rounded-xl space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-slate-800">Botellón 10L</span>
                                <span className="text-xs font-black text-slate-900">
                                  {(result.resumen.totalBot10L ?? ((result.resumen.natural?.bot10L || 0) + (result.resumen.empresa?.bot10L || 0)))} un.
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-600 font-bold flex justify-between">
                                <span>Emp: {result.resumen.empresa?.bot10L ?? 0}</span>
                                <span>Nat: {result.resumen.natural?.bot10L ?? 0}</span>
                              </div>
                            </div>

                            <div className="p-2.5 bg-cyan-50/70 border border-cyan-200 rounded-xl space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-cyan-950">Total Sodas</span>
                                <span className="text-xs font-black text-cyan-950">
                                  {(result.resumen.totalSoda ?? ((result.resumen.natural?.soda || 0) + (result.resumen.empresa?.soda || 0)))} un.
                                </span>
                              </div>
                              <div className="text-[10px] text-cyan-700 font-bold flex justify-between">
                                <span>Emp: {result.resumen.empresa?.soda ?? 0}</span>
                                <span>Nat: {result.resumen.natural?.soda ?? 0}</span>
                              </div>
                            </div>
                          </div>

                          {/* Desglose por Medio de Pago y Producto según Reglas Oficiales */}
                          {result.resumen.mediosPagoDetalle && (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                              <div className="flex items-center justify-between text-[11px] font-black text-slate-700 uppercase">
                                <span>Desglose por Tarifa y Medio de Pago</span>
                                <span className="text-slate-400 font-normal text-[10px]">Ventas y Recargas</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="p-2 bg-emerald-50/80 border border-emerald-200 rounded-lg">
                                  <div className="text-emerald-950 font-bold flex justify-between">
                                    <span>20L Efectivo / Tarj.</span>
                                    <span className="text-[10px] text-emerald-700 font-bold">(${result.resumen.mediosPagoDetalle.tarifa20Efectivo})</span>
                                  </div>
                                  <div className="text-xs font-black text-emerald-950 mt-0.5">
                                    {result.resumen.mediosPagoDetalle.bot20EfectivoTarjeta} un. = {formatCLP(result.resumen.mediosPagoDetalle.subtotal20Efectivo)}
                                  </div>
                                </div>

                                <div className="p-2 bg-blue-50/80 border border-blue-200 rounded-lg">
                                  <div className="text-blue-950 font-bold flex justify-between">
                                    <span>20L Transf. / Crédito</span>
                                    <span className="text-[10px] text-blue-700 font-bold">(${result.resumen.mediosPagoDetalle.tarifa20Credito})</span>
                                  </div>
                                  <div className="text-xs font-black text-blue-950 mt-0.5">
                                    {result.resumen.mediosPagoDetalle.bot20TransferenciaCredito} un. = {formatCLP(result.resumen.mediosPagoDetalle.subtotal20Credito)}
                                  </div>
                                </div>

                                <div className="p-2 bg-slate-100/90 border border-slate-300 rounded-lg">
                                  <div className="text-slate-800 font-bold flex justify-between">
                                    <span>10 Litros (Fijo)</span>
                                    <span className="text-[10px] text-slate-600 font-bold">(${result.resumen.mediosPagoDetalle.tarifa10})</span>
                                  </div>
                                  <div className="text-xs font-black text-slate-900 mt-0.5">
                                    {result.resumen.mediosPagoDetalle.bot10L} un. = {formatCLP(result.resumen.mediosPagoDetalle.subtotal10)}
                                  </div>
                                </div>

                                <div className="p-2 bg-cyan-50/80 border border-cyan-200 rounded-lg">
                                  <div className="text-cyan-950 font-bold flex justify-between">
                                    <span>Soda / Sifón</span>
                                    <span className="text-[10px] text-cyan-700 font-bold">(${result.resumen.mediosPagoDetalle.tarifaSoda})</span>
                                  </div>
                                  <div className="text-xs font-black text-cyan-950 mt-0.5">
                                    {result.resumen.mediosPagoDetalle.soda} un. = {formatCLP(result.resumen.mediosPagoDetalle.subtotalSoda)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Desglose rápido: Recargas vs Ventas */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Comisión Recargas</span>
                              <span className="text-base font-black text-emerald-950">
                                {formatCLP(result.resumen.comisionRecargasTotal ?? (result.resumen.natural.comisionRecargas + result.resumen.empresa.comisionRecargas))}
                              </span>
                              <span className="text-[10px] text-emerald-700 block">
                                Nat: {result.resumen.recargas?.natural.total ?? result.resumen.natural.bot20L} un. | Emp: {result.resumen.recargas?.empresa.total ?? result.resumen.empresa.bot20L} un.
                              </span>
                            </div>
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                              <span className="text-[10px] font-bold text-blue-800 uppercase block">Comisión Ventas</span>
                              <span className="text-base font-black text-blue-950">
                                {formatCLP(result.resumen.comisionVentasTotal ?? (result.resumen.natural.comisionVentas + result.resumen.empresa.comisionVentas))}
                              </span>
                              <span className="text-[10px] text-blue-700 block">
                                Total vendido: {formatCLP(result.resumen.totalVentasMonto)}
                              </span>
                            </div>
                          </div>

                          {/* Desglose por Meses o Días */}
                          {result.desgloseMeses?.length > 0 ? (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                                Desglose Mensual ({result.desgloseMeses.length} {result.desgloseMeses.length === 1 ? 'mes' : 'meses'})
                              </span>
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {result.desgloseMeses.map((m: any) => (
                                  <div
                                    key={m.mesKey}
                                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-black text-slate-900 text-xs">{m.nombreMes}</span>
                                      <span className="font-black text-emerald-800 text-xs">{formatCLP(m.comisionTotal)}</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1 text-[11px] font-bold text-slate-700 bg-white p-1.5 rounded-lg border border-slate-100">
                                      <div><span className="text-slate-400 block text-[9px]">20L</span>{m.bot20Total} un.</div>
                                      <div><span className="text-slate-400 block text-[9px]">10L</span>{m.bot10Total} un.</div>
                                      <div><span className="text-cyan-700 block text-[9px]">Soda</span>{m.sodaTotal} un.</div>
                                      <div><span className="text-slate-900 block text-[9px]">Total</span>{m.totalUnidades} un.</div>
                                    </div>
                                    <div className="text-[10px] text-slate-500 flex justify-between font-medium pt-0.5">
                                      <span>{m.totalRutas} rutas ({m.totalParadasEntregadas} entregas)</span>
                                      <span>Emp: {m.bot20Empresa + m.bot10Empresa + m.sodaEmpresa} | Nat: {m.bot20Natural + m.bot10Natural + m.sodaNatural}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : result.desgloseDias?.length > 0 ? (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                                Desglose por Día ({result.desgloseDias.length} rutas)
                              </span>
                              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                {result.desgloseDias.map((d: any) => (
                                  <div
                                    key={d.id}
                                    className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-1.5"
                                  >
                                    <div>
                                      <span className="font-extrabold text-slate-800">{d.fecha}</span>
                                      <span className="text-slate-400 text-[11px] ml-2 font-medium">{d.nombreRuta}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px]">
                                      <span className="text-blue-700 font-bold">20L: {d.bot20Total}</span>
                                      <span className="text-slate-700 font-bold">10L: {d.bot10Total}</span>
                                      <span className="text-cyan-700 font-bold">Soda: {d.sodaTotal}</span>
                                      <span className="font-black text-slate-900">{formatCLP(d.comisionCalculada)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* ── GRÁFICO DE BARRAS (NATURAL VS EMPRESA) ── */}
                  {result?.resumen && (
                    <GraficoComisionesBarras resumen={result.resumen} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
