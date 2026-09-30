import React from 'react';
import Link from 'next/link';
import { obtenerMetricasDashboardAction } from './actions';
import { 
  AlertTriangle, 
  Activity, 
  ArrowRight,
  Wifi,
  WifiOff,
  Box,
  Wrench,
  MapPin,
  Navigation
} from 'lucide-react';

export const metadata = {
  title: 'Panel de Control - SIGO Sodatal',
  description: 'Visión general del estado del negocio, logística, flota de camiones y pedidos.',
};

export default async function AdminDashboardPage() {
  const respuesta = await obtenerMetricasDashboardAction();
  
  const metricas = respuesta.success && respuesta.data ? respuesta.data : {
    pedidos: { total: 0, entregados: 0, porcentaje: 0 },
    flota: { activos: 0, totales: 0 },
    alertas: 0,
    ingresos: 0,
    productosCriticos: 0,
    co2: { porcentaje: 0, kg_restantes: 0, rendimiento_estimado: 0 },
    choferesOperando: []
  };

  return (
    <div className="space-y-6 pb-12">

      {/* Alerta de conexión fallida o estado de sincronización */}
      {!respuesta.success ? (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl shadow-sm flex items-start gap-3">
          <WifiOff className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-rose-800">Error de Sincronización</h3>
            <p className="text-xs text-rose-600 mt-1">
              No pudimos conectar con la base de datos. Los datos mostrados a continuación son valores por defecto.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
            <Wifi className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
            Sistema Sincronizado
          </span>
        </div>
      )}

      {/* PANEL CHOFERES Y SECTORES EN OPERACIÓN */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2.5 rounded-xl text-[#013299]">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Sectores de Operación por Chofer</h2>
              <p className="text-xs text-slate-500">Ubicación y sector activo de la flota de reparto en tiempo real</p>
            </div>
          </div>
          <Link
            href="/admin/rutas"
            className="text-xs font-bold text-[#013299] hover:text-blue-900 bg-blue-50 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
          >
            Ver Hojas de Ruta <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {metricas.choferesOperando && metricas.choferesOperando.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metricas.choferesOperando.map((c: any) => (
              <div key={c.rutaId} className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/60 flex flex-col justify-between space-y-3 hover:border-blue-300 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">{c.choferNombre}</span>
                    <span className="text-[11px] font-semibold text-slate-500">{c.vehiculoModelo}</span>
                  </div>
                  <span className="bg-[#013299] text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg shadow-sm">
                    {c.vehiculoPatente}
                  </span>
                </div>

                <div className="bg-white border border-slate-200/80 p-3 rounded-xl space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-1.5 text-xs text-[#013299] font-extrabold">
                    <Navigation className="h-4 w-4 animate-pulse" />
                    <span>Sector Actual: {c.sectorActual}</span>
                  </div>
                  {c.comunaActual && (
                    <p className="text-[11px] text-slate-500 font-medium pl-5.5">Comuna: {c.comunaActual}</p>
                  )}
                  {c.sectoresTotales?.length > 1 && (
                    <div className="text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                      Sectores de la ruta: <span className="font-semibold text-slate-700">{c.sectoresTotales.join(', ')}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-slate-500 text-[11px] font-medium">Progreso del día:</span>
                  <span className="font-bold text-slate-800 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg text-[11px]">
                    {c.paradasEntregadas} / {c.paradasTotal} paradas ({c.paradasTotal > 0 ? Math.round((c.paradasEntregadas / c.paradasTotal) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl space-y-1">
            <MapPin className="h-6 w-6 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No hay choferes operando en rutas activas en este momento.</p>
            <p className="text-[11px] text-slate-400">Inicia las hojas de ruta del día para comenzar el seguimiento de sectores.</p>
          </div>
        )}
      </div>

      {/* BLOQUE INFERIOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* PANEL IZQUIERDO: ESTADO DE PRODUCCIÓN CO2 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2 text-base">
              <Activity className="h-5 w-5 text-[#013299]" />
              Estado de Producción
            </h2>
            <Link
              href="/admin/produccion"
              className="text-xs font-bold text-[#013299] hover:text-blue-900 bg-blue-50 px-3 py-1.5 rounded-xl transition-colors"
            >
              Ver Módulo
            </Link>
          </div>

          <div className="p-6 flex items-center gap-8 flex-1">
            {/* Cilindro CO2 */}
            <div className="relative w-20 h-40 border-4 border-slate-300 rounded-t-3xl rounded-b-lg overflow-hidden bg-slate-100 flex flex-col justify-end shadow-inner shrink-0">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-3 bg-slate-400 rounded-b-sm border-b-2 border-slate-500 z-10" />
              <div
                className={`w-full transition-all duration-1000 ease-out relative ${
                  metricas.co2.porcentaje < 20
                    ? 'bg-gradient-to-t from-rose-600 to-rose-400'
                    : 'bg-gradient-to-t from-[#013299] to-blue-400'
                }`}
                style={{ height: `${metricas.co2.porcentaje}%` }}
              >
                <div className="absolute inset-y-0 left-0 w-3 bg-white/20" />
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-4xl font-black text-slate-900 tracking-tight">
                  {metricas.co2.kg_restantes.toFixed(2)} kg
                </h3>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mt-1">
                  Capacidad restante ({metricas.co2.porcentaje.toFixed(1)}%)
                </p>
              </div>

              {metricas.co2.porcentaje < 20 ? (
                <div className="text-sm font-bold text-white bg-rose-600 p-4 rounded-xl flex items-start gap-2 shadow-sm">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <p>¡Nivel de CO₂ Bajo!</p>
                </div>
              ) : (
                <div className="text-sm font-semibold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  El suministro de CO₂ actual es estable.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: STOCK Y MANTENIMIENTO */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-base">Stock y Mantenimiento</h2>
          </div>

          <div className="p-5 space-y-4 flex-1">

            {/* Quiebres de Stock */}
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/70 transition-colors">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                metricas.productosCriticos > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                <Box className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">Quiebres de Stock</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                  {metricas.productosCriticos > 0
                    ? 'Productos bajo stock mínimo'
                    : 'Sin quiebres registrados'}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-lg font-black text-sm shrink-0 ${
                metricas.productosCriticos > 0
                  ? 'bg-rose-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}>
                {metricas.productosCriticos}
              </span>
            </div>

            {/* Flota Mantenimiento */}
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/70 transition-colors">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                metricas.alertas > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                <Wrench className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">Flota Mantenimiento</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                  {metricas.alertas > 0
                    ? 'Vehículos en mantenimiento'
                    : 'Flota en óptimas condiciones'}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-lg font-black text-sm shrink-0 ${
                metricas.alertas > 0
                  ? 'bg-amber-500 text-white'
                  : 'bg-emerald-600 text-white'
              }`}>
                {metricas.alertas}
              </span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
