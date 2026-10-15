'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Loader2, X, AlertTriangle, Truck, User, MapPin } from 'lucide-react';

interface Props {
  isOpen: boolean;
  rutaInfo: {
    id: string;
    chofer?: string;
    patente?: string;
    totalParadas?: number;
    nombreRuta?: string;
  } | null;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ModalEliminarRuta({
  isOpen,
  rutaInfo,
  isPending,
  onConfirm,
  onCancel,
}: Props) {
  // Cerrar modal con tecla Escape
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPending, onCancel]);

  if (!isOpen || !rutaInfo || typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onCancel();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="bg-rose-600 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">Eliminar Hoja de Ruta</h3>
              <p className="text-xs text-rose-100 font-medium">Confirmación de eliminación completa</p>
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
          
          <div className="flex items-start gap-3 bg-rose-50/70 border border-rose-100 p-4 rounded-2xl text-slate-700 text-xs leading-relaxed">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-950 text-sm">
                ¿Estás seguro de eliminar esta hoja de ruta?
              </p>
              <p className="mt-1 text-slate-600 leading-normal">
                Esta acción es <span className="font-extrabold text-rose-700">irreversible</span>. Se eliminarán todas las paradas programadas para este camión en esta jornada.
              </p>
            </div>
          </div>

          {/* Tarjeta con detalles de la ruta a eliminar */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2">
            {rutaInfo.nombreRuta && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Ruta Base:</span>
                <span className="font-extrabold text-slate-900">{rutaInfo.nombreRuta}</span>
              </div>
            )}
            {rutaInfo.chofer && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#013299]" /> Chofer:
                </span>
                <span className="font-bold text-slate-900">{rutaInfo.chofer}</span>
              </div>
            )}
            {rutaInfo.patente && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-[#013299]" /> Camión:
                </span>
                <span className="bg-amber-400 text-slate-900 font-black px-2 py-0.5 rounded-md text-[11px]">
                  {rutaInfo.patente}
                </span>
              </div>
            )}
            {typeof rutaInfo.totalParadas === 'number' && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" /> Paradas Asociadas:
                </span>
                <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                  {rutaInfo.totalParadas} paradas se perderán
                </span>
              </div>
            )}
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
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md shadow-rose-600/20 hover:shadow-none transition-all text-xs disabled:opacity-50 min-w-[140px] cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Eliminando...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Sí, Eliminar Ruta</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>,
    document.body
  );
}
