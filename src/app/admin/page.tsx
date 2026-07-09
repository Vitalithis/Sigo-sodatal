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
  Wrench
} from 'lucide-react';

export const metadata = {
  title: 'Panel de Control - SIGO Sodatal',
  description: 'Visión general del estado del negocio, logística, flota de camiones y pedidos.',
};

export default async function AdminDashboardPage() {
  const respuesta = await obtenerMetricasDashboardAction();
  
  // Mantenemos tu lógica de fallback para evitar colapsos, 
  // pero usaremos el estado success para informar al usuario.
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
      
      {/* Alerta de conexión fallida (Solución a errores silenciosos) */}
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

      {/* HEADER DEL DASHBOARD */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#283289] tracking-tight">Panel de Control</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Visión general del estado del negocio y logística</p>
        </div>
        <div className="flex items-center self-start sm:self-center">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm border ${
            respuesta.success ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'
          }`}>
            {respuesta.success ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-green-600 animate-pulse" />
                Sistema Sincronizado
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-gray-500" />
                Sin Conexión
              </>
            )}
          </span>
        </div>
      </div>

      {/* RECUADROS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* TARJETA INGRESOS (Cuadratura) */}
        <Link href="/admin/cuadratura" className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group overflow-hidden flex flex-col justify-between h-36">
          <div className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ingresos de Hoy</p>
                <span className="text-3xl font-black tracking-tight text-slate-800 block mt-1">
                  ${metricas.ingresos.toLocaleString('es-CL')}
                </span>
              </div>
              <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="bg-emerald-600 text-white text-xs py-2 px-5 font-bold flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity">
            <span>Ver Cuadraturas del Día</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        {/* TARJETA PEDIDOS */}
        <Link href="/admin/rutas" className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group overflow-hidden flex flex-col justify-between h-36">
          <div className="p-5">
            <div className="flex justify-between items-start">
              <div className="w-full">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pedidos Completados</p>
                <span className="text-3xl font-black tracking-tight text-slate-800 block mt-1">
                  {metricas.pedidos.entregados} <span className="text-lg text-slate-400 font-semibold">/ {metricas.pedidos.total}</span>
                </span>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full transition-all duration-1000 ease-out" 
                    style={{ width: `${metricas.pedidos.porcentaje}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-blue-600 text-white text-xs py-2 px-5 font-bold flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity">
            <span>Gestionar Pedidos ({metricas.pedidos.porcentaje}%)</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        {/* TARJETA FLOTA */}
        <Link href="/admin/vehiculos" className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group overflow-hidden flex flex-col justify-between h-36">
          <div className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Camiones Operativos</p>
                <span className="text-3xl font-black tracking-tight text-slate-800 block mt-1">
                  {metricas.flota.activos} <span className="text-lg text-slate-400 font-semibold">/ {metricas.flota.totales}</span>
                </span>
              </div>
              <div className="bg-amber-50 p-2.5 rounded-xl text-amber-600 group-hover:scale-110 transition-transform">
                <Truck className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="bg-amber-500 text-white text-xs py-2 px-5 font-bold flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity">
            <span>Ver Estado de Flota</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        {/* TARJETA ALERTAS */}
        <Link href="/admin/vehiculos" className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group overflow-hidden flex flex-col justify-between h-36">
          <div className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Alertas de Atención</p>
                <span className="text-3xl font-black tracking-tight text-slate-800 block mt-1">
                  {metricas.alertas + metricas.productosCriticos}
                </span>
              </div>
              <div className="bg-rose-50 p-2.5 rounded-xl text-rose-600 group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="bg-rose-600 text-white text-xs py-2 px-5 font-bold flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity">
            <span>Ver Incidentes Técnicos</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

      </div>

      {/* BLOQUE INFERIOR MODULAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PANEL IZQUIERDO: ESTADO DE PRODUCCIÓN DE SODAS (CO2) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-extrabold text-slate-800 flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#283289]" />
              Estado de Producción (Tubo CO₂ Activo)
            </h2>
            <Link href="/admin/produccion" className="text-xs font-bold text-[#283289] hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
              Ver Módulo
            </Link>
          </div>
          
          <div className="p-6 flex items-center gap-8 flex-1">
            {/* Visualizador de Cilindro Mejorado */}
            <div className="relative w-20 h-40 border-4 border-slate-300 rounded-t-3xl rounded-b-lg overflow-hidden bg-slate-100 flex flex-col justify-end shadow-inner">
              {/* Válvula simulada superior */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-3 bg-slate-400 rounded-b-sm border-b-2 border-slate-500 z-10" />
              
              {/* Líquido/Gas CO2 */}
              <div 
                className={`w-full transition-all duration-1000 ease-out relative ${metricas.co2.porcentaje < 20 ? 'bg-gradient-to-t from-red-600 to-red-400' : 'bg-gradient-to-t from-slate-400 to-slate-300'}`}
                style={{ height: `${metricas.co2.porcentaje}%` }}
              >
                {/* Reflejo estilo cristal */}
                <div className="absolute inset-y-0 left-0 w-3 bg-white/20" />
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  {metricas.co2.kg_restantes.toFixed(2)} kg
                </h3>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mt-1">
                  Capacidad restante ({metricas.co2.porcentaje.toFixed(1)}%)
                </p>
              </div>
              
              {metricas.co2.porcentaje < 20 ? (
                <div className="text-sm font-bold text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 flex items-start gap-2 shadow-sm">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <p>Nivel crítico de CO₂. Se recomienda programar recambio del tubo para no detener la producción de sodas.</p>
                </div>
              ) : (
                <div className="text-sm font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  El suministro actual es estable para continuar con la inyección en la línea de embotellado.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: ALERTAS DEL SISTEMA */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-extrabold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Stock y Mantenimiento
            </h2>
          </div>
          
          <div className="p-6 space-y-5 flex-1">
            
            <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50 transition-colors hover:bg-slate-100">
              <div className={`p-3 rounded-full ${metricas.productosCriticos > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                <Box className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-700">Quiebres de Stock</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Fábrica y bodega central</p>
              </div>
              <span className={`px-3 py-1 rounded-lg font-black text-sm ${
                metricas.productosCriticos > 0 ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
              }`}>
                {metricas.productosCriticos}
              </span>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50 transition-colors hover:bg-slate-100">
              <div className={`p-3 rounded-full ${metricas.alertas > 0 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                <Wrench className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-700">Flota Vehicular</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Mantenimientos preventivos</p>
              </div>
              <span className={`px-3 py-1 rounded-lg font-black text-sm ${
                metricas.alertas > 0 ? 'bg-amber-200 text-amber-800' : 'bg-green-200 text-green-800'
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