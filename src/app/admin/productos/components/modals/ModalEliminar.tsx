import { createPortal } from 'react-dom';
import { Trash2, Loader2 } from 'lucide-react';
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center space-y-4">
          <div className="h-12 w-12 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="h-6 w-6 text-rose-600" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-gray-900">¿Eliminar producto?</h3>
            <p className="text-sm text-gray-500">
              Estás a punto de eliminar permanentemente{' '}
              <span className="font-semibold text-gray-800">"{producto.nombre}"</span>. Esta acción no se puede deshacer.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-3">
            <button type="button" onClick={onCancel}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-colors text-sm">
              Cancelar
            </button>
            <button type="button" onClick={onConfirm} disabled={isPending}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-sm transition-colors text-sm disabled:opacity-50 min-w-[100px]">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Eliminar</span>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
