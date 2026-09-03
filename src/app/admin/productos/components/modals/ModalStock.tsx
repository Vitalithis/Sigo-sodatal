import { createPortal } from 'react-dom';
import { X, Loader2, PackagePlus, PackageMinus } from 'lucide-react';
import { Producto } from '../hooks/useProductManager';

interface Props {
  isOpen: boolean;
  producto: Producto | null;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  cantidad: number | '';
  setCantidad: (v: number | '') => void;
  motivo: string;
  setMotivo: (v: string) => void;
  tipo: 'entrada' | 'salida';
  setTipo: (v: 'entrada' | 'salida') => void;
}

export function ModalStock({
  isOpen, producto, isPending, onSubmit, onClose,
  cantidad, setCantidad, motivo, setMotivo, tipo, setTipo,
}: Props) {
  if (!isOpen || !producto || typeof document === 'undefined') return null;

  const stockActual = producto.stock_fabrica?.cantidad ?? 0;
  const delta = cantidad !== '' ? (tipo === 'entrada' ? Number(cantidad) : -Number(cantidad)) : 0;
  const stockResultante = stockActual + delta;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 bg-[#283289] text-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold">Ajustar Stock</h3>
            <p className="text-xs text-blue-200 mt-0.5 truncate max-w-[280px]">{producto.nombre}</p>
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">

          {/* Stock actual */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3.5 border border-gray-100">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Stock actual</span>
            <span className="text-2xl font-black text-gray-800">{stockActual}</span>
          </div>

          {/* Tipo entrada/salida */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setTipo('entrada')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-bold text-sm transition-colors ${
                tipo === 'entrada'
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}>
              <PackagePlus className="h-4 w-4" />
              Entrada
            </button>
            <button type="button" onClick={() => setTipo('salida')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-bold text-sm transition-colors ${
                tipo === 'salida'
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}>
              <PackageMinus className="h-4 w-4" />
              Salida
            </button>
          </div>

          {/* Cantidad */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Cantidad *
            </label>
            <input type="number" min={1} required placeholder="0"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value === '' ? '' : Number(e.target.value))}
              className="block w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] focus:outline-none transition-all text-sm font-medium" />
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Motivo *
            </label>
            <input type="text" required placeholder="Ej: Producción del día, ajuste inventario..."
              value={motivo} onChange={(e) => setMotivo(e.target.value)}
              className="block w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] focus:outline-none transition-all text-sm" />
          </div>

          {/* Preview resultado */}
          {cantidad !== '' && (
            <div className={`flex items-center justify-between rounded-xl p-3.5 border ${
              stockResultante < 0
                ? 'bg-rose-50 border-rose-200'
                : stockResultante <= producto.stock_minimo
                ? 'bg-amber-50 border-amber-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <span className="text-xs font-bold text-gray-600">Stock resultante</span>
              <span className={`text-xl font-black ${
                stockResultante < 0 ? 'text-rose-600'
                : stockResultante <= producto.stock_minimo ? 'text-amber-600'
                : 'text-green-700'
              }`}>
                {stockResultante}
                {stockResultante <= producto.stock_minimo && stockResultante >= 0 && (
                  <span className="text-xs font-semibold ml-2">⚠ bajo mínimo</span>
                )}
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-colors text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={isPending || stockResultante < 0}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#283289] hover:bg-[#1e2670] text-white rounded-xl font-bold shadow-sm transition-colors text-sm disabled:opacity-50 min-w-[130px]">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Confirmar ajuste</span>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
