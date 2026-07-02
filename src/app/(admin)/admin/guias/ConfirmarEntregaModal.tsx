'use client';

import React, { useState } from 'react';
import { confirmarEntregaGuiaAction } from './actions';

export default function ConfirmarEntregaModal({
  guia,
  isOpen,
  onClose,
  onSuccess,
}: {
  guia: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [nombreReceptor, setNombreReceptor] = useState('');
  const [rutReceptor, setRutReceptor] = useState('');
  const [metodoPago, setMetodoPago] = useState(guia?.metodo_pago || 'EFECTIVO');
  const [guardando, setGuardando] = useState(false);

  if (!isOpen || !guia) return null;

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    const res = await confirmarEntregaGuiaAction(guia.id, {
      nombre_receptor: nombreReceptor,
      rut_receptor: rutReceptor || undefined,
      metodo_pago: metodoPago,
    });
    setGuardando(false);
    if (res.success) {
      setNombreReceptor('');
      setRutReceptor('');
      onSuccess();
    } else {
      alert('Error: ' + res.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="bg-green-600 px-4 py-3 flex justify-between items-center text-white">
          <h3 className="font-bold">✅ Confirmar Entrega — Guía N° {guia.numero_correlativo}</h3>
          <button type="button" onClick={onClose} className="text-white hover:text-gray-200 font-bold">
            ✕
          </button>
        </div>

        <form onSubmit={confirmar} className="p-5 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-0.5 uppercase">
              Nombre de quien recibe
            </label>
            <input
              type="text"
              value={nombreReceptor}
              onChange={(e) => setNombreReceptor(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-0.5 uppercase">
              RUT (opcional)
            </label>
            <input
              type="text"
              value={rutReceptor}
              onChange={(e) => setRutReceptor(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-0.5 uppercase">
              Método de Pago Real
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="GUIA_MENSUAL">Guía Mensual (crédito)</option>
            </select>
            <p className="text-[10px] text-gray-400 mt-1">
              Si el cliente es de modalidad MENSUAL o eliges "Guía Mensual", la guía quedará pendiente de
              cierre mensual en vez de pagada al contado.
            </p>
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded shadow-sm mt-2 disabled:opacity-50 transition-colors text-sm"
          >
            {guardando ? 'Guardando...' : 'Confirmar Entrega'}
          </button>
        </form>
      </div>
    </div>
  );
}
