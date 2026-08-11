"use client";

import { useState } from 'react';
import { actualizarEstadoParadaAction } from '@/app/admin/rutas/actions';

interface ModalEntregaProps {
  parada: any;
  onClose: () => void;
  onAbrirIncidencia: () => void; // Para derivar a una incidencia si la entrega no es perfecta
}

export default function ModalEntrega({ parada, onClose, onAbrirIncidencia }: ModalEntregaProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pedido = parada.pedido;
  const cliente = parada.cliente;

  async function handleConfirmarEntrega() {
    setLoading(true);
    setError('');
    
    // Llamamos a la action que ya creaste en el bloque anterior
    const res = await actualizarEstadoParadaAction(parada.id, 'ENTREGADO');
    
    if (res.success) {
      onClose();
    } else {
      setError(res.message || 'Ocurrió un error al confirmar la entrega.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        
        {/* Cabecera */}
        <div className="bg-gray-50 p-4 border-b flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Confirmar Entrega</h2>
            <p className="text-sm text-gray-600 mt-1">{cliente.nombre}</p>
          </div>
          <button 
            onClick={onClose}
            className="bg-gray-200 text-gray-600 hover:bg-gray-300 rounded-full p-2 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Cuerpo / Detalle del pedido */}
        <div className="p-5">
          {pedido ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Detalle del Pedido</h3>
              <ul className="space-y-3">
                {pedido.items.map((item: any) => (
                  <li key={item.id} className="flex justify-between items-center bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                    <span className="font-medium text-gray-800">{item.producto.nombre}</span>
                    <span className="bg-blue-600 text-white font-bold text-lg px-3 py-1 rounded-md">
                      x{item.cantidad}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-yellow-800 text-sm">
              Esta parada es solo de visita (no tiene un pedido registrado en el sistema).
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="p-4 border-t bg-gray-50 space-y-3">
          <button
            onClick={handleConfirmarEntrega}
            disabled={loading}
            className="w-full bg-green-600 text-white font-bold text-lg py-4 rounded-xl shadow-sm hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {loading ? (
              <span className="animate-pulse">Confirmando...</span>
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Entrega Completa
              </>
            )}
          </button>
          
          <button
            onClick={() => {
              onClose();
              onAbrirIncidencia(); // Cierra este modal y abre el de incidencias
            }}
            disabled={loading}
            className="w-full bg-white text-gray-700 border-2 border-gray-200 font-bold text-base py-3 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Hubo un problema / Entrega Parcial
          </button>
        </div>

      </div>
    </div>
  );
}