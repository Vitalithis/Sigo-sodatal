import { createPortal } from 'react-dom';
import { Trash2, Loader2, X } from 'lucide-react';
import { Producto } from '../hooks/useProductManager';

interface Props {
  isOpen: boolean;
  producto: Producto | null;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ModalEliminar({ isOpen, producto, isPending, onConfirm, onCancel }: Props) {
  if (!isOpen || !producto || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="bg-rose-600 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Eliminar Producto</h3>
              <p className="text-xs text-rose-100">Esta acción no se puede deshacer</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-rose-50/70 border border-rose-100 p-4 rounded-xl text-slate-700 text-xs leading-relaxed">
            Estás a punto de eliminar permanentemente el producto{' '}
            <span className="font-bold text-rose-800">"{producto.nombre}"</span> del catálogo.
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md shadow-rose-600/20 hover:shadow-none transition-all text-xs disabled:opacity-50 min-w-[110px]"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Eliminar</span>}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
