'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  Unlock, 
  AlertCircle, 
  X, 
  Check, 
  Search, 
  Eye, 
  ClipboardList, 
  DollarSign, 
  Truck, 
  Calendar,
  Lock,
  Fuel,
  Package
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  registrarSalidaAction,
  registrarCierreCuadraturaAction,
  reabrirCuadraturaAction,
} from '../actions';

interface Repartidor {
  id: string;
  nombre: string;
  apellido: string | null;
  recibe_comision: boolean;
}

interface Producto {
  id: string;
  nombre: string;
  precio_venta_nueva: number;
  precio_recarga: number | null;
}

interface CuadraturaAppProps {
  repartidores: Repartidor[];
  productos: Producto[];
  historial: any[];
}

type PanelModal = 'salida' | 'cierre' | 'reabrir' | 'detalle' | null;

export default function CuadraturaApp({ repartidores, productos, historial }: CuadraturaAppProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [panel, setPanel] = useState<PanelModal>(null);
  
  const [cuadraturaSeleccionada, setCuadraturaSeleccionada] = useState<any>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  const maxDate = today.toISOString().split('T')[0];

  // ── Salida
  const [salidaRep, setSalidaRep] = useState('');
  const [salidaFecha, setSalidaFecha] = useState(maxDate);
  const [salidaItems, setSalidaItems] = useState<Record<string, string | number>>({});
  const [salidaKmInicial, setSalidaKmInicial] = useState<string | number>('');
  
  // ── Combustible
  const [incluirCombustible, setIncluirCombustible] = useState(false);
  const [combTipo, setCombTipo] = useState('DIESEL');
  const [combMonto, setCombMonto] = useState<string | number>('');
  const [combNumFactura, setCombNumFactura] = useState('');
  const [combRutaFactura, setCombRutaFactura] = useState('');

  // ── Cierre
  const [cierreRetorno, setCierreRetorno] = useState<Record<string, string | number>>({});
  const [cierreVaciosTot, setCierreVaciosTot] = useState<string | number>('');
  const [cierreVaciosDan, setCierreVaciosDan] = useState<string | number>('');
  const [cierreKmFinal, setCierreKmFinal] = useState<string | number>('');

  // ── Reapertura
  const [reabrirMotivo, setReobrirMotivo] = useState('');

  const showNotif = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // ¿Es la primera salida del día para este repartidor?
  const esPrimeraSalida = !historial.some(c => 
    c.usuario_id === salidaRep && 
    new Date(c.fecha).toISOString().split('T')[0] === salidaFecha &&
    c.estado === 'ABIERTA'
  );

  const handleSalida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salidaRep) return showNotif('error', 'Selecciona un repartidor.');
    
    if (esPrimeraSalida && (!salidaKmInicial || Number(salidaKmInicial) <= 0)) {
      return showNotif('error', 'El kilometraje inicial es obligatorio al iniciar el día.');
    }

    let combustiblePayload = null;
    if (incluirCombustible) {
      if (!combMonto || Number(combMonto) <= 0) {
        return showNotif('error', 'Debes ingresar el monto del combustible.');
      }
      combustiblePayload = {
        tipo_combustible: combTipo,
        monto: Number(combMonto),
        numero_factura: combNumFactura,
        ruta_factura: combRutaFactura
      };
    }

    const items = Object.entries(salidaItems)
      .map(([producto_id, val]) => ({ producto_id, cantidad: Number(val) || 0 }))
      .filter(item => item.cantidad > 0);
      
    if (items.length === 0) return showNotif('error', 'Debes cargar al menos un producto.');

    startTransition(async () => {
      const payload = { 
        usuario_id: salidaRep, 
        fecha: salidaFecha, 
        items,
        km_inicial: esPrimeraSalida ? Number(salidaKmInicial) : undefined,
        combustible: combustiblePayload
      };

      const res = await registrarSalidaAction(payload);
      if (res.success) {
        showNotif('success', `Carga registrada exitosamente.`);
        setPanel(null);
        setSalidaItems({});
        setSalidaKmInicial('');
        setIncluirCombustible(false);
        router.refresh();
      } else {
        showNotif('error', res.message ?? 'Error al registrar salida.');
      }
    });
  };

  const handleCierre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuadraturaSeleccionada) return showNotif('error', 'Selecciona la ruta a cerrar.');
    if (!cierreKmFinal || Number(cierreKmFinal) <= 0) return showNotif('error', 'El kilometraje final es obligatorio.');

    const retornoItems = Object.entries(cierreRetorno)
      .map(([producto_id, val]) => ({ producto_id, cantidad: Number(val) || 0 }))
      .filter(item => item.cantidad > 0);

    startTransition(async () => {
      const res = await registrarCierreCuadraturaAction({
        cuadratura_id: cuadraturaSeleccionada.id,
        ventas: [],
        retorno: retornoItems,
        botellones_vacios: { 
          cantidad_total: Number(cierreVaciosTot) || 0, 
          cantidad_danados: Number(cierreVaciosDan) || 0 
        },
        gastos: [],
        km_final: Number(cierreKmFinal)
      });

      if (res.success) {
        showNotif('success', 'Caja cerrada correctamente.');
        setPanel(null);
        setCierreRetorno({});
        setCierreVaciosTot('');
        setCierreVaciosDan('');
        setCierreKmFinal('');
        setCuadraturaSeleccionada(null);
        router.refresh();
      } else {
        showNotif('error', res.message ?? 'Error al cerrar cuadratura.');
      }
    });
  };

  const handleReabrir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuadraturaSeleccionada || !reabrirMotivo.trim()) return showNotif('error', 'Completa todos los campos obligatorios.');

    startTransition(async () => {
      const res = await reabrirCuadraturaAction(cuadraturaSeleccionada.id, reabrirMotivo);
      if (res.success) {
        showNotif('success', 'Ruta reabierta para edición.');
        setPanel(null);
        setCuadraturaSeleccionada(null);
        setReobrirMotivo('');
        router.refresh();
      } else {
        showNotif('error', res.message ?? 'Error al reabrir.');
      }
    });
  };

  const cuadraturasFiltradas = useMemo(() => {
    return historial.filter((c: any) => {
      const term = busqueda.toLowerCase();
      const fecha = new Date(c.fecha).toLocaleDateString('es-CL');
      return (
        c.usuario?.nombre.toLowerCase().includes(term) ||
        c.usuario?.apellido?.toLowerCase().includes(term) ||
        fecha.includes(term)
      );
    });
  }, [historial, busqueda]);

  const abiertasCount = useMemo(() => historial.filter(c => c.estado === 'ABIERTA').length, [historial]);
  const cerradasCount = useMemo(() => historial.filter(c => c.estado === 'CERRADA').length, [historial]);
  const totalEfectivo = useMemo(() => {
    return historial.reduce((acc, c) => acc + Number(c.total_efectivo || 0), 0);
  }, [historial]);

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border animate-in slide-in-from-top-4 duration-300 ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {notification.type === 'success' ? <Check className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-rose-600" />}
          <p className="text-sm font-semibold">{notification.message}</p>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Metrics Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rutas Activas</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{abiertasCount}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-[#013299]">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cajas Cerradas</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{cerradasCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Efectivo</p>
            <p className="text-2xl font-black text-slate-900 mt-1">${totalEfectivo.toLocaleString('es-CL')}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Cuadraturas</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{historial.length}</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar & Search */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por fecha o nombre del repartidor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#013299] focus:ring-2 focus:ring-[#013299]/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setPanel('salida'); setCuadraturaSeleccionada(null); }}
            className="bg-[#013299] hover:bg-blue-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-[#013299]/20 transition-all flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Registrar Salida
          </button>

          <button
            onClick={() => { setCuadraturaSeleccionada(null); setPanel('cierre'); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" /> Cierre Diario
          </button>

          <button
            onClick={() => { setCuadraturaSeleccionada(null); setPanel('reabrir'); }}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
          >
            <Unlock className="h-4 w-4" /> Reabrir
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Repartidor</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-center">Km Recorrido</th>
                <th className="py-3.5 px-4 text-right">Efectivo Recaudado</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {cuadraturasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <ClipboardList className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm">No hay cuadraturas registradas</p>
                    <p className="text-xs text-slate-400 mt-0.5">Las cuadraturas generadas aparecerán aquí</p>
                  </td>
                </tr>
              ) : (
                cuadraturasFiltradas.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {new Date(c.fecha).toLocaleDateString('es-CL')}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {c.usuario?.nombre} {c.usuario?.apellido || ''}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        c.estado === 'ABIERTA' 
                          ? 'bg-blue-50 text-[#013299] border-blue-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {c.estado}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-600">
                      {c.km_inicial && c.km_final ? `${c.km_final - c.km_inicial} km` : 'En ruta'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 text-sm">
                      ${Number(c.total_efectivo || 0).toLocaleString('es-CL')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => { setCuadraturaSeleccionada(c); setPanel('detalle'); }}
                          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-lg transition-colors text-[11px] inline-flex items-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> Detalle
                        </button>

                        {c.estado === 'ABIERTA' && (
                          <button 
                            onClick={() => { setCuadraturaSeleccionada(c); setPanel('cierre'); }}
                            className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg transition-colors text-[11px]"
                          >
                            Cerrar Caja
                          </button>
                        )}

                        {c.estado === 'CERRADA' && (
                          <button 
                            onClick={() => { setCuadraturaSeleccionada(c); setPanel('reabrir'); }}
                            className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 font-bold rounded-lg transition-colors text-[11px]"
                          >
                            Reabrir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {panel && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
            
            {/* Header Modal */}
            <div className={`px-6 py-4 flex justify-between items-center text-white ${
              panel === 'salida' ? 'bg-[#013299]' : panel === 'cierre' ? 'bg-emerald-600' : panel === 'reabrir' ? 'bg-amber-600' : 'bg-slate-900'
            }`}>
              <h2 className="text-base font-bold flex items-center gap-2">
                {panel === 'salida' && '📤 Registrar Carga / Salida de Camión'}
                {panel === 'cierre' && '✅ Registrar Retorno / Cierre de Cuadratura'}
                {panel === 'reabrir' && '🔓 Reabrir Cuadratura'}
                {panel === 'detalle' && '📦 Detalle de Carga y Gastos'}
              </h2>
              <button 
                onClick={() => { setPanel(null); setCuadraturaSeleccionada(null); }} 
                className="p-1 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MODAL DETALLES */}
            {panel === 'detalle' && cuadraturaSeleccionada && (
              <div className="p-6 overflow-y-auto space-y-5">
                <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-xs text-[#013299] font-bold uppercase tracking-wider">Repartidor</p>
                    <p className="text-lg font-bold text-slate-900">{cuadraturaSeleccionada.usuario?.nombre} {cuadraturaSeleccionada.usuario?.apellido || ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#013299] font-bold uppercase tracking-wider">Fecha de Ruta</p>
                    <p className="text-lg font-bold text-slate-900">{new Date(cuadraturaSeleccionada.fecha).toLocaleDateString('es-CL')}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">
                    Inventario Cargado al Camión (Acumulado)
                  </h3>
                  {cuadraturaSeleccionada.salida && cuadraturaSeleccionada.salida.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {cuadraturaSeleccionada.salida.map((s: any) => (
                        <div key={s.id} className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-800">{s.producto?.nombre}</span>
                          <span className="text-base font-black text-[#013299] bg-blue-100/60 px-2 py-0.5 rounded-lg">{s.cantidad}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No hay productos registrados en la carga de este camión.</p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button 
                    type="button" 
                    onClick={() => { setPanel(null); setCuadraturaSeleccionada(null); }} 
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cerrar Detalle
                  </button>
                </div>
              </div>
            )}

            {/* Formulario Salida */}
            {panel === 'salida' && (
              <form onSubmit={handleSalida} className="p-6 overflow-y-auto space-y-5">
                <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-xl text-xs text-blue-900 font-medium">
                  💡 Si el repartidor ya tiene una ruta abierta en esta fecha, las nuevas cantidades se <strong>sumarán</strong> a su carga acumulada del día.
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Repartidor *</label>
                    <select 
                      value={salidaRep} 
                      onChange={e => setSalidaRep(e.target.value)} 
                      required 
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#013299]"
                    >
                      <option value="">— Seleccionar repartidor —</option>
                      {repartidores.map(r => <option key={r.id} value={r.id}>{r.nombre} {r.apellido || ''}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fecha *</label>
                    <input 
                      type="date" 
                      value={salidaFecha} 
                      max={maxDate} 
                      onChange={e => setSalidaFecha(e.target.value)} 
                      required 
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#013299]" 
                    />
                  </div>
                </div>

                {/* Kilometraje y Combustible */}
                <div className="space-y-4 border-t border-slate-100 pt-4">
                  {salidaRep && esPrimeraSalida && (
                    <div className="flex flex-col gap-1.5 bg-blue-50/60 border border-blue-200 p-4 rounded-xl">
                      <label className="text-xs font-bold text-[#013299] uppercase tracking-wider">Kilometraje Inicial del Vehículo *</label>
                      <input 
                        type="number" 
                        min="0"
                        required 
                        value={salidaKmInicial} 
                        onChange={e => setSalidaKmInicial(e.target.value)} 
                        className="w-full px-3.5 py-2.5 bg-white border border-blue-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#013299]/20 outline-none" 
                        placeholder="Ej: 145000"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200/80 hover:bg-slate-100/70 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={incluirCombustible} 
                        onChange={e => setIncluirCombustible(e.target.checked)} 
                        className="w-4 h-4 text-[#013299] rounded" 
                      />
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">⛽ Registrar Carga de Combustible</span>
                    </label>
                    
                    {incluirCombustible && (
                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 mt-1">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo *</label>
                          <select value={combTipo} onChange={e => setCombTipo(e.target.value)} className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold">
                            <option value="DIESEL">Diesel</option>
                            <option value="BENCINA">Bencina</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Monto ($) *</label>
                          <input type="number" required min="1" value={combMonto} onChange={e => setCombMonto(e.target.value)} className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold" placeholder="Ej: 25000" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Nº Factura / Boleta</label>
                          <input type="text" value={combNumFactura} onChange={e => setCombNumFactura(e.target.value)} className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs" placeholder="Ej: 88512" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">RUT Empresa / Enlace Factura</label>
                          <input type="text" value={combRutaFactura} onChange={e => setCombRutaFactura(e.target.value)} className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs" placeholder="Ej: 76.123.456-7" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Cantidades a Cargar al Camión</label>
                  {productos.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-medium">
                      ⚠️ No hay productos activos en el catálogo.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {productos.map(p => (
                        <div key={p.id} className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex flex-col gap-1.5">
                          <span className="text-xs font-semibold text-slate-800 truncate" title={p.nombre}>{p.nombre}</span>
                          <input 
                            type="number" 
                            min="0" 
                            placeholder="0" 
                            value={salidaItems[p.id] === undefined ? '' : salidaItems[p.id]} 
                            onChange={e => {
                              const val = e.target.value;
                              setSalidaItems(prev => ({ 
                                ...prev, 
                                [p.id]: val === '' ? 0 : Number(val) 
                              }));
                            }} 
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center font-mono font-bold focus:border-[#013299] outline-none" 
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setPanel(null)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors">Cancelar</button>
                  <button type="submit" disabled={isPending} className="bg-[#013299] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all">{isPending ? 'Procesando...' : 'Confirmar Carga'}</button>
                </div>
              </form>
            )}

            {/* Formulario Cierre */}
            {panel === 'cierre' && (
              <form onSubmit={handleCierre} className="p-6 overflow-y-auto space-y-5">
                <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl text-xs text-emerald-900 font-medium">
                  💡 Las ventas y recaudación se procesan automáticamente desde la App. Aquí registras el retorno físico a la planta.
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ruta / Repartidor a Cerrar *</label>
                  {cuadraturaSeleccionada ? (
                    <div className="border border-emerald-300 bg-emerald-50/70 p-3.5 rounded-xl font-bold text-emerald-900 flex justify-between items-center text-xs">
                      <span>{new Date(cuadraturaSeleccionada.fecha).toLocaleDateString('es-CL')} - {cuadraturaSeleccionada.usuario?.nombre} {cuadraturaSeleccionada.usuario?.apellido || ''}</span>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                  ) : (
                    <select required value={cuadraturaSeleccionada?.id || ''} onChange={e => setCuadraturaSeleccionada(historial.find(c => c.id === e.target.value))} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none">
                      <option value="">— Selecciona la ruta pendiente —</option>
                      {historial.filter(c => c.estado === 'ABIERTA').map(c => (
                        <option key={c.id} value={c.id}>
                          {new Date(c.fecha).toLocaleDateString('es-CL')} - {c.usuario?.nombre} {c.usuario?.apellido || ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 border-t border-b border-slate-100 py-4">
                  <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Kilometraje Final del Vehículo *</label>
                  <input 
                    type="number" 
                    min="0"
                    required 
                    value={cierreKmFinal} 
                    onChange={e => setCierreKmFinal(e.target.value)} 
                    className="w-full px-3.5 py-2.5 bg-emerald-50/60 border border-emerald-300 rounded-xl text-sm font-mono font-bold text-emerald-900 focus:outline-none" 
                    placeholder="Ej: 145120"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Retorno de Productos (Vuelven llenos)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {productos.map(p => (
                      <div key={p.id} className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-slate-800 truncate">{p.nombre}</span>
                        <input 
                          type="number" 
                          min="0" 
                          placeholder="0" 
                          value={cierreRetorno[p.id] === undefined ? '' : cierreRetorno[p.id]} 
                          onChange={e => {
                            const val = e.target.value;
                            setCierreRetorno(prev => ({ 
                              ...prev, 
                              [p.id]: val === '' ? 0 : Number(val) 
                            }));
                          }} 
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center font-mono font-bold text-emerald-700 outline-none" 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vacíos Entrantes</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={cierreVaciosTot === 0 && cierreVaciosTot.toString() !== '0' ? '' : cierreVaciosTot} 
                      onChange={e => setCierreVaciosTot(e.target.value === '' ? 0 : Number(e.target.value))} 
                      className="w-full px-3 py-2 bg-blue-50/70 border border-blue-200 rounded-xl text-xs font-mono text-center font-bold text-blue-900 outline-none" 
                      placeholder="0" 
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vacíos Dañados</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={cierreVaciosDan === 0 && cierreVaciosDan.toString() !== '0' ? '' : cierreVaciosDan} 
                      onChange={e => setCierreVaciosDan(e.target.value === '' ? 0 : Number(e.target.value))} 
                      className="w-full px-3 py-2 bg-rose-50/70 border border-rose-200 rounded-xl text-xs font-mono text-center font-bold text-rose-900 outline-none" 
                      placeholder="0" 
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => { setPanel(null); setCuadraturaSeleccionada(null); }} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors">Cancelar</button>
                  <button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all">{isPending ? 'Procesando...' : 'Cerrar Cuadratura Definitiva'}</button>
                </div>
              </form>
            )}

            {/* Formulario Reabrir */}
            {panel === 'reabrir' && (
              <form onSubmit={handleReabrir} className="p-6 overflow-y-auto space-y-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ruta / Repartidor a Reabrir *</label>
                  {cuadraturaSeleccionada ? (
                    <div className="border border-amber-300 bg-amber-50/70 p-3.5 rounded-xl font-bold text-amber-900 flex justify-between items-center text-xs">
                      <span>{new Date(cuadraturaSeleccionada.fecha).toLocaleDateString('es-CL')} - {cuadraturaSeleccionada.usuario?.nombre} {cuadraturaSeleccionada.usuario?.apellido || ''}</span>
                      <Unlock className="h-5 w-5 text-amber-600" />
                    </div>
                  ) : (
                    <select required value={cuadraturaSeleccionada?.id || ''} onChange={e => setCuadraturaSeleccionada(historial.find(c => c.id === e.target.value))} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none">
                      <option value="">— Selecciona la ruta a reabrir —</option>
                      {historial.filter(c => c.estado === 'CERRADA').map(c => (
                        <option key={c.id} value={c.id}>
                          {new Date(c.fecha).toLocaleDateString('es-CL')} - {c.usuario?.nombre} {c.usuario?.apellido || ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Motivo (Obligatorio) *</label>
                  <textarea 
                    required 
                    rows={3} 
                    placeholder="Ej: Faltó registrar pago de bencina, error en conteo..." 
                    value={reabrirMotivo} 
                    onChange={e => setReobrirMotivo(e.target.value)} 
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-amber-500 transition-all resize-none" 
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => { setPanel(null); setCuadraturaSeleccionada(null); }} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors">Cancelar</button>
                  <button type="submit" disabled={isPending} className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all">{isPending ? 'Procesando...' : 'Reabrir para Edición'}</button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
