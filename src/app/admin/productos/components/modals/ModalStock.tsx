import { createPortal } from 'react-dom';
import { X, Loader2, PackagePlus, PackageMinus, Boxes } from 'lucide-react';
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="px-6 py-4 bg-[#013299] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Ajustar Stock de Fábrica</h3>
              <p className="text-xs text-blue-100 truncate max-w-[240px]">{producto.nombre}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">

          {/* Stock actual */}
          <div className="flex items-center justify-between bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stock actual</span>
            <span className="text-2xl font-black text-slate-900">{stockActual}</span>
          </div>

          {/* Tipo entrada/salida */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTipo('entrada')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-bold text-xs transition-all ${
                tipo === 'entrada'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <PackagePlus className="h-4 w-4" />
              Entrada
            </button>

            <button
              type="button"
              onClick={() => setTipo('salida')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-bold text-xs transition-all ${
                tipo === 'salida'
                  ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <PackageMinus className="h-4 w-4" />
              Salida
            </button>
          </div>

          {/* Cantidad */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Cantidad *
            </label>
            <input
              type="number"
              min={1}
              required
              placeholder="0"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value === '' ? '' : Number(e.target.value))}
              className="block w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] focus:outline-none transition-all text-sm font-semibold"
            />
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Motivo *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Producción del día, ajuste inventario..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="block w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] focus:outline-none transition-all text-sm"
            />
          </div>

          {/* Preview resultado */}
          {cantidad !== '' && (
            <div className={`flex items-center justify-between rounded-xl p-3.5 border ${
              stockResultante < 0
                ? 'bg-rose-50 border-rose-200'
                : stockResultante <= producto.stock_minimo
                ? 'bg-amber-50 border-amber-200'
                : 'bg-emerald-50 border-emerald-200'
            }`}>
              <span className="text-xs font-bold text-slate-600">Stock resultante</span>
              <span className={`text-xl font-black ${
                stockResultante < 0 
                  ? 'text-rose-600'
                  : stockResultante <= producto.stock_minimo 
                  ? 'text-amber-600'
                  : 'text-emerald-700'
              }`}>
                {stockResultante}
                {stockResultante <= producto.stock_minimo && stockResultante >= 0 && (
                  <span className="text-xs font-semibold ml-2">⚠ bajo mínimo</span>
                )}
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || stockResultante < 0}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#013299] hover:bg-blue-900 text-white rounded-xl font-bold shadow-md shadow-[#013299]/20 hover:shadow-none transition-all text-xs disabled:opacity-50 min-w-[130px]"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Confirmar ajuste</span>}
            </button>
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
}
