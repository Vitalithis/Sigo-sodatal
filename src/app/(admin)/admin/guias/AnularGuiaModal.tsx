'use client';

import React, { useState } from 'react';
import { anularGuiaAction } from './actions';

export default function AnularGuiaModal({
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
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  if (!isOpen || !guia) return null;

  const anular = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    const res = await anularGuiaAction(guia.id, motivo);
    setGuardando(false);
    if (res.success) {
      setMotivo('');
      onSuccess();
    } else {
      alert('Error: ' + res.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="bg-red-600 px-4 py-3 flex justify-between items-center text-white">
          <h3 className="font-bold">🚫 Anular Guía N° {guia.numero_correlativo}</h3>
          <button type="button" onClick={onClose} className="text-white hover:text-gray-200 font-bold">
            ✕
          </button>
        </div>

        <form onSubmit={anular} className="p-5 space-y-3">
          <p className="text-xs text-gray-600">
            Cliente: <span className="font-semibold">{guia.cliente?.nombre}</span> — Total: $
            {guia.total?.toLocaleString('es-CL')}
          </p>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-0.5 uppercase">
              Motivo de anulación
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              required
              minLength={3}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded shadow-sm mt-2 disabled:opacity-50 transition-colors text-sm"
          >
            {guardando ? 'Anulando...' : 'Confirmar Anulación'}
          </button>
        </form>
      </div>
    </div>
  );
}
