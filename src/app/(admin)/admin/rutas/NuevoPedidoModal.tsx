'use client';

import React, { useState, useEffect } from 'react';
import { buscarClientePorTelefonoAction, obtenerProductosAction, guardarPedidoRapidoAction } from './actions';

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
  const [telefono, setTelefono] = useState('');
  const [clienteEncontrado, setClienteEncontrado] = useState<any>(null);
  
  // Formulario
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  
  const [productos, setProductos] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      obtenerProductosAction().then(res => {
        if (res.success) setProductos(res.productos);
      });
    }
  }, [isOpen]);

  const buscarCliente = async () => {
    if (!telefono) return;
    setBuscando(true);
    const res = await buscarClientePorTelefonoAction(telefono);
    if (res.success && res.cliente) {
      setClienteEncontrado(res.cliente);
      setNombre(res.cliente.nombre);
      setDireccion(res.cliente.direccion);
    } else {
      setClienteEncontrado(null);
      setNombre('');
      setDireccion('');
    }
    setBuscando(false);
  };

  const guardarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    const res = await guardarPedidoRapidoAction({
      fecha_solicitada: fecha,
      cliente_id: clienteEncontrado?.id,
      nuevo_cliente: clienteEncontrado ? undefined : { nombre, telefono, direccion },
      producto_id: productoId,
      cantidad: Number(cantidad)
    });

    setGuardando(false);

    if (res.success) {
      // Limpiar y cerrar
      setTelefono(''); setClienteEncontrado(null); setNombre(''); setDireccion(''); setProductoId(''); setCantidad(1);
      onSuccess();
    } else {
      alert("Error al guardar: " + res.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        
        <div className="bg-blue-600 px-4 py-3 flex justify-between items-center text-white">
          <h3 className="font-bold">Nuevo Pedido ({fecha})</h3>
          <button onClick={onClose} className="text-white hover:text-gray-200 font-bold">✕</button>
        </div>

        <form onSubmit={guardarPedido} className="p-5 space-y-4">
          
          {/* BUSCADOR DE CLIENTE */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono del Cliente</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={telefono} 
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: +56912345678"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <button 
                type="button" 
                onClick={buscarCliente}
                className="bg-gray-100 border border-gray-300 px-3 rounded text-sm hover:bg-gray-200 font-medium text-gray-700"
              >
                {buscando ? '...' : 'Buscar'}
              </button>
            </div>
            {clienteEncontrado && (
              <p className="text-[11px] text-green-600 font-bold mt-1">✅ Cliente existente encontrado.</p>
            )}
            {!clienteEncontrado && telefono.length > 5 && !buscando && (
              <p className="text-[11px] text-orange-600 font-bold mt-1">⚠️ Cliente nuevo. Se creará un registro.</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre</label>
              <input 
                type="text" 
                value={nombre} 
                onChange={(e) => setNombre(e.target.value)}
                disabled={!!clienteEncontrado}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Dirección Exacta</label>
              <input 
                type="text" 
                value={direccion} 
                onChange={(e) => setDireccion(e.target.value)}
                disabled={!!clienteEncontrado}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                required
              />
            </div>
          </div>

          <div className="border-t border-gray-200 my-4"></div>

          {/* DATOS DEL PEDIDO */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Producto</label>
              <select 
                value={productoId} 
                onChange={(e) => setProductoId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                required
              >
                <option value="">Seleccione...</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Cantidad</label>
              <input 
                type="number" 
                min="1"
                value={cantidad} 
                onChange={(e) => setCantidad(Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-center"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={guardando}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded shadow-sm mt-4 disabled:opacity-50 transition-colors"
          >
            {guardando ? 'Guardando...' : '📥 Guardar e Ingresar a la Fecha'}
          </button>
        </form>

      </div>
    </div>
  );
}