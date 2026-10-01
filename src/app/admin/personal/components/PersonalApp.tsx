'use client';

import React, { useState, useTransition } from 'react';
import {
  Users,
  BadgePercent,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  Save,
  Calculator,
  Truck,
  Award,
  MapPin,
  Package,
  TrendingUp,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  guardarConfiguracionComisionAction,
  calcularComisionesPersonalAction,
  ComisionConfig,
} from '../actions';

interface PersonalAppProps {
  initialUsuarios: any[];
  initialConfigsMap: Record<string, ComisionConfig>;
}

const TIPO_LABELS: Record<string, string> = {
  MONTO_UNIDAD: 'Monto por Unidad',
  PORCENTAJE: 'Porcentaje de Venta',
  PARADA: 'Monto por Parada',
};

const ROL_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
  OFICINA: 'bg-blue-100 text-blue-700 border-blue-200',
  REPARTIDOR: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PENDIENTE: 'bg-slate-100 text-slate-600 border-slate-200',
};

const defaultConfig = (): ComisionConfig => ({
  tipo: 'MONTO_UNIDAD',
  montoUnidad20L: 300,
  montoUnidad10L: 200,
  montoSoda: 150,
  porcentajeVenta: 5,
  montoParada: 1500,
});

function formatCLP(n: number) {
  return `$${n.toLocaleString('es-CL')}`;
}

export default function PersonalApp({ initialUsuarios, initialConfigsMap }: PersonalAppProps) {
  const [usuarios] = useState(initialUsuarios);
  const [configsMap, setConfigsMap] = useState<Record<string, ComisionConfig>>(initialConfigsMap);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<Record<string, ComisionConfig>>({});
  const [calcResults, setCalcResults] = useState<Record<string, any>>({});
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0]);
  const [isPending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [calcingId, setCalcingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const showToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
    if (!editingConfig[id]) {
      setEditingConfig(prev => ({
        ...prev,
        [id]: configsMap[id] ?? defaultConfig(),
      }));
    }
  };

  const handleConfigChange = (uid: string, field: keyof ComisionConfig, value: any) => {
    setEditingConfig(prev => ({
      ...prev,
      [uid]: { ...prev[uid], [field]: value },
    }));
  };

  const handleSaveConfig = (uid: string) => {
    setSavingId(uid);
    startTransition(async () => {
      const cfg = editingConfig[uid] ?? defaultConfig();
      const res = await guardarConfiguracionComisionAction(uid, cfg);
      if (res.success) {
        setConfigsMap(prev => ({ ...prev, [uid]: cfg }));
        showToast('ok', 'Configuración de comisión guardada.');
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
      } else {
        showToast('err', res.message || 'Error al calcular.');
      }
      setCalcingId(null);
    });
  };

  const repartidores = usuarios.filter((u: any) => u.rol === 'REPARTIDOR');
  const otrosUsuarios = usuarios.filter((u: any) => u.rol !== 'REPARTIDOR');

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-semibold transition-all ${
            toast.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toast.type === 'ok' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2.5 rounded-xl text-[#013299]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900">Fichas Personal</h1>
              <p className="text-xs text-slate-500 font-medium">
                {repartidores.length} repartidores · {otrosUsuarios.length} otros usuarios
              </p>
            </div>
          </div>

          {/* Rango de fechas para cálculo */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <CalendarRange className="h-4 w-4 text-slate-500 shrink-0" />
            <div className="flex items-center gap-1.5 text-xs">
              <label className="text-slate-500 font-medium">Desde</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <label className="text-slate-500 font-medium">Hasta</label>
              <input
                type="date"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN REPARTIDORES */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Truck className="h-4 w-4 text-[#013299]" />
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
            Repartidores
          </h2>
          <span className="ml-auto bg-[#013299] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {repartidores.length}
          </span>
        </div>

        {repartidores.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
            <Truck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-500">No hay repartidores registrados.</p>
          </div>
        )}

        {repartidores.map((u: any) => {
          const isExpanded = expandedId === u.id;
          const cfg = editingConfig[u.id] ?? configsMap[u.id] ?? defaultConfig();
          const result = calcResults[u.id];

          return (
            <div
              key={u.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
            >
              {/* Fila resumen */}
              <button
                onClick={() => toggleExpand(u.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors text-left"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[#013299] flex items-center justify-center font-black text-white text-sm shrink-0">
                  {(u.nombre || 'U').charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">
                      {u.nombre} {u.apellido || ''}
                    </span>
                    <span
                      className={`text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase ${ROL_COLORS[u.rol]}`}
                    >
                      {u.rol}
                    </span>
                    {u.recibe_comision && (
                      <span className="text-[10px] font-bold border px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                        <BadgePercent className="h-3 w-3" /> Comisión Activa
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-slate-500 font-medium">{u.email}</span>
                    {u.vehiculo && (
                      <span className="text-[11px] text-slate-400 font-medium font-mono">
                        🚛 {u.vehiculo.patente}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">
                      {u.rutas_dia?.length ?? 0} rutas registradas
                    </span>
                  </div>
                </div>

                {/* Config actual */}
                {configsMap[u.id] && (
                  <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 shrink-0">
                    <BadgePercent className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-[11px] font-bold text-amber-700">
                      {TIPO_LABELS[configsMap[u.id].tipo]}
                    </span>
                  </div>
                )}

                <div className="shrink-0 text-slate-400">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </div>
              </button>

              {/* Panel expandido */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/40 p-5 space-y-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                    {/* Configuración de comisiones */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <BadgePercent className="h-4 w-4 text-[#013299]" />
                        <h3 className="font-black text-slate-900 text-sm">Regla de Comisión</h3>
                      </div>

                      {/* Tipo de comisión */}
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                          Tipo de Cálculo
                        </label>
                        <select
                          value={cfg.tipo}
                          onChange={e => handleConfigChange(u.id, 'tipo', e.target.value as any)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                          <option value="MONTO_UNIDAD">Monto por Unidad Entregada</option>
                          <option value="PORCENTAJE">Porcentaje sobre Venta</option>
                          <option value="PARADA">Monto por Parada Completada</option>
                        </select>
                      </div>

                      {cfg.tipo === 'MONTO_UNIDAD' && (
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { field: 'montoUnidad20L', label: 'Botellón 20L' },
                            { field: 'montoUnidad10L', label: 'Botellón 10L' },
                            { field: 'montoSoda', label: 'Soda' },
                          ].map(({ field, label }) => (
                            <div key={field}>
                              <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wide">
                                {label}
                              </label>
                              <div className="flex items-center gap-1 border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white focus-within:ring-2 focus-within:ring-blue-300">
                                <span className="text-xs text-slate-400 font-bold">$</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={(cfg as any)[field]}
                                  onChange={e =>
                                    handleConfigChange(u.id, field as keyof ComisionConfig, parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full text-sm font-bold text-slate-800 bg-transparent focus:outline-none"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {cfg.tipo === 'PORCENTAJE' && (
                        <div>
                          <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                            Porcentaje sobre el Total de Ventas
                          </label>
                          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-blue-300">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={cfg.porcentajeVenta}
                              onChange={e =>
                                handleConfigChange(u.id, 'porcentajeVenta', parseFloat(e.target.value) || 0)
                              }
                              className="w-full text-sm font-bold text-slate-800 bg-transparent focus:outline-none"
                            />
                            <span className="text-sm font-bold text-slate-400">%</span>
                          </div>
                        </div>
                      )}

                      {cfg.tipo === 'PARADA' && (
                        <div>
                          <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                            Monto por Parada Completada
                          </label>
                          <div className="flex items-center gap-1 border border-slate-200 rounded-xl px-2.5 py-2 bg-white focus-within:ring-2 focus-within:ring-blue-300">
                            <span className="text-xs text-slate-400 font-bold">$</span>
                            <input
                              type="number"
                              min={0}
                              value={cfg.montoParada}
                              onChange={e =>
                                handleConfigChange(u.id, 'montoParada', parseFloat(e.target.value) || 0)
                              }
                              className="w-full text-sm font-bold text-slate-800 bg-transparent focus:outline-none"
                            />
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => handleSaveConfig(u.id)}
                        disabled={savingId === u.id}
                        className="w-full flex items-center justify-center gap-2 bg-[#013299] hover:bg-blue-900 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60"
                      >
                        {savingId === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Guardar Configuración
                      </button>
                    </div>

                    {/* Panel de cálculo */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-[#013299]" />
                        <h3 className="font-black text-slate-900 text-sm">Cálculo de Período</h3>
                      </div>

                      <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-xs text-slate-600 font-medium">
                        Usando rango: <span className="font-bold text-slate-900">{fechaInicio}</span> al <span className="font-bold text-slate-900">{fechaFin}</span>
                      </div>

                      <button
                        onClick={() => handleCalcular(u.id)}
                        disabled={calcingId === u.id}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60"
                      >
                        {calcingId === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Calculator className="h-4 w-4" />
                        )}
                        Calcular Comisiones
                      </button>

                      {result && (
                        <div className="space-y-3">
                          {/* Totales */}
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: 'Rutas', val: result.resumen.totalRutas, icon: MapPin },
                              { label: 'Paradas', val: result.resumen.totalParadasEntregadas, icon: MapPin },
                              { label: 'Botellon 20L', val: result.resumen.totalBot20L, icon: Package },
                              { label: 'Botellon 10L', val: result.resumen.totalBot10L, icon: Package },
                              { label: 'Soda', val: result.resumen.totalSoda, icon: Package },
                              { label: 'Ventas ($)', val: formatCLP(result.resumen.totalVentasMonto), icon: TrendingUp },
                            ].map(({ label, val, icon: Icon }) => (
                              <div key={label} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-center gap-2">
                                <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <div>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
                                  <p className="text-sm font-black text-slate-900">{val}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Comisión total */}
                          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Award className="h-5 w-5 text-amber-600" />
                              <span className="text-sm font-black text-amber-900">Comisión Total</span>
                            </div>
                            <span className="text-2xl font-black text-amber-700">
                              {formatCLP(result.resumen.comisionTotalCalculada)}
                            </span>
                          </div>

                          {/* Desglose por día */}
                          {result.desgloseDias.length > 0 && (
                            <div>
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                                Desglose por Ruta
                              </p>
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {result.desgloseDias.map((d: any) => (
                                  <div
                                    key={d.id}
                                    className="flex items-center justify-between text-xs bg-white border border-slate-100 rounded-xl px-3 py-2"
                                  >
                                    <div>
                                      <span className="font-bold text-slate-800">{d.fecha}</span>
                                      <span className="text-slate-400 ml-2">{d.nombreRuta}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px]">
                                      <span className="text-slate-500">{d.paradasEntregadas}/{d.paradasTotales} paradas</span>
                                      <span className="font-black text-amber-700">{formatCLP(d.comisionCalculada)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SECCIÓN OTROS USUARIOS */}
      {otrosUsuarios.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Users className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-black text-slate-600 uppercase tracking-widest">
              Otros Usuarios del Sistema
            </h2>
            <span className="ml-auto bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {otrosUsuarios.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {otrosUsuarios.map((u: any) => (
              <div
                key={u.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-600 text-sm shrink-0">
                  {(u.nombre || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">
                    {u.nombre} {u.apellido || ''}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                </div>
                <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase shrink-0 ${ROL_COLORS[u.rol]}`}>
                  {u.rol}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
