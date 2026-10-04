'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { PopupState } from '@/hooks/usePopup';

export default function PopupGlobal({ popup, onClose }: { popup: PopupState; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!popup.show || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm !m-0 !top-0 !left-0 !right-0 !bottom-0">
      <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center space-y-4 border border-slate-100 !m-0">
        <div className="flex justify-center">
          {popup.type === 'success' && <CheckCircle className="h-10 w-10 text-emerald-500" />}
          {popup.type === 'error'   && <XCircle    className="h-10 w-10 text-rose-500"    />}
          {popup.type === 'confirm' && <AlertTriangle className="h-10 w-10 text-amber-500" />}
        </div>
        <div>
          <h4 className="font-bold text-slate-900 text-base">{popup.title}</h4>
          <p className="text-xs text-slate-500 mt-1">{popup.message}</p>
        </div>
        <div className="flex justify-center gap-2 pt-1">
          {popup.type === 'confirm' ? (
            <>
              <button onClick={popup.onConfirm} className="text-white px-5 py-2 rounded-xl text-xs font-bold" style={{ backgroundColor: '#013299' }}>Confirmar</button>
              <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded-xl text-xs font-semibold">Cancelar</button>
            </>
          ) : (
            <button onClick={onClose} className="text-white px-6 py-2 rounded-xl text-xs font-bold" style={{ backgroundColor: '#013299' }}>Entendido</button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
