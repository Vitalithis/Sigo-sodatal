'use client';

import React, { useState, useEffect, useRef } from 'react';
import { buscarClientePorCriterioAction, obtenerProductosAction, guardarPedidoRapidoAction } from './actions';

export default function NuevoPedidoModal({ 
  fecha, 
  isOpen, 
  onClose, 
  onSuccess 
}: { 
  fecha: string; 
  isOpen: boolean; 
  onClose: () => void;
  onSuccess: () => void;
}) {
  // Estados de búsqueda de cliente
  const [criterioCliente, setCriterioCliente] = useState('');
  const [clientesSugeridos, setClientesSugeridos] = useState<any[]>([]);
  const [mostrarDropClientes, setMostrarDropClientes] = useState(false);
  const [clienteEncontrado, setClienteEncontrado] = useState<any>(null);
  
  // Nuevo Estado para habilitar la edición manual de un cliente guardado
  const [editandoCliente, setEditandoCliente] = useState(false);

  // Formulario / Datos Finales
  const [telefono, setTelefono] = useState('');
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [sector, setSector] = useState(''); 
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  
  // Catálogo de Productos y buscadores
  const [productos, setProductos] = useState<any[]>([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [mostrarDropProductos, setMostrarDropProductos] = useState(false);

  // Estados de carga
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Referencias para cerrar menús al hacer clic afuera
  const dropClienteRef = useRef<HTMLDivElement>(null);
  const dropProductoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      obtenerProductosAction().then(res => {
        if (res.success) setProductos(res.productos);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropClienteRef.current && !dropClienteRef.current.contains(event.target as Node)) {
        setMostrarDropClientes(false);
      }
      if (dropProductoRef.current && !dropProductoRef.current.contains(event.target as Node)) {
        setMostrarDropProductos(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buscarCliente = async () => {
    if (!criterioCliente.trim()) return;
    setBuscando(true);
    const res = await buscarClientePorCriterioAction(criterioCliente);
    if (res.success && res.clientes && res.clientes.length > 0) {
      setClientesSugeridos(res.clientes);
      setMostrarDropClientes(true);
    } else {
      setClientesSugeridos([]);
      setClienteEncontrado(null);
      setEditandoCliente(false);
      setNombre('');
      setDireccion('');
      setSector('');
      setTelefono(criterioCliente); 
      alert("No se encontraron clientes. Puedes registrarlo como cliente nuevo abajo.");
    }
    setBuscando(false);
  };

  const seleccionarCliente = (cli: any) => {
    setClienteEncontrado(cli);
    setEditandoCliente(false); // Por defecto entra bloqueado hasta presionar Editar
    setNombre(cli.nombre);
    setDireccion(cli.direccion);
    setSector(cli.sector || ''); 
    setTelefono(cli.telefono);
    setCriterioCliente(`${cli.nombre} (📞 ${cli.telefono})`);
    setMostrarDropClientes(false);
  };

  const limpiarClienteSeleccionado = () => {
    setClienteEncontrado(null);
    setEditandoCliente(false);
    setCriterioCliente('');
    setNombre('');
    setDireccion('');
    setSector('');
    setTelefono('');
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())
  );

  // 💡 Lógica del botón corregida invocando de forma limpia al Server Action importado arriba
  const guardarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoId) return alert("Por favor seleccione un producto válido.");
    
    setGuardando(true);

    const res = await guardarPedidoRapidoAction({
      fecha_solicitada: fecha,
      cliente_id: clienteEncontrado?.id,
      editando_existente: editandoCliente,
      nuevo_cliente: (!clienteEncontrado || editandoCliente) ? { nombre, telefono, direccion, sector } : undefined,
      producto_id: productoId,
      cantidad: Number(cantidad)
    });

    setGuardando(false);

    if (res.success) {
      setCriterioCliente('');
      setTelefono(''); 
      setClienteEncontrado(null); 
      setEditandoCliente(false);
      setNombre(''); 
      setDireccion(''); 
      setSector('');
      setProductoId(''); 
      setBusquedaProducto('');
      setCantidad(1);
      onSuccess();
    } else {
      alert("Error al guardar: " + res.message);
    }
  };

  // Determinar si los inputs deben estar deshabilitados o no
  const inputsDeshabilitados = !!clienteEncontrado && !editandoCliente;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-visible">
        
        <div className="bg-blue-600 px-4 py-3 flex justify-between items-center text-white">
          <h3 className="font-bold">Nuevo Pedido ({fecha})</h3>
          <button type="button" onClick={onClose} className="text-white hover:text-gray-200 font-bold">✕</button>
        </div>

        <form onSubmit={guardarPedido} className="p-5 space-y-4">
          
          {/* BUSCADOR GLOBAL DE CLIENTE */}
          <div ref={dropClienteRef} className="relative">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Buscar Cliente (Dirección, Teléfono o Nombre)</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={criterioCliente} 
                onChange={(e) => {
                  setCriterioCliente(e.target.value);
                  if (clienteEncontrado) setClienteEncontrado(null); 
                }}
                placeholder="Ej: San Martin 450 o +569..."
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              {clienteEncontrado ? (
                <button 
                  type="button"
                  onClick={limpiarClienteSeleccionado}
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

            {/* Sugerencias */}
            {mostrarDropClientes && clientesSugeridos.length > 0 && (
              <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded mt-1 max-h-40 overflow-y-auto shadow-lg text-xs divide-y divide-gray-100">
                {clientesSugeridos.map(cli => (
                  <li 
                    key={cli.id}
                    onClick={() => seleccionarCliente(cli)}
                    className="p-2 hover:bg-blue-50 cursor-pointer flex flex-col gap-0.5 text-gray-700"
                  >
                    <span className="font-bold text-gray-900">{cli.nombre}</span>
                    <span className="text-gray-500 text-[11px]">📍 Sector: {cli.sector || 'Sin Asignar'} - {cli.direccion}</span>
                    <span className="text-blue-600 text-[10px]">📞 {cli.telefono}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Alertas de Estado e Interacción de Edición */}
            {clienteEncontrado && (
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] text-green-600 font-bold">
                  ✅ Cliente cargado desde base de datos.
                </p>
                <button
                  type="button"
                  onClick={() => setEditandoCliente(!editandoCliente)}
                  className={`text-[11px] px-2 py-0.5 rounded font-bold border transition-colors ${
                    editandoCliente 
                      ? 'bg-orange-100 text-orange-700 border-orange-300' 
                      : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                  }`}
                >
                  {editandoCliente ? '🔓 Modificando...' : '📝 Editar Datos'}
                </button>
              </div>
            )}
            {!clienteEncontrado && criterioCliente.trim().length > 3 && !buscando && (
              <p className="text-[11px] text-orange-600 font-semibold mt-1">
                📝 Si no es cliente existente, rellena los datos manuales abajo.
              </p>
            )}
          </div>

          {/* CAMPOS COMPLEMENTARIOS (AUTOCOMPLETADOS O EDITABLES) */}
          <div className="grid grid-cols-1 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-0.5 uppercase">Nombre del Destinatario</label>
              <input 
                type="text" 
                value={nombre} 
                onChange={(e) => setNombre(e.target.value)}
                disabled={inputsDeshabilitados}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm disabled:bg-gray-200/60 disabled:text-gray-600 bg-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-0.5 uppercase">Sector / Población</label>
              <input 
                type="text" 
                value={sector} 
                onChange={(e) => setSector(e.target.value)}
                disabled={inputsDeshabilitados}
                placeholder="Ej: Boca Sur, San Pedro Centro"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm disabled:bg-gray-200/60 disabled:text-gray-600 bg-white font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-0.5 uppercase">Dirección de Despacho (Calle e Intersección)</label>
              <input 
                type="text" 
                value={direccion} 
                onChange={(e) => setDireccion(e.target.value)}
                disabled={inputsDeshabilitados}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm disabled:bg-gray-200/60 disabled:text-gray-600 bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-0.5 uppercase">Teléfono de Contacto</label>
              <input 
                type="text" 
                value={telefono} 
                onChange={(e) => setTelefono(e.target.value)}
                disabled={inputsDeshabilitados}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm disabled:bg-gray-200/60 disabled:text-gray-600 bg-white"
                required
              />
            </div>
          </div>

          <div className="border-t border-gray-200 my-2"></div>

          {/* DATOS DEL PEDIDO */}
          <div className="flex gap-3 items-end">
            <div ref={dropProductoRef} className="flex-1 relative">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Producto</label>
              <input 
                type="text"
                placeholder="🔎 Escribe para filtrar..."
                value={busquedaProducto}
                onChange={(e) => {
                  setBusquedaProducto(e.target.value);
                  setProductoId(''); 
                  setMostrarDropProductos(true);
                }}
                onFocus={() => setMostrarDropProductos(true)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none font-medium"
                required={!productoId}
              />

              {/* Lista flotante de productos */}
              {mostrarDropProductos && (
                <ul className="absolute z-50 bottom-full mb-1 w-full bg-white border border-gray-200 rounded max-h-36 overflow-y-auto shadow-xl text-xs divide-y divide-gray-50">
                  {productosFiltrados.length === 0 ? (
                    <li className="p-2 text-gray-400 italic">No se encontraron productos</li>
                  ) : (
                    productosFiltrados.map(p => (
                      <li
                        key={p.id}
                        onClick={() => {
                          setProductoId(p.id);
                          setBusquedaProducto(p.nombre);
                          setMostrarDropProductos(false);
                        }}
                        className={`p-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center ${productoId === p.id ? 'bg-blue-50 font-bold' : ''}`}
                      >
                        <span className="text-gray-800">{p.nombre}</span>
                        <span className="bg-gray-100 text-gray-700 px-1 py-0.5 rounded font-bold">${p.precio_venta_nueva}</span>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>

            <div className="w-24">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Cantidad</label>
              <input 
                type="number" 
                min="1"
                value={cantidad} 
                onChange={(e) => setCantidad(Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-center font-bold"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={guardando}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded shadow-sm mt-4 disabled:opacity-50 transition-colors text-sm"
          >
            {guardando ? 'Guardando...' : '📥 Guardar e Ingresar a la Fecha'}
          </button>
        </form>

      </div>
    </div>
  );
}