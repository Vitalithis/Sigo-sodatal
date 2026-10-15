'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { PopupState } from '@/hooks/usePopup';

export default function PopupGlobal({ popup, onClose }: { popup: PopupState; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-dismiss de las notificaciones toast (todos los tipos excepto confirmación que requiere acción del usuario)
  useEffect(() => {
    if (popup.show && popup.type !== 'confirm') {
      const ms = popup.duration || (popup.type === 'error' ? 4500 : 3500);
      const timer = setTimeout(() => {
        onClose();
      }, ms);
      return () => clearTimeout(timer);
    }
  }, [popup.show, popup.type, popup.duration, onClose]);

  // Manejo de tecla Escape
  useEffect(() => {
    if (!popup.show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [popup.show, onClose]);

  if (!popup.show || !mounted || typeof document === 'undefined') return null;

  // 1. Modal de Confirmación centrado (Solo cuando requiere decisión explícita Confirmar / Cancelar)
  if (popup.type === 'confirm') {
    return createPortal(
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 !m-0 !top-0 !left-0 !right-0 !bottom-0"
      >
        <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center space-y-4 border border-slate-100 animate-in zoom-in-95 duration-200">
          <div className="flex justify-center">
            <div className="p-3 bg-amber-50 rounded-2xl text-amber-500">
              <AlertTriangle className="h-8 w-8" />
            </div>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-base">{popup.title}</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{popup.message}</p>
          </div>
          <div className="flex justify-center gap-2.5 pt-2">
            <button
              onClick={popup.onConfirm}
              className="text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-[#013299]/20 hover:bg-blue-900 transition-colors"
              style={{ backgroundColor: '#013299' }}
            >
              Confirmar
            </button>
            <button
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // 2. Notificación Toast Flotante para mensajes informativos (Éxito, Error, Info)
  // Sin oscurecer la pantalla, no bloquea al usuario, auto-cierre y botón X
  const esExito = popup.type === 'success';
  const esError = popup.type === 'error';

  return createPortal(
    <div className="fixed top-5 right-5 z-[150] pointer-events-none max-w-sm sm:max-w-md w-full px-3">
      <div
        className={`pointer-events-auto rounded-2xl p-4 shadow-xl border backdrop-blur-md flex items-start gap-3.5 transition-all animate-in slide-in-from-top-3 fade-in duration-200 ${
          esExito
            ? 'bg-white/95 border-emerald-200 shadow-emerald-950/10 text-slate-800'
            : esError
            ? 'bg-white/95 border-rose-200 shadow-rose-950/10 text-slate-800'
            : 'bg-white/95 border-blue-200 shadow-blue-950/10 text-slate-800'
        }`}
      >
        {/* Icono */}
        <div className="shrink-0 mt-0.5">
          {esExito && (
            <div className="p-2 bg-emerald-100/80 rounded-xl text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          )}
          {esError && (
            <div className="p-2 bg-rose-100/80 rounded-xl text-rose-600">
              <AlertCircle className="h-5 w-5" />
            </div>
          )}
          {!esExito && !esError && (
            <div className="p-2 bg-blue-100/80 rounded-xl text-[#013299]">
              <Info className="h-5 w-5" />
            </div>
          )}
        </div>

        {/* Textos */}
        <div className="flex-1 min-w-0 pr-2">
          <h5 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
            {popup.title}
          </h5>
          {popup.message && (
            <p className="text-xs text-slate-600 mt-1 leading-normal break-words">
              {popup.message}
            </p>
          )}
        </div>

        {/* Botón cerrar X */}
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Cerrar notificación"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body
  );
}
