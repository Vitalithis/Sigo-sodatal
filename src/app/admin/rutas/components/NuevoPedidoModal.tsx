'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  buscarClientePorCriterioAction,
  obtenerProductosAction,
  obtenerComunasYSectoresAction,
  guardarPedidoRapidoAction
} from '../actions';

interface ItemCarrito {
  uid: string;
  productoId: string;
  busqueda: string;
  cantidad: number;
  tipoTransaccion: string;
  mostrarDrop: boolean;
}

const nuevoItem = (): ItemCarrito => ({
  uid: Math.random().toString(36).slice(2),
  productoId: '',
  busqueda: '',
  cantidad: 1,
  tipoTransaccion: 'RECARGA',
  mostrarDrop: false,
});

export default function NuevoPedidoModal({
  fecha,
  isOpen,
  onClose,
  onSuccess,
  rutasDia
}: {
  fecha: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rutasDia: any[];
}) {
  // Buscador de cliente
  const [criterioCliente, setCriterioCliente] = useState('');
  const [clientesSugeridos, setClientesSugeridos] = useState<any[]>([]);
  const [mostrarDropClientes, setMostrarDropClientes] = useState(false);
  const [clienteEncontrado, setClienteEncontrado] = useState<any>(null);
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [sinResultados, setSinResultados] = useState(false);

  // Datos del cliente
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [tipoCliente, setTipoCliente] = useState('DOMICILIO');
  const [canalOrigen, setCanalOrigen] = useState('LLAMADO');

  // Comuna / Sector (dropdown dependiente)
  const [comunas, setComunas] = useState<any[]>([]);
  const [comunaId, setComunaId] = useState('');
  const [sectorId, setSectorId] = useState('');

  // Datos de empresa (condicionales)
  const [email, setEmail] = useState('');
  const [rutEmpresa, setRutEmpresa] = useState('');
  const [giro, setGiro] = useState('');
  const [preferenciaFactura, setPreferenciaFactura] = useState('BOLETA');

  // Ruta / camión
  const [rutaDiaId, setRutaDiaId] = useState('');

  // Carrito de productos
  const [items, setItems] = useState<ItemCarrito[]>([nuevoItem()]);
  const [productos, setProductos] = useState<any[]>([]);

  const [guardando, setGuardando] = useState(false);
  const dropClienteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      obtenerProductosAction().then(res => { if (res.success) setProductos(res.productos); });
      obtenerComunasYSectoresAction().then(res => { if (res.success) setComunas(res.comunas); });
      setRutaDiaId(rutasDia.length === 1 ? rutasDia[0].id : '');
    }
  }, [isOpen, rutasDia]);

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
    if (!criterioCliente.trim()) return;
    setBuscando(true);
    setSinResultados(false);
    const res = await buscarClientePorCriterioAction(criterioCliente);
    if (res.success && res.clientes && res.clientes.length > 0) {
      setClientesSugeridos(res.clientes);
      setMostrarDropClientes(true);
    } else {
      setClientesSugeridos([]);
      setClienteEncontrado(null);
      setEditandoCliente(false);
      setSinResultados(true);
      // No adivinamos si lo que tipeó es nombre, teléfono o dirección:
      // dejamos los campos del cliente nuevo en blanco para que los complete.
      setNombre('');
      setDireccion('');
      setTelefono('');
      setTipoCliente('DOMICILIO');
      setComunaId('');
      setSectorId('');
      setEmail('');
      setRutEmpresa('');
      setGiro('');
      setPreferenciaFactura('BOLETA');
    }
    setBuscando(false);
  };

  const seleccionarCliente = (cli: any) => {
    setClienteEncontrado(cli);
    setEditandoCliente(false);
    setNombre(cli.nombre);
    setDireccion(cli.direccion);
    setTelefono(cli.telefono);
    setTipoCliente(cli.tipo || 'DOMICILIO');
    setComunaId(cli.sector?.comuna_id || '');
    setSectorId(cli.sector_id || '');
    setEmail(cli.email || '');
    setRutEmpresa(cli.rut_empresa || '');
    setGiro(cli.giro || '');
    setPreferenciaFactura(cli.preferencia_factura || 'BOLETA');
    setCriterioCliente(`${cli.nombre} (📞 ${cli.telefono})`);
    setMostrarDropClientes(false);
    setSinResultados(false);
  };

  const limpiarClienteSeleccionado = () => {
    setClienteEncontrado(null);
    setEditandoCliente(false);
    setCriterioCliente('');
    setSinResultados(false);
    setNombre('');
    setDireccion('');
    setTelefono('');
    setTipoCliente('DOMICILIO');
    setComunaId('');
    setSectorId('');
    setEmail('');
    setRutEmpresa('');
    setGiro('');
    setPreferenciaFactura('BOLETA');
  };

  const inputsDeshabilitados = !!clienteEncontrado && !editandoCliente;
  const sectoresDisponibles = comunas.find(c => c.id === comunaId)?.sectores || [];

  // ── Carrito de productos ──
  const agregarLineaProducto = () => setItems(prev => [...prev, nuevoItem()]);

  const quitarLineaProducto = (uid: string) => {
    setItems(prev => prev.length > 1 ? prev.filter(i => i.uid !== uid) : prev);
  };

  const actualizarItem = (uid: string, cambios: Partial<ItemCarrito>) => {
    setItems(prev => prev.map(i => i.uid === uid ? { ...i, ...cambios } : i));
  };

  const productosFiltrados = (busqueda: string) =>
    productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  const guardarPedido = async (e: React.FormEvent) => {
    e.preventDefault();

    const itemsValidos = items.filter(i => i.productoId && i.cantidad > 0);
    if (itemsValidos.length === 0) {
      alert('Agrega al menos un producto con cantidad válida.');
      return;
    }

    setGuardando(true);

    const res = await guardarPedidoRapidoAction({
      fecha_solicitada: fecha,
      canal_origen: canalOrigen,
      cliente_id: clienteEncontrado?.id,
      editando_existente: editandoCliente,
      nuevo_cliente: (!clienteEncontrado || editandoCliente) ? {
        nombre,
        telefono,
        direccion,
        sector_id: sectorId || undefined,
        tipo: tipoCliente,
        email: email || undefined,
        rut_empresa: tipoCliente === 'EMPRESA' ? rutEmpresa : undefined,
        giro: tipoCliente === 'EMPRESA' ? giro : undefined,
        preferencia_factura: preferenciaFactura,
      } : undefined,
      items: itemsValidos.map(i => ({
        producto_id: i.productoId,
        cantidad: Number(i.cantidad),
        tipo_transaccion: i.tipoTransaccion,
      })),
      ruta_dia_id: rutaDiaId || undefined,
    });

    setGuardando(false);

    if (res.success) {
      limpiarClienteSeleccionado();
      setItems([nuevoItem()]);
      setCanalOrigen('LLAMADO');
      onSuccess();
    } else {
      alert('Error al guardar: ' + res.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-visible max-h-[90vh] overflow-y-auto">

        <div className="bg-[#1e40af] px-4 py-3 flex justify-between items-center text-white sticky top-0 z-10 rounded-t-xl">
          <h3 className="font-black text-sm uppercase tracking-wider">
            Nuevo Pedido <span className="font-medium normal-case tracking-normal text-blue-100">({fecha})</span>
          </h3>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white font-bold transition-colors">✕</button>
        </div>

        <form onSubmit={guardarPedido} className="p-5 space-y-4">

          {/* BUSCADOR DE CLIENTE */}
          <div ref={dropClienteRef} className="relative">
            <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5">
              Buscar Cliente (Nombre, Teléfono o Dirección)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={criterioCliente}
                onChange={(e) => {
                  setCriterioCliente(e.target.value);
                  if (clienteEncontrado) setClienteEncontrado(null);
                  setSinResultados(false);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarCliente(); } }}
                placeholder="Ej: María Ruiz, +569... o San Martín 450"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] transition-colors"
              />
              {clienteEncontrado ? (
                <button type="button" onClick={limpiarClienteSeleccionado}
                  className="bg-red-50 border border-red-200 px-3 rounded-lg text-xs hover:bg-red-100 font-bold text-red-600 transition-colors">
                  Limpiar
                </button>
              ) : (
                <button type="button" onClick={buscarCliente}
                  className="bg-slate-100 border border-slate-300 px-3 rounded-lg text-xs hover:bg-slate-200 font-bold text-slate-700 transition-colors">
                  {buscando ? '...' : 'Buscar'}
                </button>
              )}
            </div>

            {mostrarDropClientes && clientesSugeridos.length > 0 && (
              <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg mt-1 max-h-40 overflow-y-auto shadow-xl text-xs divide-y divide-slate-100">
                {clientesSugeridos.map(cli => (
                  <li key={cli.id} onClick={() => seleccionarCliente(cli)}
                    className="p-2.5 hover:bg-blue-50 cursor-pointer flex flex-col gap-0.5 transition-colors">
                    <span className="font-bold text-slate-800">{cli.nombre}</span>
                    <span className="text-slate-500 text-[11px]">
                      📍 {cli.sector ? `${cli.sector.nombre} (${cli.sector.comuna?.nombre})` : 'Sin sector'} — {cli.direccion}
                    </span>
                    <span className="text-[#1e40af] text-[10px] font-semibold">📞 {cli.telefono}</span>
                  </li>
                ))}
              </ul>
            )}

            {sinResultados && (
              <p className="text-[11px] text-amber-600 font-semibold mt-1.5">
                ⚠️ No se encontraron clientes. Completa los datos abajo para registrarlo como nuevo.
              </p>
            )}

            {clienteEncontrado && (
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[11px] text-emerald-600 font-bold">✅ Cliente cargado desde base de datos.</p>
                <button type="button" onClick={() => setEditandoCliente(!editandoCliente)}
                  className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wide border transition-colors ${
                    editandoCliente ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-blue-50 text-[#1e40af] border-blue-200 hover:bg-blue-100'
                  }`}>
                  {editandoCliente ? '🔓 Modificando...' : '📝 Editar Datos'}
                </button>
              </div>
            )}
          </div>

          {/* DATOS DEL CLIENTE */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">Nombre del Destinatario</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={inputsDeshabilitados}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] disabled:bg-slate-200/60 bg-white transition-colors" required />
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">Dirección de Despacho</label>
              <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} disabled={inputsDeshabilitados}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] disabled:bg-slate-200/60 bg-white transition-colors" required />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">Comuna</label>
              <select value={comunaId} disabled={inputsDeshabilitados}
                onChange={(e) => { setComunaId(e.target.value); setSectorId(''); }}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] disabled:bg-slate-200/60 bg-white transition-colors">
                <option value="">-- Comuna --</option>
                {comunas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">Sector</label>
              <select value={sectorId} disabled={inputsDeshabilitados || !comunaId}
                onChange={(e) => setSectorId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] disabled:bg-slate-200/60 bg-white transition-colors">
                <option value="">-- Sector --</option>
                {sectoresDisponibles.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">Teléfono</label>
              <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} disabled={inputsDeshabilitados}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] disabled:bg-slate-200/60 bg-white transition-colors" required />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">Tipo de Cliente</label>
              <select value={tipoCliente} onChange={(e) => setTipoCliente(e.target.value)} disabled={inputsDeshabilitados}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] disabled:bg-slate-200/60 bg-white transition-colors">
                <option value="DOMICILIO">Persona Natural</option>
                <option value="EMPRESA">Empresa</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">Correo (opcional)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={inputsDeshabilitados}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] disabled:bg-slate-200/60 bg-white transition-colors" />
            </div>

            {/* Campos condicionales de empresa */}
            {tipoCliente === 'EMPRESA' && (
              <>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">RUT Empresa</label>
                  <input type="text" value={rutEmpresa} onChange={(e) => setRutEmpresa(e.target.value)} disabled={inputsDeshabilitados}
                    placeholder="76.555.444-3"
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] disabled:bg-slate-200/60 bg-white transition-colors" required={tipoCliente === 'EMPRESA'} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">Giro</label>
                  <input type="text" value={giro} onChange={(e) => setGiro(e.target.value)} disabled={inputsDeshabilitados}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] disabled:bg-slate-200/60 bg-white transition-colors" />
                </div>
              </>
            )}

            <div className={tipoCliente === 'EMPRESA' ? 'col-span-2' : 'col-span-2'}>
              <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">Preferencia de Facturación</label>
              <select value={preferenciaFactura} onChange={(e) => setPreferenciaFactura(e.target.value)} disabled={inputsDeshabilitados}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] disabled:bg-slate-200/60 bg-white transition-colors">
                <option value="BOLETA">Boleta</option>
                <option value="FACTURA">Factura</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">Canal de Origen</label>
              <select value={canalOrigen} onChange={(e) => setCanalOrigen(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] bg-white transition-colors">
                <option value="LLAMADO">Llamado Telefónico</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="WEB">Página Web</option>
              </select>
            </div>
          </div>

          {/* ASIGNACIÓN A CAMIÓN */}
          <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200">
            <label className="block text-[10px] font-black text-slate-700 mb-1.5 uppercase tracking-wider">
              🚚 Asignar a Camión / Ruta Activa
            </label>
            <select value={rutaDiaId} onChange={(e) => setRutaDiaId(e.target.value)}
              className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm bg-white font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] transition-colors">
              <option value="">-- Dejar sin asignar (Pendiente) --</option>
              {rutasDia.map(r => (
                <option key={r.id} value={r.id}>
                  [{r.vehiculo?.patente}] {r.vehiculo?.marca} {r.vehiculo?.modelo} ({r.usuario?.nombre})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1.5">Si eliges un camión, el pedido se agregará automáticamente al final de su hoja de ruta.</p>
          </div>

          <div className="border-t border-slate-200 my-2"></div>

          {/* CARRITO DE PRODUCTOS */}
          <div className="space-y-3">
            <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider">Productos del Pedido</label>

            {items.map((item, idx) => {
              const filtrados = productosFiltrados(item.busqueda);
              return (
                <div key={item.uid} className="grid grid-cols-12 gap-2 items-end bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <div className="col-span-12 sm:col-span-5 relative">
                    {idx === 0 && <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Producto</label>}
                    <input
                      type="text"
                      placeholder="🔎 Buscar producto..."
                      value={item.busqueda}
                      onChange={(e) => actualizarItem(item.uid, { busqueda: e.target.value, productoId: '', mostrarDrop: true })}
                      onFocus={() => actualizarItem(item.uid, { mostrarDrop: true })}
                      onBlur={() => setTimeout(() => actualizarItem(item.uid, { mostrarDrop: false }), 150)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none font-medium focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] transition-colors bg-white"
                      required={!item.productoId}
                    />
                    {item.mostrarDrop && (
                      <ul className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg max-h-36 overflow-y-auto shadow-xl text-xs divide-y divide-slate-100">
                        {filtrados.length === 0 ? (
                          <li className="p-2.5 text-slate-400 italic">No se encontraron productos</li>
                        ) : (
                          filtrados.map(p => (
                            <li key={p.id}
                              onClick={() => actualizarItem(item.uid, { productoId: p.id, busqueda: p.nombre, mostrarDrop: false })}
                              className="p-2.5 hover:bg-blue-50 cursor-pointer transition-colors">
                              <span className="text-slate-800 font-medium">{p.nombre}</span>
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </div>

                  <div className="col-span-6 sm:col-span-4">
                    {idx === 0 && <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Tipo de Venta</label>}
                    <select value={item.tipoTransaccion} onChange={(e) => actualizarItem(item.uid, { tipoTransaccion: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-2 py-2 text-xs bg-white font-medium outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] transition-colors">
                      <option value="RECARGA">Recarga</option>
                      <option value="VENTA">Venta Nueva</option>
                    </select>
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    {idx === 0 && <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Cant.</label>}
                    <input type="number" min="1" value={item.cantidad}
                      onChange={(e) => actualizarItem(item.uid, { cantidad: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm text-center font-bold outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] transition-colors" required />
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex justify-center">
                    <button type="button" onClick={() => quitarLineaProducto(item.uid)} disabled={items.length === 1}
                      className="text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-lg leading-none transition-colors" title="Quitar producto">
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}

            <button type="button" onClick={agregarLineaProducto}
              className="w-full border border-dashed border-slate-300 hover:border-[#1e40af] hover:bg-blue-50/50 text-slate-500 hover:text-[#1e40af] text-xs font-bold py-2 rounded-lg transition-colors">
              ➕ Agregar otro producto
            </button>
          </div>

          <button type="submit" disabled={guardando}
            className="w-full bg-[#1e40af] hover:bg-blue-800 text-white font-bold py-3 rounded-lg shadow-sm mt-4 disabled:opacity-50 transition-colors text-xs uppercase tracking-wider">
            {guardando ? 'Guardando...' : '📥 Guardar e Ingresar a la Ruta'}
          </button>
        </form>

      </div>
    </div>
  );
}