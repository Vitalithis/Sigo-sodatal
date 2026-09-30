import { createPortal } from 'react-dom';
import { AlertTriangle, Info, Loader2, X } from 'lucide-react';
import { Producto } from '../hooks/useProductManager';

interface Props {
  isOpen: boolean;
  producto: Producto | null;
  isPending: boolean;
  onDesactivar: () => void;
  onCancel: () => void;
}

export function ModalConstraint({ isOpen, producto, isPending, onDesactivar, onCancel }: Props) {
  if (!isOpen || !producto || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="bg-amber-600 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">No se puede eliminar</h3>
              <p className="text-xs text-amber-100">Producto con transacciones vinculadas</p>
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
          <p className="text-xs text-slate-600">
            <span className="font-bold text-slate-800">"{producto.nombre}"</span> está vinculado a transacciones existentes y no puede eliminarse permanentemente.
          </p>

          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 space-y-1">
            <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-amber-600" />
              Recomendación:
            </p>
            <p className="text-xs text-amber-900 leading-relaxed">
              Desactiva el producto para que no aparezca en las ventas futuras, manteniendo intacta la consistencia de los registros históricos.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              Mantener Activo
            </button>
            <button
              type="button"
              onClick={onDesactivar}
              disabled={isPending}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md shadow-amber-600/20 hover:shadow-none transition-all text-xs disabled:opacity-50 min-w-[140px]"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Desactivar Producto</span>}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
