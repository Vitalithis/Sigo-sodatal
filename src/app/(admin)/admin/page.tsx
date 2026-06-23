import React from 'react';
import { obtenerMetricasDashboardAction } from './actions';

export const metadata = {
  title: 'Panel de Control - SIGO Sodatal',
  description: 'Visión general del estado del negocio, logística, flota de camiones y pedidos.',
};

export default async function AdminDashboardPage() {
  const respuesta = await obtenerMetricasDashboardAction();
  
  // Valores por defecto en caso de que falle la consulta o la base de datos esté vacía
  const metricas = respuesta.success && respuesta.data ? respuesta.data : {
    pedidos: { total: 0, entregados: 0, porcentaje: 0 },
    flota: { activos: 0, totales: 0 },
    alertas: 0,
    ingresos: 0,
    productosCriticos: 0
  };

  return (
    <div className="space-y-6">
      {/* HEADER DEL DASHBOARD */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-200 gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#212529]">Panel de Control</h1>
          <p className="text-xs text-gray-500 mt-0.5">Visión general del estado del negocio y logística</p>
        </div>
        <div className="flex items-center space-x-2 self-start sm:self-center">
          <span className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200">
            <span className="mr-2 h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            Sincronizado
          </span>
        </div>
      </div>

      {/* RECUADROS DE MÉTRICAS (Estilo Small Boxes de AdminLTE 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* TARJETA INFO (Caja Estimada) */}
        <div className="bg-[#17a2b8] text-white rounded-lg shadow-sm relative overflow-hidden flex flex-col justify-between h-32 p-4 group hover:shadow-md transition-shadow">
          <div>
            <span className="text-3xl font-bold tracking-tight">
              ${metricas.ingresos.toLocaleString('es-CL')}
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80 mt-1">
              Ingresos de Hoy
            </p>
          </div>
          <div className="absolute right-3 bottom-8 text-5xl text-black/10 font-bold transition-transform group-hover:scale-110 select-none pointer-events-none">
            💸
          </div>
          <div className="text-xs bg-black/15 text-center py-1.5 -mx-4 -mb-4 rounded-b-lg text-white/95 hover:bg-black/25 cursor-pointer transition-colors font-medium">
            Ver Hojas de Ruta ➜
          </div>
        </div>

        {/* TARJETA SUCCESS (Avance de Pedidos) */}
        <div className="bg-[#28a745] text-white rounded-lg shadow-sm relative overflow-hidden flex flex-col justify-between h-32 p-4 group hover:shadow-md transition-shadow">
          <div>
            <span className="text-3xl font-bold tracking-tight">
              {metricas.pedidos.entregados} / {metricas.pedidos.total}
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80 mt-1">
              Pedidos Completados
            </p>
          </div>
          <div className="absolute right-4 bottom-8 text-5xl text-black/10 font-bold transition-transform group-hover:scale-110 select-none pointer-events-none">
            📦
          </div>
          {/* Barra de progreso rápida */}
          <div className="w-full bg-black/20 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-white h-full transition-all duration-500" 
              style={{ width: `${metricas.pedidos.porcentaje}%` }}
            ></div>
          </div>
          <div className="text-xs bg-black/15 text-center py-1.5 -mx-4 -mb-4 rounded-b-lg text-white/95 hover:bg-black/25 cursor-pointer transition-colors font-medium">
            Gestionar Pedidos ({metricas.pedidos.porcentaje}%) ➜
          </div>
        </div>

        {/* TARJETA WARNING (Flota Activa) */}
        <div className="bg-[#ffc107] text-[#212529] rounded-lg shadow-sm relative overflow-hidden flex flex-col justify-between h-32 p-4 group hover:shadow-md transition-shadow">
          <div>
            <span className="text-3xl font-bold tracking-tight">
              {metricas.flota.activos} / {metricas.flota.totales}
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider text-black/60 mt-1">
              Camiones Operativos
            </p>
          </div>
          <div className="absolute right-4 bottom-8 text-5xl text-black/5 font-bold transition-transform group-hover:scale-110 select-none pointer-events-none">
            🚚
          </div>
          <div className="text-xs bg-black/5 text-center py-1.5 -mx-4 -mb-4 rounded-b-lg text-black/70 hover:bg-black/10 cursor-pointer transition-colors font-medium">
            Ver Estado de Flota ➜
          </div>
        </div>

        {/* TARJETA DANGER (Alertas Críticas) */}
        <div className="bg-[#dc3545] text-white rounded-lg shadow-sm relative overflow-hidden flex flex-col justify-between h-32 p-4 group hover:shadow-md transition-shadow">
          <div>
            <span className="text-3xl font-bold tracking-tight">
              {metricas.alertas + metricas.productosCriticos}
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80 mt-1">
              Alertas de Atención
            </p>
          </div>
          <div className="absolute right-4 bottom-8 text-5xl text-black/10 font-bold transition-transform group-hover:scale-110 select-none pointer-events-none">
            ⚠️
          </div>
          <div className="text-xs bg-black/15 text-center py-1.5 -mx-4 -mb-4 rounded-b-lg text-white/95 hover:bg-black/25 cursor-pointer transition-colors font-medium">
            Ver Incidentes Técnicos ➜
          </div>
        </div>

      </div>

      {/* BLOQUE INFERIOR MODULAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PANEL IZQUIERDO: DETALLE OPERATIVO */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 font-bold text-gray-700 bg-gray-50/75 flex items-center justify-between">
            <span>📋 Resumen Operativo Comercial</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg text-sm text-blue-800 leading-relaxed">
              💡 <strong>Sugerencia del sistema:</strong> Monitorea constantemente los camiones que se encuentran en ruta activa. Si el avance de los pedidos completados es bajo respecto al horario actual, verifica posibles retrasos en la ruta o cargas pendientes.
            </div>
            <div className="text-sm text-gray-600">
              Usa los accesos de la barra lateral izquierda para navegar entre el inventario de botellones en fábrica, dar de alta camiones en reparación o registrar cuadraturas de las rutas cerradas.
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: ALERTAS DEL SISTEMA */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 font-bold text-gray-700 bg-gray-50/75">
            🚨 Estado del Stock y Alertas
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center text-sm border-b pb-2">
              <span className="text-gray-500">Quiebres de Stock (Fábrica):</span>
              <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                metricas.productosCriticos > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}>
                {metricas.productosCriticos} críticos
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Alertas de Mantenimiento de Camiones:</span>
              <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                metricas.alertas > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
              }`}>
                {metricas.alertas} activas
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}