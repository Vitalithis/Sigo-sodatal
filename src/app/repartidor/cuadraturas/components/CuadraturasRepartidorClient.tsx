'use client';

import React, { useState } from 'react';
import { 
  Scale, 
  Calendar, 
  Banknote, 
  Smartphone, 
  CreditCard, 
  FileCheck, 
  Truck, 
  Package, 
  Fuel, 
  CheckCircle2, 
  Clock, 
  Eye, 
  X, 
  Gauge, 
  Receipt,
  Search,
  AlertTriangle
} from 'lucide-react';

interface CuadraturaItem {
  id: string;
  fecha: string | Date;
  estado: string;
  total_efectivo: number;
  total_transferencia: number;
  total_tarjeta: number;
  total_guia_mensual: number;
  total_comision: number;
  km_inicial: number | null;
  km_final: number | null;
  monto_bencina: number | null;
  salida?: any[];
  retorno?: any[];
  botellones_vacios?: any[];
  ventas?: any[];
  gastos?: any[];
}

interface Props {
  cuadraturaHoy: CuadraturaItem | null;
  historial: CuadraturaItem[];
  nombreRepartidor: string;
  vehiculo: {
    patente: string;
    marca: string;
    modelo: string;
    kilometraje_actual: number;
  } | null;
  fechaStrHoy: string;
}

export default function CuadraturasRepartidorClient({
  cuadraturaHoy,
  historial,
  nombreRepartidor,
  vehiculo,
  fechaStrHoy,
}: Props) {
  const [tabActiva, setTabActiva] = useState<'HOY' | 'HISTORIAL'>('HOY');
  const [busqueda, setBusqueda] = useState('');
  const [cuadraturaDetalle, setCuadraturaDetalle] = useState<CuadraturaItem | null>(null);

  // Cálculos de la cuadratura de hoy
  const hoyTotal = cuadraturaHoy
    ? (cuadraturaHoy.total_efectivo || 0) +
      (cuadraturaHoy.total_transferencia || 0) +
      (cuadraturaHoy.total_tarjeta || 0) +
      (cuadraturaHoy.total_guia_mensual || 0)
    : 0;

  const hoyVacios = cuadraturaHoy?.botellones_vacios?.reduce((acc, b) => acc + (b.cantidad_total || 0), 0) || 0;
  const hoyDanados = cuadraturaHoy?.botellones_vacios?.reduce((acc, b) => acc + (b.cantidad_danados || 0), 0) || 0;

  const kmRecorridosHoy = (cuadraturaHoy?.km_final && cuadraturaHoy?.km_inicial)
    ? cuadraturaHoy.km_final - cuadraturaHoy.km_inicial
    : (cuadraturaHoy?.km_inicial && vehiculo?.kilometraje_actual)
    ? vehiculo.kilometraje_actual - cuadraturaHoy.km_inicial
    : 0;

  // Filtrado de historial
  const historialFiltrado = historial.filter((c) => {
    const fechaFormat = new Date(c.fecha).toLocaleDateString('es-CL');
    return !busqueda || fechaFormat.includes(busqueda);
  });

  return (
    <div className="space-y-6">
      
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Scale className="w-6 h-6 text-[#013299]" />
            <span>Cuadraturas y Rendición de Caja</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Control de dinero recaudado, envases retornables, kilometraje y gastos de ruta.
          </p>
        </div>
      </div>

      {/* Selector de pestañas */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center max-w-md">
        <button
          onClick={() => setTabActiva('HOY')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
            tabActiva === 'HOY'
              ? 'bg-[#013299] text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Cuadratura de Hoy</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
            tabActiva === 'HOY' ? 'bg-white text-[#013299]' : 'bg-slate-100 text-slate-600'
          }`}>
            {cuadraturaHoy ? (cuadraturaHoy.estado === 'CERRADA' ? 'Cerrada' : 'Abierta') : 'Pendiente'}
          </span>
        </button>

        <button
          onClick={() => setTabActiva('HISTORIAL')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
            tabActiva === 'HISTORIAL'
              ? 'bg-[#013299] text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Historial Pasado</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
            tabActiva === 'HISTORIAL' ? 'bg-white text-[#013299]' : 'bg-slate-100 text-slate-600'
          }`}>
            {historial.length}
          </span>
        </button>
      </div>

      {/* PESTAÑA 1: CUADRATURA DE HOY */}
      {tabActiva === 'HOY' && (
        <div className="space-y-6">
          {cuadraturaHoy ? (
            <>
              {/* Banner de Estado de Cuadratura */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      cuadraturaHoy.estado === 'CERRADA'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {cuadraturaHoy.estado === 'CERRADA' ? '✓ Cuadratura Cerrada' : '⏳ Cuadratura en Curso (Abierta)'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Jornada de Hoy</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                    ${hoyTotal.toLocaleString('es-CL')}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Total recaudado y comprometido en la ruta de hoy
                  </p>
                </div>

                {vehiculo && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-right sm:text-left flex sm:flex-col items-center sm:items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Camión</span>
                      <span className="text-sm font-black text-slate-900">{vehiculo.patente}</span>
                    </div>
                    <span className="text-xs text-slate-500 font-semibold">{vehiculo.marca} {vehiculo.modelo}</span>
                  </div>
                )}
              </div>

              {/* Desglose por Método de Pago */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Desglose de Recaudación en Ruta
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* Efectivo */}
                  <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-emerald-700 font-black text-xs uppercase tracking-wider">
                        <Banknote className="w-4 h-4" /> Efectivo en Mano
                      </div>
                      <span className="text-2xl font-black text-slate-900 mt-1 block">
                        ${(cuadraturaHoy.total_efectivo || 0).toLocaleString('es-CL')}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">A rendir físicamente</span>
                    </div>
                  </div>

                  {/* Transferencia */}
                  <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[#013299] font-black text-xs uppercase tracking-wider">
                        <Smartphone className="w-4 h-4" /> Transferencias
                      </div>
                      <span className="text-2xl font-black text-slate-900 mt-1 block">
                        ${(cuadraturaHoy.total_transferencia || 0).toLocaleString('es-CL')}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">Acreditadas en cuenta</span>
                    </div>
                  </div>

                  {/* Tarjeta */}
                  <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-purple-700 font-black text-xs uppercase tracking-wider">
                        <CreditCard className="w-4 h-4" /> Tarjetas POS
                      </div>
                      <span className="text-2xl font-black text-slate-900 mt-1 block">
                        ${(cuadraturaHoy.total_tarjeta || 0).toLocaleString('es-CL')}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">Vouchers y débito/crédito</span>
                    </div>
                  </div>

                  {/* Guía Mensual / Crédito */}
                  <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-amber-700 font-black text-xs uppercase tracking-wider">
                        <FileCheck className="w-4 h-4" /> Guías Mensuales
                      </div>
                      <span className="text-2xl font-black text-slate-900 mt-1 block">
                        ${(cuadraturaHoy.total_guia_mensual || 0).toLocaleString('es-CL')}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">Cobro crédito mensual</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 2 Columnas: Envases & Odómetro/Gastos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Control de Envases Retornables */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-[#013299]" /> Envases Retornables en Ruta
                  </h3>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Vacíos Recolectados
                      </span>
                      <span className="text-2xl font-black text-slate-900 mt-0.5 block">{hoyVacios}</span>
                      <span className="text-[11px] text-slate-500 font-medium">Unidades devueltas</span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Envases Dañados
                      </span>
                      <span className="text-2xl font-black text-rose-700 mt-0.5 block">{hoyDanados}</span>
                      <span className="text-[11px] text-slate-500 font-medium">Reportados en ruta</span>
                    </div>
                  </div>
                </div>

                {/* Control de Odómetro y Combustible */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-[#013299]" /> Kilometraje y Combustible
                  </h3>

                  <div className="space-y-2 pt-1 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500 font-medium">Km Inicial de Salida:</span>
                      <span className="font-bold text-slate-900">
                        {cuadraturaHoy.km_inicial ? `${cuadraturaHoy.km_inicial.toLocaleString('es-CL')} km` : 'No registrado'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500 font-medium">Km Final / Actual:</span>
                      <span className="font-bold text-slate-900">
                        {cuadraturaHoy.km_final 
                          ? `${cuadraturaHoy.km_final.toLocaleString('es-CL')} km`
                          : vehiculo?.kilometraje_actual 
                          ? `${vehiculo.kilometraje_actual.toLocaleString('es-CL')} km`
                          : 'En ruta'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[#013299] font-black">Distancia Recorrida Hoy:</span>
                      <span className="font-black text-[#013299] text-sm">
                        {kmRecorridosHoy > 0 ? `${kmRecorridosHoy.toLocaleString('es-CL')} km` : 'En cálculo'}
                      </span>
                    </div>

                    {cuadraturaHoy.monto_bencina && cuadraturaHoy.monto_bencina > 0 ? (
                      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Fuel className="w-3.5 h-3.5 text-amber-600" /> Carga Combustible:
                        </span>
                        <span className="font-black text-amber-700">
                          ${cuadraturaHoy.monto_bencina.toLocaleString('es-CL')}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

              </div>
            </>
          ) : (
            <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-blue-50 text-[#013299] rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-black text-slate-800">No hay cuadratura abierta para la jornada de hoy</h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                La cuadratura diaria se apertura al iniciar la carga y salida del camión en fábrica.
                Puedes consultar tus rendiciones anteriores en el historial.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setTabActiva('HISTORIAL')}
                  className="inline-flex items-center gap-2 bg-[#013299] hover:bg-blue-800 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-md transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Ver Historial de Cuadraturas</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: HISTORIAL DE CUADRATURAS */}
      {tabActiva === 'HISTORIAL' && (
        <div className="space-y-4">
          
          {/* Buscador */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por fecha (ej: 15/10/2026)..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299]"
              />
            </div>
          </div>

          {/* Listado de Cuadraturas */}
          {historialFiltrado.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
              <Scale className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No se encontraron registros de cuadratura.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {historialFiltrado.map((c) => {
                const total = (c.total_efectivo || 0) + (c.total_transferencia || 0) + (c.total_tarjeta || 0) + (c.total_guia_mensual || 0);
                const fechaFormat = new Date(c.fecha).toLocaleDateString('es-CL', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });
                const esCerrada = c.estado === 'CERRADA';

                return (
                  <div
                    key={c.id}
                    className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          esCerrada ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {esCerrada ? 'Cerrada' : 'Abierta'}
                        </span>
                        <span className="text-xs text-slate-400 font-bold capitalize">{fechaFormat}</span>
                      </div>

                      <div className="mt-3">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Recaudación Total</span>
                        <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                          ${total.toLocaleString('es-CL')}
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span className="flex items-center gap-1 font-medium">
                            <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Efectivo:
                          </span>
                          <span className="font-bold">${(c.total_efectivo || 0).toLocaleString('es-CL')}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="flex items-center gap-1 font-medium">
                            <Smartphone className="w-3.5 h-3.5 text-[#013299]" /> Transferencias:
                          </span>
                          <span className="font-bold">${(c.total_transferencia || 0).toLocaleString('es-CL')}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="flex items-center gap-1 font-medium">
                            <FileCheck className="w-3.5 h-3.5 text-amber-600" /> Guías Mensuales:
                          </span>
                          <span className="font-bold">${(c.total_guia_mensual || 0).toLocaleString('es-CL')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-3 border-t border-slate-100">
                      <button
                        onClick={() => setCuadraturaDetalle(c)}
                        className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-[#013299] hover:text-white text-slate-800 text-xs font-bold py-2.5 rounded-xl transition-all"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Ver Desglose Completo</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* Modal Detalle de Cuadratura */}
      {cuadraturaDetalle && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-4 sm:p-5 bg-[#013299] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider">
                  Desglose de Rendición
                </span>
                <h3 className="text-lg font-black mt-0.5">
                  Cuadratura del {new Date(cuadraturaDetalle.fecha).toLocaleDateString('es-CL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </h3>
              </div>
              <button
                onClick={() => setCuadraturaDetalle(null)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold">Estado:</span>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    cuadraturaDetalle.estado === 'CERRADA' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {cuadraturaDetalle.estado}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold">Total Efectivo:</span>
                  <span className="font-black text-slate-900">${(cuadraturaDetalle.total_efectivo || 0).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold">Total Transferencias:</span>
                  <span className="font-black text-slate-900">${(cuadraturaDetalle.total_transferencia || 0).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold">Total Tarjeta:</span>
                  <span className="font-black text-slate-900">${(cuadraturaDetalle.total_tarjeta || 0).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold">Total Guías Mensuales:</span>
                  <span className="font-black text-slate-900">${(cuadraturaDetalle.total_guia_mensual || 0).toLocaleString('es-CL')}</span>
                </div>
              </div>

              <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center">
                <span className="font-bold text-slate-400">Total Recaudado:</span>
                <span className="text-xl font-black text-amber-400">
                  ${(
                    (cuadraturaDetalle.total_efectivo || 0) +
                    (cuadraturaDetalle.total_transferencia || 0) +
                    (cuadraturaDetalle.total_tarjeta || 0) +
                    (cuadraturaDetalle.total_guia_mensual || 0)
                  ).toLocaleString('es-CL')}
                </span>
              </div>

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setCuadraturaDetalle(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
