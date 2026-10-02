'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  buscarClientePorCriterioAction,
  obtenerProductosAction,
  obtenerComunasYSectoresAction,
  guardarPedidoRapidoAction
} from '../actions';

interface ItemCarrito {
  uid: string;
  opcionKey: string;
  productoId: string;
  tipoTransaccion: string;
  cantidad: number;
}

interface OpcionProducto {
  key: string;
  productoId: string;
  nombre: string;
  tipoTransaccion: string;
  precio: number;
  categoria: string;
}

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
  // Buscador de cliente (automático con debounce)
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

  // Catálogo de productos
  const [productos, setProductos] = useState<any[]>([]);
  const [items, setItems] = useState<ItemCarrito[]>([]);

  const [guardando, setGuardando] = useState(false);
  const dropClienteRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Generar opciones de producto diferenciando Recarga y Nuevo
  const opcionesProductos = useMemo<OpcionProducto[]>(() => {
    const lista: OpcionProducto[] = [];

    for (const prod of productos) {
      if (prod.categoria === 'BOTELLON20') {
        lista.push({
          key: `${prod.id}_RECARGA`,
          productoId: prod.id,
          nombre: '💧 Botellón Recarga 20 Litros',
          tipoTransaccion: 'RECARGA',
          precio: prod.precio_recarga || 3000,
          categoria: 'BOTELLON20'
        });
        lista.push({
          key: `${prod.id}_VENTA`,
          productoId: prod.id,
          nombre: '🆕 Botellón Nuevo 20 Litros (con envase)',
          tipoTransaccion: 'VENTA',
          precio: prod.precio_venta_nueva || 6000,
          categoria: 'BOTELLON20'
        });
      } else if (prod.categoria === 'BOTELLON10') {
        lista.push({
          key: `${prod.id}_RECARGA`,
          productoId: prod.id,
          nombre: '💧 Botellón Recarga 10 Litros',
          tipoTransaccion: 'RECARGA',
          precio: prod.precio_recarga || 2000,
          categoria: 'BOTELLON10'
        });
        lista.push({
          key: `${prod.id}_VENTA`,
          productoId: prod.id,
          nombre: '🆕 Botellón Nuevo 10 Litros (con envase)',
          tipoTransaccion: 'VENTA',
          precio: prod.precio_venta_nueva || 4500,
          categoria: 'BOTELLON10'
        });
      } else if (prod.categoria === 'SODA') {
        lista.push({
          key: `${prod.id}_RECARGA`,
          productoId: prod.id,
          nombre: '🥤 Sifón Soda 1.5L - Recarga',
          tipoTransaccion: 'RECARGA',
          precio: prod.precio_recarga || 1500,
          categoria: 'SODA'
        });
        lista.push({
          key: `${prod.id}_VENTA`,
          productoId: prod.id,
          nombre: '🆕 Sifón Soda 1.5L - Nuevo (con envase)',
          tipoTransaccion: 'VENTA',
          precio: prod.precio_venta_nueva || 1500,
          categoria: 'SODA'
        });
      } else {
        if (prod.precio_recarga && prod.precio_recarga > 0) {
          lista.push({
            key: `${prod.id}_RECARGA`,
            productoId: prod.id,
            nombre: `💧 ${prod.nombre} (Recarga)`,
            tipoTransaccion: 'RECARGA',
            precio: prod.precio_recarga,
            categoria: prod.categoria
          });
          lista.push({
            key: `${prod.id}_VENTA`,
            productoId: prod.id,
            nombre: `🆕 ${prod.nombre} (Nuevo)`,
            tipoTransaccion: 'VENTA',
            precio: prod.precio_venta_nueva,
            categoria: prod.categoria
          });
        } else {
          lista.push({
            key: `${prod.id}_VENTA`,
            productoId: prod.id,
            nombre: `📦 ${prod.nombre}`,
            tipoTransaccion: 'VENTA',
            precio: prod.precio_venta_nueva,
            categoria: prod.categoria
          });
        }
      }
    }

    return lista;
  }, [productos]);

  const nuevoItemConDefault = (): ItemCarrito => {
    const defaultOpcion = opcionesProductos[0];
    return {
      uid: Math.random().toString(36).slice(2),
      opcionKey: defaultOpcion ? defaultOpcion.key : '',
      productoId: defaultOpcion ? defaultOpcion.productoId : '',
      tipoTransaccion: defaultOpcion ? defaultOpcion.tipoTransaccion : 'RECARGA',
      cantidad: 1,
    };
  };

  useEffect(() => {
    if (isOpen) {
      obtenerProductosAction().then(res => {
        if (res.success && res.productos) {
          setProductos(res.productos);
        }
      });
      obtenerComunasYSectoresAction().then(res => {
        if (res.success && res.comunas) {
          setComunas(res.comunas);
        }
      });
      setRutaDiaId(rutasDia.length === 1 ? rutasDia[0].id : '');
    }
  }, [isOpen, rutasDia]);

  // Inicializar carrito cuando las opciones de productos estén disponibles
  useEffect(() => {
    if (isOpen && opcionesProductos.length > 0 && items.length === 0) {
      setItems([nuevoItemConDefault()]);
    }
  }, [isOpen, opcionesProductos]);

  // Cierre de dropdown de clientes al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropClienteRef.current && !dropClienteRef.current.contains(event.target as Node)) {
        setMostrarDropClientes(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── BUSCADOR AUTOMÁTICO CON DEBOUNCE (250ms) ──
  useEffect(() => {
    // Si ya hay un cliente seleccionado y el criterio coincide, no buscar
    if (clienteEncontrado && criterioCliente.includes(clienteEncontrado.nombre)) {
      return;
    }

    const query = criterioCliente.trim();
    if (query.length < 2) {
      setClientesSugeridos([]);
      setMostrarDropClientes(false);
      setSinResultados(false);
      setBuscando(false);
      return;
    }

    setBuscando(true);
    setSinResultados(false);

    const timer = setTimeout(async () => {
      try {
        const res = await buscarClientePorCriterioAction(query);
        if (res.success && res.clientes && res.clientes.length > 0) {
          setClientesSugeridos(res.clientes);
          setMostrarDropClientes(true);
          setSinResultados(false);
        } else {
          setClientesSugeridos([]);
          setMostrarDropClientes(false);
          setSinResultados(true);
        }
      } catch (err) {
        console.error('Error buscando cliente:', err);
      } finally {
        setBuscando(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [criterioCliente, clienteEncontrado]);

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
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const inputsDeshabilitados = !!clienteEncontrado && !editandoCliente;
  const sectoresDisponibles = comunas.find(c => c.id === comunaId)?.sectores || [];

  // ── Carrito de productos ──
  const agregarLineaProducto = () => setItems(prev => [...prev, nuevoItemConDefault()]);

  const quitarLineaProducto = (uid: string) => {
    setItems(prev => prev.length > 1 ? prev.filter(i => i.uid !== uid) : prev);
  };

  const cambiarOpcionProducto = (uid: string, opcionKey: string) => {
    const opcion = opcionesProductos.find(op => op.key === opcionKey);
    if (!opcion) return;
    setItems(prev =>
      prev.map(i =>
        i.uid === uid
          ? {
              ...i,
              opcionKey: opcion.key,
              productoId: opcion.productoId,
              tipoTransaccion: opcion.tipoTransaccion
            }
          : i
      )
    );
  };

  const actualizarCantidad = (uid: string, nuevaCant: number) => {
    const cantValida = Math.max(1, isNaN(nuevaCant) ? 1 : nuevaCant);
    setItems(prev => prev.map(i => i.uid === uid ? { ...i, cantidad: cantValida } : i));
  };

  // Cálculo total aproximado del pedido
  const totalEstimado = items.reduce((acc, it) => {
    const op = opcionesProductos.find(o => o.key === it.opcionKey);
    return acc + (op ? op.precio * it.cantidad : 0);
  }, 0);

  const totalUnidades = items.reduce((acc, it) => acc + it.cantidad, 0);

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
      setItems([nuevoItemConDefault()]);
      setCanalOrigen('LLAMADO');
      onSuccess();
    } else {
      alert('Error al guardar pedido: ' + res.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl my-auto overflow-hidden flex flex-col max-h-[92vh]">

        {/* HEADER MODERNO CON GRADIENTE CORPORATIVO */}
        <div className="bg-gradient-to-r from-[#013299] via-[#012a80] to-[#012060] text-white px-6 py-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-xl shadow-inner border border-white/20">
              📋
            </div>
            <div>
              <h3 className="font-black text-base uppercase tracking-wider text-white">
                Agendar Nuevo Pedido
              </h3>
              <p className="text-xs font-semibold text-blue-200">
                Fecha de Despacho: <span className="text-white font-bold">{fecha}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold transition-all text-sm border border-white/10"
            title="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* CUERPO DEL MODAL (SCROLL) */}
        <form onSubmit={guardarPedido} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-700">

          {/* ── 1. BUSCADOR DE CLIENTE AUTOMÁTICO ── */}
          <div ref={dropClienteRef} className="relative bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-black text-[#013299] uppercase tracking-wider flex items-center gap-1.5">
                <span>🔍</span> Buscar Cliente en Sistema
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                Búsqueda automática mientras escribes
              </span>
            </div>

            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={criterioCliente}
                onChange={(e) => {
                  setCriterioCliente(e.target.value);
                  if (clienteEncontrado) setClienteEncontrado(null);
                }}
                placeholder="Escribe nombre, teléfono (+569...) o dirección..."
                className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none focus:ring-2 focus:ring-[#013299]/25 focus:border-[#013299] transition-all shadow-sm"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                🔍
              </span>

              {/* Botón de limpiar o loader */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                {buscando ? (
                  <div className="w-4 h-4 border-2 border-[#013299] border-t-transparent rounded-full animate-spin"></div>
                ) : criterioCliente ? (
                  <button
                    type="button"
                    onClick={limpiarClienteSeleccionado}
                    className="w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs font-bold transition-colors"
                    title="Limpiar búsqueda"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            </div>

            {/* LISTA DE SUGERENCIAS DE CLIENTES */}
            {mostrarDropClientes && clientesSugeridos.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-2 mx-4 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden divide-y divide-slate-100 max-h-52 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Resultados encontrados ({clientesSugeridos.length})
                </div>
                {clientesSugeridos.map(cli => (
                  <div
                    key={cli.id}
                    onClick={() => seleccionarCliente(cli)}
                    className="p-3 hover:bg-blue-50/80 cursor-pointer flex flex-col gap-0.5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-sm">{cli.nombre}</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-[#013299]">
                        {cli.tipo === 'EMPRESA' ? 'EMPRESA' : 'PERSONA'}
                      </span>
                    </div>
                    <span className="text-slate-500 text-xs">
                      📍 {cli.sector ? `${cli.sector.nombre} (${cli.sector.comuna?.nombre})` : 'Sin sector'} — {cli.direccion}
                    </span>
                    <span className="text-[#013299] text-xs font-semibold">
                      📞 {cli.telefono || 'Sin teléfono'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ESTADO: CLIENTE ENCONTRADO Y SELECCIONADO */}
            {clienteEncontrado && (
              <div className="mt-3 p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 text-base font-bold">✓</span>
                  <div>
                    <p className="text-xs font-bold text-emerald-800">
                      Cliente cargado: <span className="font-black">{clienteEncontrado.nombre}</span>
                    </p>
                    <p className="text-[11px] text-emerald-600">
                      📞 {clienteEncontrado.telefono} • 📍 {clienteEncontrado.direccion}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditandoCliente(!editandoCliente)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider border transition-all ${
                      editandoCliente
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-white text-[#013299] border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    {editandoCliente ? '🔓 Modificando' : '✏️ Editar'}
                  </button>
                  <button
                    type="button"
                    onClick={limpiarClienteSeleccionado}
                    className="text-[10px] px-2 py-1 rounded-lg font-black uppercase tracking-wider bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-all"
                  >
                    Cambiar
                  </button>
                </div>
              </div>
            )}

            {/* ESTADO: SIN RESULTADOS */}
            {sinResultados && (
              <div className="mt-3 p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2">
                <span className="text-blue-600 text-base">ℹ️</span>
                <div>
                  <p className="text-xs font-bold text-[#013299]">
                    Cliente no registrado en la base de datos
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Completa los datos a continuación para registrarlo automáticamente en este pedido.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── 2. DATOS DEL CLIENTE ── */}
          <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>👤</span> Información de Despacho y Contacto
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">
                  Nombre del Cliente / Destinatario *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={inputsDeshabilitados}
                  placeholder="Ej: Juan Pérez"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] disabled:bg-slate-100 disabled:text-slate-600 transition-colors"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">
                  Dirección de Entrega *
                </label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  disabled={inputsDeshabilitados}
                  placeholder="Ej: Pasaje Los Aromos 123"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] disabled:bg-slate-100 disabled:text-slate-600 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">
                  Comuna
                </label>
                <select
                  value={comunaId}
                  disabled={inputsDeshabilitados}
                  onChange={(e) => {
                    setComunaId(e.target.value);
                    setSectorId('');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] disabled:bg-slate-100 disabled:text-slate-600 transition-colors"
                >
                  <option value="">-- Comuna --</option>
                  {comunas.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">
                  Sector
                </label>
                <select
                  value={sectorId}
                  disabled={inputsDeshabilitados || !comunaId}
                  onChange={(e) => setSectorId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] disabled:bg-slate-100 disabled:text-slate-600 transition-colors"
                >
                  <option value="">-- Sector --</option>
                  {sectoresDisponibles.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">
                  Teléfono *
                </label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  disabled={inputsDeshabilitados}
                  placeholder="+569 1234 5678"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] disabled:bg-slate-100 disabled:text-slate-600 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">
                  Tipo de Cliente
                </label>
                <select
                  value={tipoCliente}
                  onChange={(e) => setTipoCliente(e.target.value)}
                  disabled={inputsDeshabilitados}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] disabled:bg-slate-100 disabled:text-slate-600 transition-colors"
                >
                  <option value="DOMICILIO">Persona Natural</option>
                  <option value="EMPRESA">Empresa</option>
                </select>
              </div>

              {/* Campos condicionales de empresa */}
              {tipoCliente === 'EMPRESA' && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">
                      RUT Empresa *
                    </label>
                    <input
                      type="text"
                      value={rutEmpresa}
                      onChange={(e) => setRutEmpresa(e.target.value)}
                      disabled={inputsDeshabilitados}
                      placeholder="76.123.456-7"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] disabled:bg-slate-100 disabled:text-slate-600 transition-colors"
                      required={tipoCliente === 'EMPRESA'}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">
                      Giro Comercial
                    </label>
                    <input
                      type="text"
                      value={giro}
                      onChange={(e) => setGiro(e.target.value)}
                      disabled={inputsDeshabilitados}
                      placeholder="Distribución..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] disabled:bg-slate-100 disabled:text-slate-600 transition-colors"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">
                  Documento Tributario
                </label>
                <select
                  value={preferenciaFactura}
                  onChange={(e) => setPreferenciaFactura(e.target.value)}
                  disabled={inputsDeshabilitados}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] disabled:bg-slate-100 disabled:text-slate-600 transition-colors"
                >
                  <option value="BOLETA">Boleta</option>
                  <option value="FACTURA">Factura</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">
                  Canal de Contacto
                </label>
                <select
                  value={canalOrigen}
                  onChange={(e) => setCanalOrigen(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] transition-colors"
                >
                  <option value="LLAMADO">📞 Llamado Telefónico</option>
                  <option value="WHATSAPP">💬 WhatsApp</option>
                  <option value="WEB">🌐 Página Web</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── 3. ASIGNACIÓN A CAMIÓN ── */}
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200/80">
            <label className="block text-[11px] font-black text-[#013299] mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <span>🚚</span> Asignar a Hoja de Ruta / Camión
            </label>
            <select
              value={rutaDiaId}
              onChange={(e) => setRutaDiaId(e.target.value)}
              className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] transition-colors shadow-sm"
            >
              <option value="">-- Dejar sin camión asignado (Pendiente) --</option>
              {rutasDia.map(r => (
                <option key={r.id} value={r.id}>
                  {r.ruta_base?.nombre ? `${r.ruta_base.nombre} · ` : ''}[{r.vehiculo?.patente || 'S/P'}] {r.vehiculo?.marca} {r.vehiculo?.modelo} — Chofer: {r.usuario?.nombre || 'No asignado'}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1.5">
              El cliente se insertará en el orden correspondiente de la hoja de ruta seleccionada.
            </p>
          </div>

          {/* ── 4. PRODUCTOS DEL PEDIDO (SIN DROPDOWN DE RECARGA/NUEVO) ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>📦</span> Productos del Pedido
              </label>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Selecciona directo Recarga o Nuevo
              </span>
            </div>

            {items.map((item, idx) => {
              const opSeleccionada = opcionesProductos.find(op => op.key === item.opcionKey);

              return (
                <div
                  key={item.uid}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shadow-sm hover:border-slate-300 transition-colors"
                >
                  {/* Selector unificado de producto con tipo ya incorporado */}
                  <div className="flex-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Producto y Modalidad ({idx + 1})
                    </label>
                    <select
                      value={item.opcionKey}
                      onChange={(e) => cambiarOpcionProducto(item.uid, e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] transition-colors"
                      required
                    >
                      <option value="">-- Selecciona un Producto --</option>
                      {opcionesProductos.map(op => (
                        <option key={op.key} value={op.key}>
                          {op.nombre} (${op.precio.toLocaleString('es-CL')})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selector de cantidad */}
                  <div className="w-full sm:w-32 shrink-0">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 text-center sm:text-left">
                      Cantidad
                    </label>
                    <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden shadow-inner">
                      <button
                        type="button"
                        onClick={() => actualizarCantidad(item.uid, item.cantidad - 1)}
                        className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 font-black text-base transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={(e) => actualizarCantidad(item.uid, parseInt(e.target.value, 10))}
                        className="w-full py-1 text-center font-black text-slate-800 text-sm outline-none bg-transparent"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => actualizarCantidad(item.uid, item.cantidad + 1)}
                        className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 font-black text-base transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Subtotal fila */}
                  <div className="w-24 text-right hidden sm:block shrink-0">
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Subtotal
                    </span>
                    <span className="text-xs font-black text-slate-700">
                      ${((opSeleccionada?.precio || 0) * item.cantidad).toLocaleString('es-CL')}
                    </span>
                  </div>

                  {/* Botón eliminar fila */}
                  <div className="flex items-center justify-end sm:justify-center">
                    <button
                      type="button"
                      onClick={() => quitarLineaProducto(item.uid)}
                      disabled={items.length === 1}
                      className="w-8 h-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 flex items-center justify-center font-bold text-sm transition-all"
                      title="Quitar producto"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}

            {/* BOTÓN AGREGAR LÍNEA */}
            <button
              type="button"
              onClick={agregarLineaProducto}
              className="w-full border-2 border-dashed border-slate-300 hover:border-[#013299] hover:bg-blue-50/40 text-slate-600 hover:text-[#013299] text-xs font-black py-2.5 rounded-2xl transition-all flex items-center justify-center gap-1.5"
            >
              <span>➕</span> Agregar otro producto al pedido
            </button>
          </div>

          {/* RESUMEN DEL PEDIDO */}
          <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-4 rounded-2xl border border-blue-200/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Total Unidades
              </span>
              <p className="text-lg font-black text-slate-800">
                {totalUnidades} <span className="text-xs font-semibold text-slate-500">unid.</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#013299]">
                Monto Estimado
              </span>
              <p className="text-xl font-black text-[#013299]">
                ${totalEstimado.toLocaleString('es-CL')}
              </p>
            </div>
          </div>

          {/* ACCIONES FOOTER */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="w-2/3 bg-gradient-to-r from-[#013299] to-[#012570] hover:from-[#012570] hover:to-[#011a50] text-white font-black py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-[#013299]/25 hover:shadow-xl hover:shadow-[#013299]/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {guardando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span>📥</span> Guardar e Ingresar a Ruta
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}