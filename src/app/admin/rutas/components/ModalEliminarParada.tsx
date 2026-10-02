'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Loader2, X, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  paradaInfo: { id: string; nombreCliente?: string } | null;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ModalEliminarParada({
  isOpen,
  paradaInfo,
  isPending,
  onConfirm,
  onCancel,
}: Props) {
  if (!isOpen || !paradaInfo || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="bg-rose-600 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Quitar Pedido de la Ruta</h3>
              <p className="text-xs text-rose-100">Confirmación de retiro de parada</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white disabled:opacity-50"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 bg-rose-50/70 border border-rose-100 p-4 rounded-xl text-slate-700 text-xs leading-relaxed">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              ¿Estás seguro de quitar la parada del cliente{' '}
              <span className="font-bold text-rose-900">
                "{paradaInfo.nombreCliente || 'este cliente'}"
              </span>{' '}
              de esta hoja de ruta?
              <p className="mt-1.5 text-[11px] text-slate-500">
                El pedido se quitará del camión asignado y se reajustará el orden de las demás paradas de la jornada.
              </p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md shadow-rose-600/20 hover:shadow-none transition-all text-xs disabled:opacity-50 min-w-[125px] cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Quitando...</span>
                </>
              ) : (
                <span>Quitar Parada</span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
