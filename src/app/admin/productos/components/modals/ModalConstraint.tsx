import { createPortal } from 'react-dom';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 space-y-4">
          <div className="h-12 w-12 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <div className="space-y-1.5 text-center">
            <h3 className="text-base font-bold text-gray-900">No se puede eliminar el producto</h3>
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-800">"{producto.nombre}"</span> está vinculado a transacciones existentes y no puede eliminarse.
            </p>
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 mt-2 text-left">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-[#283289]" />
                Recomendación
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Desactiva el producto para que no aparezca en las ventas, manteniendo la consistencia histórica.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 pt-3">
            <button type="button" onClick={onCancel}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-colors text-sm">
              Mantener Activo
            </button>
            <button type="button" onClick={onDesactivar} disabled={isPending}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-sm transition-colors text-sm disabled:opacity-50 min-w-[140px]">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Desactivar Producto</span>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}