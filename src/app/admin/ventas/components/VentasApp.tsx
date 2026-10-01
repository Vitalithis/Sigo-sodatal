'use client';

import React, { useState, useTransition, useCallback } from 'react';
import {
  TrendingUp,
  RefreshCw,
  Truck,
  Loader2,
  AlertCircle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  User,
  Building2,
  Hash,
  CalendarDays,
} from 'lucide-react';
import { obtenerVentasPorAnioAction, MesData, SegmentoVentas } from '../actions';

function clp(n: number) {
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

const MES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ─── Celda de cantidad ───────────────────────────────────────────────────────
function CeldaQty({
  venta,
  recarga,
}: {
  venta: number;
  recarga: number;
}) {
  const total = venta + recarga;
  return (
    <div className="text-center">
      <span className="block text-sm font-black text-slate-900">{total}</span>
    </div>
  );
}

// ─── Tabla de repartidores ────────────────────────────────────────────────────
function TablaRepartidores({ mes }: { mes: MesData }) {
  const maxMonto = mes.repartidores[0]?.montoTotal || 1;

  if (mes.repartidores.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
        <Truck className="h-7 w-7 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-400">Sin ventas en este mes.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 font-black text-slate-600 uppercase tracking-wider">Repartidor</th>
              {/* Particulares */}
              <th className="px-3 py-3 font-black text-[#013299] uppercase tracking-wider text-center" colSpan={3}>
                <div className="flex items-center justify-center gap-1">
                  <User className="h-3 w-3" />
                  <span>Particulares</span>
                </div>
              </th>
              {/* Empresas */}
              <th className="px-3 py-3 font-black text-amber-700 uppercase tracking-wider text-center" colSpan={3}>
                <div className="flex items-center justify-center gap-1">
                  <Building2 className="h-3 w-3" />
                  <span>Empresas</span>
                </div>
              </th>
              {/* Totales */}
              <th className="px-3 py-3 font-black text-emerald-700 uppercase tracking-wider text-center" colSpan={3}>
                <div className="flex items-center justify-center gap-1">
                  <Hash className="h-3 w-3" />
                  <span>Total</span>
                </div>
              </th>
              <th className="text-right px-4 py-3 font-black text-slate-600 uppercase tracking-wider">Monto</th>
            </tr>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
              <th className="px-4 py-1.5"></th>
              <th className="px-3 py-1.5 text-center text-[#013299]/70">20L</th>
              <th className="px-3 py-1.5 text-center text-[#013299]/70">10L</th>
              <th className="px-3 py-1.5 text-center text-[#013299]/70">Soda</th>
              <th className="px-3 py-1.5 text-center text-amber-600/70">20L</th>
              <th className="px-3 py-1.5 text-center text-amber-600/70">10L</th>
              <th className="px-3 py-1.5 text-center text-amber-600/70">Soda</th>
              <th className="px-3 py-1.5 text-center text-emerald-600/70">20L</th>
              <th className="px-3 py-1.5 text-center text-emerald-600/70">10L</th>
              <th className="px-3 py-1.5 text-center text-emerald-600/70">Soda</th>
              <th className="px-4 py-1.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {mes.repartidores.map((r, idx) => {
              const pct = Math.round((r.montoTotal / maxMonto) * 100);
              return (
                <tr
                  key={r.repartidorId}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  {/* Repartidor */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-[150px]">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] shrink-0"
                        style={{
                          backgroundColor: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#e2e8f0',
                          color: idx < 3 ? 'white' : '#64748b',
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-xs truncate">{r.repartidorNombre}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {r.vehiculoPatente && (
                            <span className="font-mono font-bold text-[10px] text-slate-400">
                              {r.vehiculoPatente}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">{r.totalGuias} guías</span>
                        </div>
                        {/* Barra de progreso */}
                        <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden max-w-[120px]">
                          <div
                            className="h-full bg-[#013299] rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Particulares */}
                  <td className="px-3 py-3 bg-blue-50/30">
                    <CeldaQty venta={r.particular.bot20L} recarga={r.particular.recargasBot20L} />
                  </td>
                  <td className="px-3 py-3 bg-blue-50/30">
                    <CeldaQty venta={r.particular.bot10L} recarga={r.particular.recargasBot10L} />
                  </td>
                  <td className="px-3 py-3 bg-blue-50/30 border-r border-slate-100">
                    <CeldaQty venta={r.particular.soda} recarga={r.particular.recargasSoda} />
                  </td>

                  {/* Empresas */}
                  <td className="px-3 py-3 bg-amber-50/30">
                    <CeldaQty venta={r.empresa.bot20L} recarga={r.empresa.recargasBot20L} />
                  </td>
                  <td className="px-3 py-3 bg-amber-50/30">
                    <CeldaQty venta={r.empresa.bot10L} recarga={r.empresa.recargasBot10L} />
                  </td>
                  <td className="px-3 py-3 bg-amber-50/30 border-r border-slate-100">
                    <CeldaQty venta={r.empresa.soda} recarga={r.empresa.recargasSoda} />
                  </td>

                  {/* Totales */}
                  <td className="px-3 py-3 bg-emerald-50/30">
                    <CeldaQty venta={r.total.bot20L} recarga={r.total.recargasBot20L} />
                  </td>
                  <td className="px-3 py-3 bg-emerald-50/30">
                    <CeldaQty venta={r.total.bot10L} recarga={r.total.recargasBot10L} />
                  </td>
                  <td className="px-3 py-3 bg-emerald-50/30">
                    <CeldaQty venta={r.total.soda} recarga={r.total.recargasSoda} />
                  </td>

                  {/* Monto */}
                  <td className="px-4 py-3 text-right">
                    <span className="font-black text-slate-900 text-sm whitespace-nowrap">{clp(r.montoTotal)}</span>
                    <span className="block text-[10px] text-slate-400">{pct}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Fila TOTAL */}
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-200 font-black">
              <td className="px-4 py-3 text-xs font-black text-slate-700 uppercase">TOTAL MES</td>
              {/* Part totals */}
              <td className="px-3 py-3 text-center text-sm font-black text-[#013299]">
                <CeldaQty venta={mes.globalParticular.bot20L} recarga={mes.globalParticular.recargasBot20L} />
              </td>
              <td className="px-3 py-3 text-center bg-blue-50/50">
                <CeldaQty venta={mes.globalParticular.bot10L} recarga={mes.globalParticular.recargasBot10L} />
              </td>
              <td className="px-3 py-3 text-center bg-blue-50/50 border-r border-slate-200">
                <CeldaQty venta={mes.globalParticular.soda} recarga={mes.globalParticular.recargasSoda} />
              </td>
              {/* Empresa totals */}
              <td className="px-3 py-3 text-center bg-amber-50/50">
                <CeldaQty venta={mes.globalEmpresa.bot20L} recarga={mes.globalEmpresa.recargasBot20L} />
              </td>
              <td className="px-3 py-3 text-center bg-amber-50/50">
                <CeldaQty venta={mes.globalEmpresa.bot10L} recarga={mes.globalEmpresa.recargasBot10L} />
              </td>
              <td className="px-3 py-3 text-center bg-amber-50/50 border-r border-slate-200">
                <CeldaQty venta={mes.globalEmpresa.soda} recarga={mes.globalEmpresa.recargasSoda} />
              </td>
              {/* Global totals */}
              <td className="px-3 py-3 text-center bg-emerald-50/50">
                <CeldaQty venta={mes.globalTotal.bot20L} recarga={mes.globalTotal.recargasBot20L} />
              </td>
              <td className="px-3 py-3 text-center bg-emerald-50/50">
                <CeldaQty venta={mes.globalTotal.bot10L} recarga={mes.globalTotal.recargasBot10L} />
              </td>
              <td className="px-3 py-3 text-center bg-emerald-50/50">
                <CeldaQty venta={mes.globalTotal.soda} recarga={mes.globalTotal.recargasSoda} />
              </td>
              <td className="px-4 py-3 text-right font-black text-slate-900">
                {clp(mes.montoTotal)}
                <span className="block text-[10px] text-slate-400 font-semibold">{mes.totalGuias} guías</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Resumen anual (tarjetas) ─────────────────────────────────────────────────
function ResumenAnual({ anual }: { anual: any }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <BarChart3 className="h-4 w-4 text-[#013299]" />
        <h2 className="font-black text-slate-900 text-sm">Resumen Anual Acumulado</h2>
        <span className="ml-auto bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full">
          {anual.totalGuias} guías
        </span>
        <span className="bg-[#013299] text-white text-xs font-black px-3 py-1 rounded-xl">
          {clp(anual.montoTotal)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Particulares */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-[#013299]" />
            <span className="font-black text-slate-900 text-sm">Particulares</span>
            <span className="ml-auto font-black text-[#013299]">{clp(anual.globalParticular.monto)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: '20L', v: anual.globalParticular.bot20L + anual.globalParticular.recargasBot20L },
              { label: '10L', v: anual.globalParticular.bot10L + anual.globalParticular.recargasBot10L },
              { label: 'Soda', v: anual.globalParticular.soda + anual.globalParticular.recargasSoda },
            ].map(({ label, v }) => (
              <div key={label} className="bg-white rounded-xl border border-blue-100 py-2 px-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</p>
                <p className="text-xl font-black text-slate-900">{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Empresas */}
        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-amber-600" />
            <span className="font-black text-slate-900 text-sm">Empresas</span>
            <span className="ml-auto font-black text-amber-700">{clp(anual.globalEmpresa.monto)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: '20L', v: anual.globalEmpresa.bot20L + anual.globalEmpresa.recargasBot20L },
              { label: '10L', v: anual.globalEmpresa.bot10L + anual.globalEmpresa.recargasBot10L },
              { label: 'Soda', v: anual.globalEmpresa.soda + anual.globalEmpresa.recargasSoda },
            ].map(({ label, v }) => (
              <div key={label} className="bg-white rounded-xl border border-amber-100 py-2 px-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</p>
                <p className="text-xl font-black text-slate-900">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function VentasApp() {
  const anioActual = new Date().getFullYear();
  const mesActual = new Date().getMonth(); // 0-11

  const [anio, setAnio] = useState(anioActual);
  const [data, setData] = useState<{
    mesesData: MesData[];
    anual: any;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mesActivo, setMesActivo] = useState<number>(mesActual);

  const cargarDatos = useCallback((anioTarget: number) => {
    setError(null);
    startTransition(async () => {
      const res = await obtenerVentasPorAnioAction(anioTarget);
      if (res.success) {
        setData({ mesesData: res.mesesData, anual: res.anual });
        // Activar el mes más reciente con datos
        const mesesConDatos = res.mesesData.map(m => m.mes);
        if (mesesConDatos.length > 0) {
          // Si el mes actual tiene datos, usarlo; si no, el último con datos
          const mesPref = mesesConDatos.includes(mesActual) ? mesActual : mesesConDatos[mesesConDatos.length - 1];
          setMesActivo(mesPref);
        }
      } else {
        setError((res as any).message || 'Error al obtener datos.');
      }
    });
  }, [mesActual]);

  const cambiarAnio = (delta: number) => {
    const nuevoAnio = anio + delta;
    setAnio(nuevoAnio);
    if (data) cargarDatos(nuevoAnio);
  };

  const mesData = data?.mesesData.find(m => m.mes === mesActivo);
  const mesesDisponibles = data?.mesesData.map(m => m.mes) ?? [];

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2.5 rounded-xl text-[#013299]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900">Módulo de Ventas</h1>
              <p className="text-xs text-slate-500 font-medium">
                Unidades vendidas por repartidor · Particulares vs Empresas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Selector de año */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5">
              <button
                onClick={() => cambiarAnio(-1)}
                className="p-1 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </button>
              <span className="font-black text-slate-900 text-sm px-2 min-w-[50px] text-center">{anio}</span>
              <button
                onClick={() => cambiarAnio(1)}
                disabled={anio >= anioActual}
                className="p-1 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </button>
            </div>

            <button
              onClick={() => cargarDatos(anio)}
              disabled={isPending}
              className="flex items-center gap-2 bg-[#013299] hover:bg-blue-900 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {data ? 'Actualizar' : 'Cargar'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Leyenda ── */}
      <div className="flex items-center gap-4 px-1 flex-wrap text-[11px] font-bold text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#013299]/20 border border-[#013299]/30" />
          <span className="text-[#013299]">Particulares (Domicilio)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-400/20 border border-amber-400/30" />
          <span className="text-amber-700">Empresas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-400/20 border border-emerald-400/30" />
          <span className="text-emerald-700">Total (ventas + recargas)</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Estado vacío */}
      {!data && !isPending && !error && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center space-y-3">
          <BarChart3 className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-500">
            Presiona <strong>"Cargar"</strong> para ver las ventas del año {anio}.
          </p>
        </div>
      )}

      {isPending && (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <Loader2 className="h-8 w-8 text-[#013299] mx-auto animate-spin" />
          <p className="text-sm font-semibold text-slate-400 mt-3">Cargando ventas de {anio}…</p>
        </div>
      )}

      {data && !isPending && (
        <>
          {/* ── Tabs de meses ── */}
          {mesesDisponibles.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <CalendarDays className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-400">Sin ventas registradas en {anio}.</p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {mesesDisponibles.map(m => {
                  const mData = data.mesesData.find(md => md.mes === m)!;
                  const isActive = m === mesActivo;
                  return (
                    <button
                      key={m}
                      onClick={() => setMesActivo(m)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                        isActive
                          ? 'bg-[#013299] text-white border-[#013299] shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {MES_NOMBRES[m]}
                      {isActive && (
                        <span className="ml-1.5 bg-white/20 px-1.5 py-0.5 rounded-md text-[10px]">
                          {mData.totalGuias}g
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tabla del mes activo */}
              {mesData && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <Truck className="h-4 w-4 text-[#013299]" />
                    <h2 className="font-black text-slate-800 text-sm">
                      {MES_NOMBRES[mesData.mes]} {mesData.anio}
                    </h2>
                    <span className="text-xs text-slate-400 font-medium">
                      · {mesData.totalGuias} guías · {mesData.repartidores.length} repartidores
                    </span>
                    <span className="ml-auto font-black text-[#013299] text-sm">{clp(mesData.montoTotal)}</span>
                  </div>
                  <TablaRepartidores mes={mesData} />
                </div>
              )}

              {/* ── Resumen anual (al final) ── */}
              {data.anual && data.anual.totalGuias > 0 && (
                <ResumenAnual anual={data.anual} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
