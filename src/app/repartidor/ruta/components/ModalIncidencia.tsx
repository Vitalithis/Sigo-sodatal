"use client";

import { useState } from 'react';
import { registrarIncidenciaAction } from '@/app/admin/rutas/actions';
import { TipoIncidencia } from '@/lib/prisma/generated';

interface ModalIncidenciaProps {
  parada: any;
  usuarioId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalIncidencia({ parada, usuarioId, onClose, onSuccess }: ModalIncidenciaProps) {
  const [tipo, setTipo] = useState<TipoIncidencia | ''>('');
  const [descripcion, setDescripcion] = useState('');
  const [cantidadEntregada, setCantidadEntregada] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cliente = parada.cliente;
  const pedido = parada.pedido;
  
  // Asumimos que operativamente el 90% de las veces hay un solo item principal (ej. Botellón 20L)
  const primerItem = pedido?.items?.[0]; 

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!tipo) {
      setError('Debes seleccionar un motivo.');
      return;
    }

    if (tipo === 'CANTIDAD_PARCIAL') {
      if (cantidadEntregada === '' || Number(cantidadEntregada) < 0) {
        setError('Debes ingresar una cantidad válida.');
        return;
      }
      if (primerItem && Number(cantidadEntregada) > primerItem.cantidad) {
        setError(`La cantidad no puede superar lo pedido original (${primerItem.cantidad}).`);
        return;
      }
    }

    setLoading(true);

    const res = await registrarIncidenciaAction({
      cliente_id: parada.cliente_id,
      parada_id: parada.id,
      usuario_id: usuarioId,
      tipo: tipo as TipoIncidencia,
      descripcion: descripcion.trim() || undefined,
      pedido_item_id: (tipo === 'CANTIDAD_PARCIAL' && primerItem) ? primerItem.id : undefined,
      cantidad_entregada: tipo === 'CANTIDAD_PARCIAL' ? Number(cantidadEntregada) : undefined,
    });

    if (res.success) {
      onSuccess();
    } else {
      setError(res.message || 'Error al registrar la incidencia.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        
        <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-red-900">Reportar Problema</h2>
            <p className="text-sm text-red-700 mt-1">{cliente.nombre}</p>
          </div>
          <button 
            onClick={onClose}
            className="bg-white text-gray-500 hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Motivo principal</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoIncidencia)}
              className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50 text-gray-900 text-base focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
            >
              <option value="" disabled>Selecciona una opción...</option>
              <option value="NO_ESTABA">El cliente no estaba</option>
              <option value="DEJADO_CONSERJERIA">Dejado en conserjería (sin pago)</option>
              <option value="PRESTAMO_BOTELLON">Préstamo de botellón vacío</option>
              {pedido && <option value="CANTIDAD_PARCIAL">Entrega parcial (entregué menos)</option>}
              <option value="REAGENDADO">El cliente pidió reagendar</option>
              <option value="OTRO">Otro motivo</option>
            </select>
          </div>

          {tipo === 'CANTIDAD_PARCIAL' && primerItem && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-semibold text-blue-900 mb-2">
                ¿Cuánto entregaste de {primerItem.producto.nombre}? (Pedido original: {primerItem.cantidad})
              </label>
              <input
                type="number"
                min="0"
                max={primerItem.cantidad}
                value={cantidadEntregada}
                onChange={(e) => setCantidadEntregada(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-blue-200 rounded-lg p-3 text-lg font-bold text-center focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Observaciones (Opcional)</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50 text-gray-900 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all resize-none"
              placeholder="Añade algún detalle si es necesario..."
            />
          </div>

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <div className="pt-2 border-t mt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white font-bold text-lg py-3.5 rounded-xl shadow-sm hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-70"
            >
              {loading ? 'Registrando...' : 'Guardar Incidencia'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}