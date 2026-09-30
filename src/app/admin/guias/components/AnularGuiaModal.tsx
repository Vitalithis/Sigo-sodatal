'use client';

import React, { useState } from 'react';
import { anularGuiaAction } from '../actions';
import { Ban, X, AlertTriangle, Loader2 } from 'lucide-react';
import { usePopup } from '@/hooks/usePopup';
import PopupGlobal from '@/components/ui/PopupGlobal';

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
  const { popup, showError, close } = usePopup();
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  if (!isOpen || !guia) return null;

  const anular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim() || motivo.trim().length < 3) {
      showError('Motivo Requerido', 'Debes ingresar un motivo de anulación válido (mínimo 3 caracteres).');
      return;
    }
    setGuardando(true);
    const res = await anularGuiaAction(guia.id, motivo);
    setGuardando(false);
    if (res.success) {
      setMotivo('');
      onSuccess();
    } else {
      showError('Error de Anulación', res.message || 'Error al anular la guía.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <PopupGlobal popup={popup} onClose={close} />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        
        {/* Header Modal */}
        <div className="bg-rose-600 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Ban className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Anular Guía #{guia.numero_correlativo}</h3>
              <p className="text-xs text-rose-100">Esta acción no se puede deshacer</p>
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

        {/* Form Body */}
        <form onSubmit={anular} className="p-6 space-y-4">
          <div className="bg-rose-50/70 border border-rose-100 p-3.5 rounded-xl text-xs space-y-1 text-slate-700">
            <div className="flex items-center gap-1.5 font-bold text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              Detalles de la guía a anular:
            </div>
            <p><span className="font-semibold">Cliente:</span> {guia.cliente?.nombre || 'N/A'}</p>
            <p><span className="font-semibold">Total:</span> ${guia.total?.toLocaleString('es-CL')}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Motivo de Anulación
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Indica el motivo detallado de la anulación..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all"
              required
              minLength={3}
              autoFocus
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="w-2/3 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md shadow-rose-600/20 hover:shadow-none transition-all disabled:opacity-50 text-xs flex items-center justify-center gap-2"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Anulando...
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4" />
                  Confirmar Anulación
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
