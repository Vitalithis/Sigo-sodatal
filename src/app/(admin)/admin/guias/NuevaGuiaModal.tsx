'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  buscarClientesGuiaAction,
  obtenerRepartidoresAction,
  obtenerProductosGuiaAction,
  crearGuiaAction,
  ItemGuiaInput,
} from './actions';

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
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'GUIA_MENSUAL'>('EFECTIVO');
  const [botellonesPrestados, setBotellonesPrestados] = useState(0);
  const [observaciones, setObservaciones] = useState('');

  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const dropClienteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      obtenerRepartidoresAction().then((res) => {
        if (res.success) setRepartidores(res.repartidores);
      });
      obtenerProductosGuiaAction().then((res) => {
        if (res.success) setProductos(res.productos);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropClienteRef.current && !dropClienteRef.current.contains(event.target as Node)) {
        setMostrarDropClientes(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buscarCliente = async () => {
    if (!criterioCliente.trim() || criterioCliente.trim().length < 2) return;
    setBuscando(true);
    const res = await buscarClientesGuiaAction(criterioCliente);
    setClientesSugeridos(res.clientes || []);
    setMostrarDropClientes(true);
    setBuscando(false);
  };

  const seleccionarCliente = (cli: any) => {
    setClienteSeleccionado(cli);
    setDireccionEntrega(cli.direccion);
    setCriterioCliente(`${cli.nombre} (📞 ${cli.telefono})`);
    setMostrarDropClientes(false);
    if (cli.modalidad_pago === 'MENSUAL') setMetodoPago('GUIA_MENSUAL');
  };

  const limpiarCliente = () => {
    setClienteSeleccionado(null);
    setCriterioCliente('');
    setDireccionEntrega('');
  };

  const productoSeleccionado = productos.find((p) => p.id === productoTemp);
  const precioSugerido = productoSeleccionado
    ? tipoTemp === 'VENTA'
      ? productoSeleccionado.precio_venta_nueva
      : productoSeleccionado.precio_recarga ?? productoSeleccionado.precio_venta_nueva
    : 0;

  const agregarItem = () => {
    if (!productoTemp) return alert('Selecciona un producto.');
    if (cantidadTemp <= 0) return alert('La cantidad debe ser mayor a 0.');
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
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, precio_unitario: precio } : i)));
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
    setBotellonesPrestados(0);
    setObservaciones('');
  };

  const guardarGuia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSeleccionado) return alert('Debes seleccionar un cliente registrado.');
    if (!repartidorId) return alert('Debes asignar un repartidor.');
    if (items.length === 0) return alert('Agrega al menos un producto a la guía.');

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
      observaciones: observaciones || undefined,
      botellones_prestados_entrega: botellonesPrestados,
      items: payload,
    });
    setGuardando(false);

    if (res.success) {
      resetForm();
      onSuccess();
    } else {
      alert('Error al guardar: ' + res.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="bg-blue-600 px-4 py-3 flex justify-between items-center text-white sticky top-0 z-10">
          <h3 className="font-bold">📄 Nueva Guía de Despacho</h3>
          <button type="button" onClick={onClose} className="text-white hover:text-gray-200 font-bold">
            ✕
          </button>
        </div>

        <form onSubmit={guardarGuia} className="p-5 space-y-4">
          {/* Cliente */}
          <div ref={dropClienteRef} className="relative">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Buscar Cliente (Dirección, Teléfono o Nombre)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={criterioCliente}
                onChange={(e) => {
                  setCriterioCliente(e.target.value);
                  if (clienteSeleccionado) setClienteSeleccionado(null);
                }}
                placeholder="Ej: San Martin 450 o +569..."
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              {clienteSeleccionado ? (
                <button
                  type="button"
                  onClick={limpiarCliente}
                  className="bg-red-50 border border-red-300 px-2 rounded text-xs hover:bg-red-100 font-medium text-red-600"
                >
                  Limpiar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={buscarCliente}
                  className="bg-gray-100 border border-gray-300 px-3 rounded text-sm hover:bg-gray-200 font-medium text-gray-700"
                >
                  {buscando ? '...' : 'Buscar'}
                </button>
              )}
            </div>

            {mostrarDropClientes && clientesSugeridos.length > 0 && (
              <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded mt-1 max-h-40 overflow-y-auto shadow-lg text-xs divide-y divide-gray-100">
                {clientesSugeridos.map((cli) => (
                  <li
                    key={cli.id}
                    onClick={() => seleccionarCliente(cli)}
                    className="p-2 hover:bg-blue-50 cursor-pointer flex flex-col gap-0.5 text-gray-700"
                  >
                    <span className="font-bold text-gray-900">{cli.nombre}</span>
                    <span className="text-gray-500 text-[11px]">
                      📍 {cli.direccion} {cli.modalidad_pago === 'MENSUAL' ? '· 🧾 Cliente MENSUAL' : ''}
                    </span>
                    <span className="text-blue-600 text-[10px]">📞 {cli.telefono}</span>
                  </li>
                ))}
              </ul>
            )}

            {mostrarDropClientes && clientesSugeridos.length === 0 && !buscando && (
              <p className="text-[11px] text-orange-600 font-semibold mt-1">
                No se encontraron clientes registrados con ese criterio. Las guías solo pueden emitirse a
                clientes ya registrados.
              </p>
            )}

            {clienteSeleccionado && (
              <p className="text-[11px] text-green-600 font-bold mt-1">✅ Cliente cargado.</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-0.5 uppercase">
              Dirección de Entrega
            </label>
            <input
              type="text"
              value={direccionEntrega}
              onChange={(e) => setDireccionEntrega(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-0.5 uppercase">
              Repartidor Asignado
            </label>
            <select
              value={repartidorId}
              onChange={(e) => setRepartidorId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
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

          <div className="border-t border-gray-200 my-2"></div>

          {/* Ítems */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Productos de la Guía</label>

            <div className="flex gap-2 items-end bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div className="flex-1">
                <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase">
                  Producto
                </label>
                <select
                  value={productoTemp}
                  onChange={(e) => setProductoTemp(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-28">
                <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase">Tipo</label>
                <select
                  value={tipoTemp}
                  onChange={(e) => setTipoTemp(e.target.value as 'VENTA' | 'RECARGA')}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                >
                  <option value="VENTA">Venta</option>
                  <option value="RECARGA">Recarga</option>
                </select>
              </div>
              <div className="w-20">
                <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase">Cant.</label>
                <input
                  type="number"
                  min="1"
                  value={cantidadTemp}
                  onChange={(e) => setCantidadTemp(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-center"
                />
              </div>
              <button
                type="button"
                onClick={agregarItem}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-3 py-1.5 rounded"
              >
                + Agregar
              </button>
            </div>

            {items.length > 0 && (
              <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 text-gray-600">
                    <tr>
                      <th className="text-left p-2">Producto</th>
                      <th className="text-center p-2">Tipo</th>
                      <th className="text-center p-2">Cant.</th>
                      <th className="text-right p-2">Precio Unit.</th>
                      <th className="text-right p-2">Subtotal</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((it) => (
                      <tr key={it.key}>
                        <td className="p-2 font-medium text-gray-800">{it.nombre}</td>
                        <td className="p-2 text-center text-gray-600">{it.tipo_transaccion}</td>
                        <td className="p-2 text-center text-gray-600">{it.cantidad}</td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={it.precio_unitario}
                            onChange={(e) => actualizarPrecioItem(it.key, Number(e.target.value))}
                            className="w-20 border border-gray-300 rounded px-1 py-0.5 text-right"
                          />
                        </td>
                        <td className="p-2 text-right font-bold text-gray-800">
                          ${(it.cantidad * it.precio_unitario).toLocaleString('es-CL')}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => quitarItem(it.key)}
                            className="text-red-500 hover:text-red-700 font-bold"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="p-2 text-right font-bold text-gray-700">
                        Total
                      </td>
                      <td className="p-2 text-right font-bold text-blue-700">
                        ${total.toLocaleString('es-CL')}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 my-2"></div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-0.5 uppercase">
                Método de Pago
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as any)}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="GUIA_MENSUAL">Guía Mensual (crédito)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-0.5 uppercase">
                Botellones Prestados en Entrega
              </label>
              <input
                type="number"
                min="0"
                value={botellonesPrestados}
                onChange={(e) => setBotellonesPrestados(Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-0.5 uppercase">
              Observaciones
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded shadow-sm mt-2 disabled:opacity-50 transition-colors text-sm"
          >
            {guardando ? 'Guardando...' : '📄 Emitir Guía de Despacho'}
          </button>
        </form>
      </div>
    </div>
  );
}
