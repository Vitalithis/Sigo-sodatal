import React from 'react';
import Link from 'next/link';
import { obtenerMetricasDashboardAction } from './actions';
import { 
  TrendingUp, 
  Package, 
  Truck, 
  AlertTriangle, 
  Activity, 
  ArrowRight,
  Wifi,
  WifiOff,
  Box,
  Wrench,
  ClipboardList
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
    co2: { porcentaje: 0, kg_restantes: 0, rendimiento_estimado: 0 }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Alerta de conexión fallida */}
      {!respuesta.success && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm flex items-start gap-3">
          <WifiOff className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-red-800">Error de Sincronización</h3>
            <p className="text-xs text-red-600 mt-1">
              No pudimos conectar con la base de datos. Los datos mostrados a continuación son valores por defecto o están desactualizados.
            </p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-200 gap-4">

        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm border self-start sm:self-center ${
          respuesta.success ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'
        }`}>
          {respuesta.success ? (
            <><Wifi className="h-3.5 w-3.5 text-green-600 animate-pulse" />Sistema Sincronizado</>
          ) : (
            <><WifiOff className="h-3.5 w-3.5 text-gray-500" />Sin Conexión</>
          )}
        </span>
      </div>

      {/* TARJETAS DE MÉTRICAS — colores sólidos al estilo de la imagen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* INGRESOS — verde */}
        <Link
          href="/admin/cuadratura"
          className="bg-green-500 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between overflow-hidden group"
        >
          <div className="p-5 text-white">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-90">INGRESOS</p>
              <div className="bg-white/20 p-2 rounded-xl">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-4xl font-black mt-2 tracking-tight">
              ${metricas.ingresos.toLocaleString('es-CL')}
            </p>
            <p className="text-xs font-medium opacity-80 mt-1">Resumen de ingresos</p>
          </div>
          <div className="bg-green-600 text-white text-xs font-bold py-2.5 px-5 flex items-center justify-between group-hover:bg-green-700 transition-colors">
            <span>Ver Detalles</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        {/* PEDIDOS — amarillo/ámbar */}
        <Link
          href="/admin/rutas"
          className="bg-amber-400 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between overflow-hidden group"
        >
          <div className="p-5 text-white">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-90">PEDIDOS</p>
              <div className="bg-white/20 p-2 rounded-xl">
                <ClipboardList className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-4xl font-black mt-2 tracking-tight">
              {metricas.pedidos.entregados}/{metricas.pedidos.total}
            </p>
            <p className="text-xs font-medium opacity-80 mt-1">Pendientes de pedidos</p>
          </div>
          <div className="bg-amber-500 text-white text-xs font-bold py-2.5 px-5 flex items-center justify-between group-hover:bg-amber-600 transition-colors">
            <span>Gestionar</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        {/* CAMIONES — teal */}
        <Link
          href="/admin/flota"
          className="bg-teal-500 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between overflow-hidden group"
        >
          <div className="p-5 text-white">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-90">CAMIONES</p>
              <div className="bg-white/20 p-2 rounded-xl">
                <Truck className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-4xl font-black mt-2 tracking-tight">
              {metricas.flota.activos}/{metricas.flota.totales}
            </p>
            <p className="text-xs font-medium opacity-80 mt-1">Camiones operativos</p>
          </div>
          <div className="bg-teal-600 text-white text-xs font-bold py-2.5 px-5 flex items-center justify-between group-hover:bg-teal-700 transition-colors">
            <span>Gestionar</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        {/* ALERTAS — rojo */}
        <Link
          href="/admin/flota"
          className="bg-red-500 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between overflow-hidden group"
        >
          <div className="p-5 text-white">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-90">ALERTAS</p>
              <div className="bg-white/20 p-2 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-4xl font-black mt-2 tracking-tight">
              {metricas.alertas + metricas.productosCriticos}
            </p>
            <p className="text-xs font-medium opacity-80 mt-1">Alertas crítica</p>
          </div>
          <div className="bg-red-600 text-white text-xs font-bold py-2.5 px-5 flex items-center justify-between group-hover:bg-red-700 transition-colors">
            <span>Gestionar</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

      </div>

      {/* BLOQUE INFERIOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* PANEL IZQUIERDO: ESTADO DE PRODUCCIÓN CO2 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 text-base">
              <Activity className="h-5 w-5 text-[#283289]" />
              Estado de Producción
            </h2>
            <Link
              href="/admin/produccion"
              className="text-xs font-bold text-[#283289] hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
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
                    ? 'bg-gradient-to-t from-red-600 to-red-400'
                    : 'bg-gradient-to-t from-slate-400 to-slate-300'
                }`}
                style={{ height: `${metricas.co2.porcentaje}%` }}
              >
                <div className="absolute inset-y-0 left-0 w-3 bg-white/20" />
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-4xl font-black text-slate-800 tracking-tight">
                  {metricas.co2.kg_restantes.toFixed(2)} kg
                </h3>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mt-1">
                  Capacidad restante ({metricas.co2.porcentaje.toFixed(1)}%)
                </p>
              </div>

              {metricas.co2.porcentaje < 20 ? (
                <div className="text-sm font-bold text-white bg-red-500 p-4 rounded-xl flex items-start gap-2 shadow-sm">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <p>¡ALERTA CRÍTICA: Nivel de CO₂ Elevado Detectado en el Área de Producción. Por favor, verificar y ventilar inmediatamente!</p>
                </div>
              ) : (
                <div className="text-sm font-semibold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  El suministro actual es estable para continuar con la inyección en la línea de embotellado.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: STOCK Y MANTENIMIENTO */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800 text-base">Stock y Mantenimiento</h2>
          </div>

          <div className="p-5 space-y-4 flex-1">

            {/* Quiebres de Stock */}
            <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className={`p-2.5 rounded-full shrink-0 ${
                metricas.productosCriticos > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
              }`}>
                <Box className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-700">Quiebres de Stock</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                  {metricas.productosCriticos > 0
                    ? 'Descripción de quiebres de stock en esta sección.'
                    : 'Sin quiebres registrados.'}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-lg font-black text-sm shrink-0 ${
                metricas.productosCriticos > 0
                  ? 'bg-red-500 text-white'
                  : 'bg-green-500 text-white'
              }`}>
                {metricas.productosCriticos}
              </span>
            </div>

            {/* Flota Mantenimiento */}
            <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className={`p-2.5 rounded-full shrink-0 ${
                metricas.alertas > 0 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
              }`}>
                <Wrench className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-700">Flota Mantenimiento</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                  {metricas.alertas > 0
                    ? 'Pendientes de mantenimiento issues.'
                    : 'Flota en óptimas condiciones.'}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-lg font-black text-sm shrink-0 ${
                metricas.alertas > 0
                  ? 'bg-amber-400 text-white'
                  : 'bg-green-500 text-white'
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