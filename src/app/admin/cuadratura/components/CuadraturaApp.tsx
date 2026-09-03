'use client';

import React, { useState, useTransition } from 'react';
import { 
  Plus, CheckCircle, Unlock, AlertCircle, X, Check, Search, Eye 
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

  const cuadraturasFiltradas = historial.filter((c: any) => {
    const term = busqueda.toLowerCase();
    const fecha = new Date(c.fecha).toLocaleDateString();
    return (
      c.usuario?.nombre.toLowerCase().includes(term) ||
      c.usuario?.apellido?.toLowerCase().includes(term) ||
      fecha.includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      
      {notification && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border animate-in slide-in-from-top-4 ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {notification.type === 'success' ? <Check className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-rose-600" />}
          <p className="text-sm font-semibold">{notification.message}</p>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Control de Cuadraturas</h1>
          <p className="text-sm text-slate-500">Gestión de carga de camiones, kilometraje, retorno y cierre de caja.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setPanel('salida'); setCuadraturaSeleccionada(null); }} className="bg-[#283289] hover:bg-[#1e266b] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> Registrar Salida
          </button>
          <button onClick={() => { setCuadraturaSeleccionada(null); setPanel('cierre'); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors">
            <CheckCircle className="h-4 w-4" /> Cierre Diario
          </button>
          <button onClick={() => { setCuadraturaSeleccionada(null); setPanel('reabrir'); }} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors">
            <Unlock className="h-4 w-4" /> Reabrir
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por fecha (ej: 11/8/2026) o nombre del repartidor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#283289]"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-slate-600 text-sm">
            <thead className="bg-slate-100 text-slate-700 uppercase text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="p-4">Fecha</th>
                <th className="p-4">Repartidor</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-center">Km Recorrido</th>
                <th className="p-4 text-right">Efectivo Recaudado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cuadraturasFiltradas.length === 0 ? (
                <tr><td colSpan={6} className="text-center p-8 text-slate-400">No hay rutas que coincidan con la búsqueda.</td></tr>
              ) : (
                cuadraturasFiltradas.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-900">{new Date(c.fecha).toLocaleDateString()}</td>
                    <td className="p-4 font-bold">{c.usuario?.nombre} {c.usuario?.apellido}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        c.estado === 'ABIERTA' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {c.estado}
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono text-slate-500">
                      {c.km_inicial && c.km_final ? `${c.km_final - c.km_inicial} km` : 'En ruta'}
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900">
                      ${Number(c.total_efectivo || 0).toLocaleString('es-CL')}
                    </td>
                    <td className="p-4 text-center space-x-2">
                      <button 
                        onClick={() => { setCuadraturaSeleccionada(c); setPanel('detalle'); }}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm inline-flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver Detalle
                      </button>

                      {c.estado === 'ABIERTA' && (
                        <button 
                          onClick={() => { setCuadraturaSeleccionada(c); setPanel('cierre'); }}
                          className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                        >
                          Cerrar Caja
                        </button>
                      )}
                      {c.estado === 'CERRADA' && (
                        <button 
                          onClick={() => { setCuadraturaSeleccionada(c); setPanel('reabrir'); }}
                          className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                        >
                          🔓 Reabrir
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {panel && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
            
            <div className={`p-5 border-b flex justify-between items-center text-white ${
              panel === 'salida' ? 'bg-[#283289]' : panel === 'cierre' ? 'bg-emerald-600' : panel === 'reabrir' ? 'bg-amber-600' : 'bg-slate-800'
            }`}>
              <h2 className="text-lg font-bold">
                {panel === 'salida' && '📤 Registrar Carga / Salida de Camión'}
                {panel === 'cierre' && '✅ Registrar Retorno / Cierre de Cuadratura'}
                {panel === 'reabrir' && '🔓 Reabrir Cuadratura'}
                {panel === 'detalle' && '📦 Detalle de Carga y Gastos'}
              </h2>
              <button onClick={() => { setPanel(null); setCuadraturaSeleccionada(null); }} className="text-white/80 hover:text-white text-2xl">&times;</button>
            </div>

            {/* MODAL DETALLES */}
            {panel === 'detalle' && cuadraturaSeleccionada && (
              <div className="p-6 overflow-y-auto space-y-5">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-xs text-blue-600 font-bold uppercase">Repartidor</p>
                    <p className="text-lg font-bold text-slate-800">{cuadraturaSeleccionada.usuario?.nombre} {cuadraturaSeleccionada.usuario?.apellido}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-blue-600 font-bold uppercase">Fecha de Ruta</p>
                    <p className="text-lg font-bold text-slate-800">{new Date(cuadraturaSeleccionada.fecha).toLocaleDateString()}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 mb-3">Inventario Cargado al Camión (Acumulado)</h3>
                  {cuadraturaSeleccionada.salida && cuadraturaSeleccionada.salida.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {cuadraturaSeleccionada.salida.map((s: any) => (
                        <div key={s.id} className="bg-white border p-3 rounded-lg flex justify-between items-center shadow-sm">
                          <span className="text-xs font-semibold text-slate-800">{s.producto?.nombre}</span>
                          <span className="text-lg font-black text-[#283289] bg-blue-50 px-2 py-0.5 rounded">{s.cantidad}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No hay productos registrados en la carga de este camión.</p>
                  )}
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <button type="button" onClick={() => { setPanel(null); setCuadraturaSeleccionada(null); }} className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-sm font-bold">Cerrar Detalle</button>
                </div>
              </div>
            )}

            {/* Formulario Salida */}
            {panel === 'salida' && (
              <form onSubmit={handleSalida} className="p-6 overflow-y-auto space-y-5">
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs text-blue-800 font-medium">
                  💡 Si el repartidor ya tiene una ruta abierta en esta fecha, las nuevas cantidades se <strong>sumarán</strong> a su carga acumulada del día.
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700 uppercase">Repartidor *</label>
                    <select value={salidaRep} onChange={e => setSalidaRep(e.target.value)} required className="border border-slate-300 p-2.5 rounded-lg text-sm bg-white outline-none font-semibold text-slate-800">
                      <option value="">— Selecciona —</option>
                      {repartidores.map(r => <option key={r.id} value={r.id}>{r.nombre} {r.apellido}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700 uppercase">Fecha *</label>
                    <input 
                      type="date" 
                      value={salidaFecha} 
                      max={maxDate} 
                      onChange={e => setSalidaFecha(e.target.value)} 
                      required 
                      className="border border-slate-300 p-2.5 rounded-lg text-sm bg-white outline-none font-semibold text-slate-800" 
                    />
                  </div>
                </div>

                {/* KILOMETRAJE Y COMBUSTIBLE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-4 mt-4">
                  
                  {/* Kilometraje solo si es la primera salida del día */}
                  {salidaRep && esPrimeraSalida && (
                    <div className="flex flex-col gap-1 md:col-span-2 bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
                      <label className="text-xs font-bold text-indigo-900 uppercase">Kilometraje Inicial del Vehículo *</label>
                      <input 
                        type="number" 
                        min="0"
                        required 
                        value={salidaKmInicial} 
                        onChange={e => setSalidaKmInicial(e.target.value)} 
                        className="border border-indigo-300 p-2.5 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-600 outline-none w-full" 
                        placeholder="Ej: 145000"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-100 p-3 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors">
                      <input type="checkbox" checked={incluirCombustible} onChange={e => setIncluirCombustible(e.target.checked)} className="w-4 h-4 text-[#283289]" />
                      <span className="text-xs font-bold text-slate-700 uppercase">⛽ Registrar Carga de Combustible a la Salida</span>
                    </label>
                    
                    {incluirCombustible && (
                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mt-1">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-700 uppercase">Tipo *</label>
                          <select value={combTipo} onChange={e => setCombTipo(e.target.value)} className="border border-slate-300 p-2 rounded-lg text-sm outline-none font-semibold">
                            <option value="DIESEL">Diesel</option>
                            <option value="BENCINA">Bencina</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-700 uppercase">Monto ($) *</label>
                          <input type="number" required min="1" value={combMonto} onChange={e => setCombMonto(e.target.value)} className="border border-slate-300 p-2 rounded-lg text-sm outline-none" placeholder="Ej: 25000" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-700 uppercase">Nº Factura / Boleta</label>
                          <input type="text" value={combNumFactura} onChange={e => setCombNumFactura(e.target.value)} className="border border-slate-300 p-2 rounded-lg text-sm outline-none" placeholder="Ej: 88512" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-700 uppercase">RUT Empresa / Enlace Factura</label>
                          <input type="text" value={combRutaFactura} onChange={e => setCombRutaFactura(e.target.value)} className="border border-slate-300 p-2 rounded-lg text-sm outline-none" placeholder="Ej: 76.123.456-7" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-2 border-b pb-1 mt-4">Cantidades a Cargar al Camión</label>
                  {productos.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm font-medium">
                      ⚠️ No hay productos activos en el catálogo. Ve a la sección de Productos para habilitarlos.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {productos.map(p => (
                        <div key={p.id} className="bg-slate-50 border p-3 rounded-lg flex flex-col gap-2 shadow-sm">
                          <span className="text-xs font-semibold text-slate-800 line-clamp-1" title={p.nombre}>{p.nombre}</span>
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
                            className="border border-slate-300 p-2 rounded text-sm text-center font-mono font-bold focus:ring-2 focus:ring-[#283289] outline-none" 
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t flex justify-end gap-2">
                  <button type="button" onClick={() => setPanel(null)} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancelar</button>
                  <button type="submit" disabled={isPending} className="bg-[#283289] hover:bg-[#1e266b] text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm">{isPending ? 'Procesando...' : 'Confirmar Carga'}</button>
                </div>
              </form>
            )}

            {/* Formulario Cierre */}
            {panel === 'cierre' && (
              <form onSubmit={handleCierre} className="p-6 overflow-y-auto space-y-5">
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-800 font-medium flex items-start gap-2">
                  <span className="text-lg leading-none">💡</span> 
                  <p>Las ventas y la recaudación se procesan automáticamente desde la App en terreno. Aquí solo debes registrar el retorno físico de envases a la planta.</p>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Ruta / Repartidor a Cerrar *</label>
                  {cuadraturaSeleccionada ? (
                    <div className="border border-emerald-300 bg-emerald-50 p-3 rounded-lg font-bold text-emerald-800 flex justify-between items-center">
                      <span>{new Date(cuadraturaSeleccionada.fecha).toLocaleDateString()} - {cuadraturaSeleccionada.usuario?.nombre} {cuadraturaSeleccionada.usuario?.apellido}</span>
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  ) : (
                    <select required value={cuadraturaSeleccionada?.id || ''} onChange={e => setCuadraturaSeleccionada(historial.find(c => c.id === e.target.value))} className="border border-slate-300 p-2.5 rounded-lg text-sm bg-white outline-none font-bold text-slate-800">
                      <option value="">— Selecciona la ruta pendiente —</option>
                      {historial.filter(c => c.estado === 'ABIERTA').map(c => (
                        <option key={c.id} value={c.id}>
                          {new Date(c.fecha).toLocaleDateString()} - {c.usuario?.nombre} {c.usuario?.apellido}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex flex-col gap-1 border-t border-b border-slate-200 py-4 my-2">
                  <label className="text-xs font-bold text-indigo-700 uppercase">Kilometraje Final del Vehículo *</label>
                  <input 
                    type="number" 
                    min="0"
                    required 
                    value={cierreKmFinal} 
                    onChange={e => setCierreKmFinal(e.target.value)} 
                    className="border border-indigo-300 p-3 rounded-lg text-lg font-mono font-bold text-indigo-900 bg-indigo-50 focus:ring-2 focus:ring-indigo-500 outline-none w-full" 
                    placeholder="Ej: 145120"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-2 pb-1">Retorno de Productos (Vuelven llenos)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {productos.map(p => (
                      <div key={p.id} className="bg-slate-50 border p-3 rounded-lg flex flex-col gap-2 shadow-sm">
                        <span className="text-xs font-semibold text-slate-800 line-clamp-1">{p.nombre}</span>
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
                          className="border border-emerald-200 p-2 rounded text-sm text-center font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-none" 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700 uppercase">Vacíos Entrantes</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={cierreVaciosTot === 0 && cierreVaciosTot.toString() !== '0' ? '' : cierreVaciosTot} 
                      onChange={e => setCierreVaciosTot(e.target.value === '' ? 0 : Number(e.target.value))} 
                      className="border border-blue-200 p-2 rounded-lg text-sm font-mono text-center font-bold text-blue-700 bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="0" 
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700 uppercase">Vacíos Dañados</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={cierreVaciosDan === 0 && cierreVaciosDan.toString() !== '0' ? '' : cierreVaciosDan} 
                      onChange={e => setCierreVaciosDan(e.target.value === '' ? 0 : Number(e.target.value))} 
                      className="border border-rose-200 p-2 rounded-lg text-sm font-mono text-center font-bold text-rose-700 bg-rose-50 focus:ring-2 focus:ring-rose-500 outline-none" 
                      placeholder="0" 
                    />
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end gap-2">
                  <button type="button" onClick={() => { setPanel(null); setCuadraturaSeleccionada(null); }} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancelar</button>
                  <button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm">{isPending ? 'Procesando...' : 'Cerrar Cuadratura Definitiva'}</button>
                </div>
              </form>
            )}

            {/* Formulario Reabrir */}
            {panel === 'reabrir' && (
              <form onSubmit={handleReabrir} className="p-6 overflow-y-auto space-y-5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Ruta / Repartidor a Reabrir *</label>
                  {cuadraturaSeleccionada ? (
                    <div className="border border-amber-300 bg-amber-50 p-3 rounded-lg font-bold text-amber-800 flex justify-between items-center">
                      <span>{new Date(cuadraturaSeleccionada.fecha).toLocaleDateString()} - {cuadraturaSeleccionada.usuario?.nombre} {cuadraturaSeleccionada.usuario?.apellido}</span>
                      <Unlock className="h-5 w-5" />
                    </div>
                  ) : (
                    <select required value={cuadraturaSeleccionada?.id || ''} onChange={e => setCuadraturaSeleccionada(historial.find(c => c.id === e.target.value))} className="border border-slate-300 p-2.5 rounded-lg text-sm bg-white outline-none font-bold text-slate-800">
                      <option value="">— Selecciona la ruta a reabrir —</option>
                      {historial.filter(c => c.estado === 'CERRADA').map(c => (
                        <option key={c.id} value={c.id}>
                          {new Date(c.fecha).toLocaleDateString()} - {c.usuario?.nombre} {c.usuario?.apellido}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Motivo (Obligatorio) *</label>
                  <textarea required rows={3} placeholder="Ej: Faltó registrar pago de bencina, error en conteo de vacíos..." value={reabrirMotivo} onChange={e => setReobrirMotivo(e.target.value)} className="border border-slate-300 p-2.5 rounded-lg text-sm bg-white outline-none resize-none focus:ring-2 focus:ring-amber-500" />
                </div>

                <div className="pt-4 border-t flex justify-end gap-2">
                  <button type="button" onClick={() => { setPanel(null); setCuadraturaSeleccionada(null); }} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancelar</button>
                  <button type="submit" disabled={isPending} className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm">{isPending ? 'Procesando...' : 'Reabrir para edición'}</button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
