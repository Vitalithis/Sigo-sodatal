'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  crearGuiaAction, 
  buscarClientesGuiaAction, 
  ItemGuiaInput 
} from '../actions';
import { obtenerChoferesAction as obtenerRepartidoresAction } from '../../flota/actions';
import { obtenerProductosAction as obtenerProductosGuiaAction } from '../../productos/actions';
import { 
  FileText, 
  X, 
  Search, 
  User, 
  MapPin, 
  Truck, 
  Plus, 
  Trash2, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Package, 
  Phone,
  Loader2
} from 'lucide-react';
import { usePopup } from '@/hooks/usePopup';
import PopupGlobal from '@/components/ui/PopupGlobal';

interface LineaItem {
  key: string;
  producto_id: string;
  nombre: string;
  tipo_transaccion: 'VENTA' | 'RECARGA';
  cantidad: number;
  precio_unitario: number;
}

export default function NuevaGuiaModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { popup, showSuccess, showError, close } = usePopup();

  // Cliente
  const [criterioCliente, setCriterioCliente] = useState('');
  const [clientesSugeridos, setClientesSugeridos] = useState<any[]>([]);
  const [mostrarDropClientes, setMostrarDropClientes] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  const [direccionEntrega, setDireccionEntrega] = useState('');

  // Repartidor
  const [repartidores, setRepartidores] = useState<any[]>([]);
  const [repartidorId, setRepartidorId] = useState('');

  // Productos e ítems
  const [productos, setProductos] = useState<any[]>([]);
  const [items, setItems] = useState<LineaItem[]>([]);
  const [productoTemp, setProductoTemp] = useState('');
  const [tipoTemp, setTipoTemp] = useState<'VENTA' | 'RECARGA'>('VENTA');
  const [cantidadTemp, setCantidadTemp] = useState(1);

  // Otros
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TARJETA' | 'GUIA_MENSUAL'>('EFECTIVO');
  const [nombreReceptor, setNombreReceptor] = useState('');
  const [rutReceptor, setRutReceptor] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const dropClienteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      obtenerRepartidoresAction().then((res) => {
        if (res.success) setRepartidores(res.choferes);
      });
      obtenerProductosGuiaAction().then((res) => {
        if (res.success) setProductos(res.productos);
      });
    }
  }, [isOpen]);

  // Búsqueda en vivo (debounced search)
  useEffect(() => {
    if (clienteSeleccionado) return;
    const q = criterioCliente.trim();
    if (q.length < 2) {
      setClientesSugeridos([]);
      setMostrarDropClientes(false);
      return;
    }

    setBuscando(true);
    const timer = setTimeout(async () => {
      const res = await buscarClientesGuiaAction(q);
      setBuscando(false);
      if (res.success) {
        setClientesSugeridos(res.clientes || []);
        setMostrarDropClientes(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [criterioCliente, clienteSeleccionado]);

  // Click outside listener para cerrar dropdown de clientes
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropClienteRef.current && !dropClienteRef.current.contains(event.target as Node)) {
        setMostrarDropClientes(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const seleccionarCliente = (cli: any) => {
    setClienteSeleccionado(cli);
    setDireccionEntrega(cli.direccion || '');
    setCriterioCliente(cli.nombre);
    setMostrarDropClientes(false);
    if (cli.modalidad_pago === 'MENSUAL') {
      setMetodoPago('GUIA_MENSUAL');
    }
  };

  const limpiarCliente = () => {
    setClienteSeleccionado(null);
    setCriterioCliente('');
    setDireccionEntrega('');
    setClientesSugeridos([]);
    setMostrarDropClientes(false);
  };

  const productoSeleccionado = productos.find((p) => p.id === productoTemp);
  const precioSugerido = productoSeleccionado
    ? tipoTemp === 'VENTA'
      ? productoSeleccionado.precio_venta_nueva
      : productoSeleccionado.precio_recarga ?? productoSeleccionado.precio_venta_nueva
    : 0;

  const agregarItem = () => {
    if (!productoTemp) {
      showError('Campos Incompletos', 'Selecciona un producto.');
      return;
    }
    if (cantidadTemp <= 0) {
      showError('Cantidad Inválida', 'La cantidad debe ser mayor a 0.');
      return;
    }
    const producto = productos.find((p) => p.id === productoTemp);
    setItems((prev) => [
      ...prev,
      {
        key: `${Date.now()}-${Math.random()}`,
        producto_id: productoTemp,
        nombre: producto?.nombre || '',
        tipo_transaccion: tipoTemp,
        cantidad: cantidadTemp,
        precio_unitario: precioSugerido,
      },
    ]);
    setProductoTemp('');
    setCantidadTemp(1);
  };

  const quitarItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const actualizarPrecioItem = (key: string, precio: number) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, precio_unitario: Math.max(0, precio) } : i)));
  };

  const total = items.reduce((acc, i) => acc + i.cantidad * i.precio_unitario, 0);

  const resetForm = () => {
    setCriterioCliente('');
    setClienteSeleccionado(null);
    setDireccionEntrega('');
    setRepartidorId('');
    setItems([]);
    setProductoTemp('');
    setCantidadTemp(1);
    setMetodoPago('EFECTIVO');
    setObservaciones('');
    setNombreReceptor('');
    setRutReceptor('');
  };

  const guardarGuia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSeleccionado) {
      showError('Cliente Requerido', 'Debes seleccionar un cliente de la lista.');
      return;
    }
    if (!repartidorId) {
      showError('Repartidor Requerido', 'Debes asignar un repartidor.');
      return;
    }
    if (items.length === 0) {
      showError('Productos Requeridos', 'Agrega al menos un producto a la guía.');
      return;
    }
    if (!nombreReceptor.trim()) {
      showError('Receptor Requerido', 'Debes indicar el nombre de quien recibe la entrega.');
      return;
    }

    setGuardando(true);
    const payload: ItemGuiaInput[] = items.map((i) => ({
      producto_id: i.producto_id,
      tipo_transaccion: i.tipo_transaccion,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
    }));

    const res = await crearGuiaAction({
      cliente_id: clienteSeleccionado.id,
      direccion_entrega: direccionEntrega,
      usuario_repartidor_id: repartidorId,
      metodo_pago: metodoPago,
      nombre_receptor: nombreReceptor.trim(),
      rut_receptor: rutReceptor.trim() || undefined,
      observaciones: observaciones || undefined,
      botellones_prestados_entrega: 0,
      items: payload,
    });
    setGuardando(false);

    if (res.success) {
      resetForm();
      onSuccess();
    } else {
      showError('Error al Guardar', res.message || 'No se pudo registrar la guía.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <PopupGlobal popup={popup} onClose={close} />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Header Modal */}
        <div className="bg-[#013299] px-6 py-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Nueva Guía de Despacho</h3>
              <p className="text-xs text-blue-100">Registro de entrega inmediata</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={guardarGuia} className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Cliente with Live Debounced Search */}
          <div ref={dropClienteRef} className="relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#013299]" />
              Cliente
            </label>
            
            {clienteSeleccionado ? (
              <div className="flex items-center justify-between bg-blue-50/60 border border-blue-200 rounded-xl p-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{clienteSeleccionado.nombre}</span>
                    {clienteSeleccionado.modalidad_pago === 'MENSUAL' && (
                      <span className="bg-blue-100 text-[#013299] text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                        🧾 Mensual
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3">
                    {clienteSeleccionado.direccion && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {clienteSeleccionado.direccion}
                      </span>
                    )}
                    {clienteSeleccionado.telefono && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {clienteSeleccionado.telefono}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={limpiarCliente}
                  className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                  title="Cambiar cliente"
                >
                  <X className="w-4 h-4" />
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  {buscando ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#013299]" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </div>
                <input
                  type="text"
                  value={criterioCliente}
                  onChange={(e) => setCriterioCliente(e.target.value)}
                  placeholder="Escribe nombre, dirección o teléfono para buscar..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#013299] focus:ring-2 focus:ring-[#013299]/20 transition-all"
                />
              </div>
            )}

            {/* Dropdown resultados en vivo */}
            {mostrarDropClientes && !clienteSeleccionado && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                {clientesSugeridos.length > 0 ? (
                  clientesSugeridos.map((cli) => (
                    <div
                      key={cli.id}
                      onClick={() => seleccionarCliente(cli)}
                      className="p-3 hover:bg-blue-50/70 cursor-pointer transition-colors flex justify-between items-center group"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 text-sm group-hover:text-[#013299] flex items-center gap-2">
                          {cli.nombre}
                          {cli.modalidad_pago === 'MENSUAL' && (
                            <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-1.5 py-0.5 rounded border border-purple-200">
                              Crédito
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                          {cli.direccion && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {cli.direccion}
                            </span>
                          )}
                          {cli.telefono && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {cli.telefono}
                            </span>
                          )}
                        </div>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-slate-300 group-hover:text-[#013299] transition-colors" />
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    {buscando ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#013299]" />
                        Buscando clientes...
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium flex items-center justify-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        No se encontraron clientes registrados con ese término.
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dirección y Repartidor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#013299]" />
                Dirección de Entrega
              </label>
              <input
                type="text"
                value={direccionEntrega}
                onChange={(e) => setDireccionEntrega(e.target.value)}
                placeholder="Dirección del cliente"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#013299] focus:ring-2 focus:ring-[#013299]/20 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#013299]" />
                Repartidor Asignado
              </label>
              <select
                value={repartidorId}
                onChange={(e) => setRepartidorId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#013299] focus:ring-2 focus:ring-[#013299]/20 transition-all"
                required
              >
                <option value="">Seleccionar repartidor...</option>
                {repartidores.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre} {r.apellido || ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-[#013299]" />
              Productos de la Guía
            </label>

            {/* Selector de nuevo ítem */}
            <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                <div className="sm:col-span-5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Producto
                  </label>
                  <select
                    value={productoTemp}
                    onChange={(e) => setProductoTemp(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#013299]"
                  >
                    <option value="">Seleccionar producto...</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Tipo
                  </label>
                  <select
                    value={tipoTemp}
                    onChange={(e) => setTipoTemp(e.target.value as 'VENTA' | 'RECARGA')}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#013299]"
                  >
                    <option value="VENTA">Venta</option>
                    <option value="RECARGA">Recarga</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Cant.
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={cantidadTemp}
                    onChange={(e) => setCantidadTemp(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 text-center focus:outline-none focus:border-[#013299]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={agregarItem}
                    className="w-full bg-[#013299] hover:bg-blue-900 text-white font-bold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar
                  </button>
                </div>
              </div>
            </div>

            {/* Tabla de ítems agregados */}
            {items.length > 0 && (
              <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="text-left py-2.5 px-3">Producto</th>
                      <th className="text-center py-2.5 px-3">Tipo</th>
                      <th className="text-center py-2.5 px-3">Cant.</th>
                      <th className="text-right py-2.5 px-3">Precio Unit.</th>
                      <th className="text-right py-2.5 px-3">Subtotal</th>
                      <th className="py-2.5 px-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {items.map((it) => (
                      <tr key={it.key} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{it.nombre}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            it.tipo_transaccion === 'VENTA' 
                              ? 'bg-blue-50 text-[#013299] border border-blue-100' 
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {it.tipo_transaccion}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium text-slate-700">{it.cantidad}</td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 border border-slate-200 rounded-lg">
                            <span className="text-slate-400">$</span>
                            <input
                              type="number"
                              value={it.precio_unitario}
                              onChange={(e) => actualizarPrecioItem(it.key, Number(e.target.value))}
                              className="w-16 bg-transparent text-right font-semibold text-slate-800 focus:outline-none"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          ${(it.cantidad * it.precio_unitario).toLocaleString('es-CL')}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => quitarItem(it.key)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Quitar producto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={4} className="py-3 px-3 text-right font-bold text-slate-700 text-xs uppercase tracking-wider">
                        Total General
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold text-[#013299] text-sm">
                        ${total.toLocaleString('es-CL')}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-4">
            {/* Receptor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nombre Receptor
                </label>
                <input
                  type="text"
                  value={nombreReceptor}
                  onChange={(e) => setNombreReceptor(e.target.value)}
                  placeholder="Persona que recibe en la entrega"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#013299] focus:ring-2 focus:ring-[#013299]/20 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  RUT Receptor (Opcional)
                </label>
                <input
                  type="text"
                  value={rutReceptor}
                  onChange={(e) => setRutReceptor(e.target.value)}
                  placeholder="Ej: 12.345.678-9"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#013299] focus:ring-2 focus:ring-[#013299]/20 transition-all"
                />
              </div>
            </div>

            {/* Método de Pago */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#013299]" />
                Método de Pago
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#013299] focus:ring-2 focus:ring-[#013299]/20 transition-all"
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta (Débito/Crédito)</option>
                <option value="GUIA_MENSUAL">Guía Mensual (Crédito)</option>
              </select>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Observaciones
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={2}
                placeholder="Comentarios o notas adicionales..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#013299] focus:ring-2 focus:ring-[#013299]/20 transition-all"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="w-2/3 bg-[#013299] hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-[#013299]/20 hover:shadow-none transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando Guía...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Registrar Guía Entregada
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
