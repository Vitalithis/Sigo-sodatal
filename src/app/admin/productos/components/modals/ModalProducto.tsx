import { createPortal } from 'react-dom';
import { X, Loader2, ToggleLeft, ToggleRight, Package } from 'lucide-react';
import { CategoriaProducto } from '@lib/prisma/generated';
import { Producto } from '../hooks/useProductManager';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingProducto: Producto | null;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
  nombre: string; setNombre: (v: string) => void;
  categoria: CategoriaProducto | ''; setCategoria: (v: CategoriaProducto | '') => void;
  precioVentaNueva: number | ''; setPrecioVentaNueva: (v: number | '') => void;
  precioRecarga: number | ''; setPrecioRecarga: (v: number | '') => void;
  stockMinimo: number; setStockMinimo: (v: number) => void;
  activo: boolean; setActivo: (v: boolean) => void;
}

export function ModalProducto({
  isOpen, onClose, editingProducto, isPending, onSubmit,
  nombre, setNombre, categoria, setCategoria,
  precioVentaNueva, setPrecioVentaNueva,
  precioRecarga, setPrecioRecarga,
  stockMinimo, setStockMinimo, activo, setActivo,
}: Props) {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="px-6 py-4 bg-[#013299] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">
                {editingProducto ? 'Editar Producto' : 'Agregar Nuevo Producto'}
              </h3>
              <p className="text-xs text-blue-100">
                {editingProducto ? 'Actualiza la información del producto' : 'Crea un nuevo registro para el catálogo'}
              </p>
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
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Nombre del Producto *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Bidón de Agua Purificada 20L"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="block w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] focus:outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Categoría *
            </label>
            <select
              required
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaProducto)}
              className="block w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] focus:outline-none transition-all text-sm cursor-pointer font-medium"
            >
              <option value="">Selecciona una categoría</option>
              <option value="BOTELLON20">Botellón 20 Litros</option>
              <option value="BOTELLON10">Botellón 10 Litros</option>
              <option value="SODA">Soda / Sifón</option>
              <option value="OTRO">Otro / Accesorios</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Precio Venta Nueva *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm font-semibold">$</span>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="Ej: 8000"
                  value={precioVentaNueva}
                  onChange={(e) => setPrecioVentaNueva(e.target.value !== '' ? Number(e.target.value) : '')}
                  className="block w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] focus:outline-none transition-all text-sm font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Precio Recarga <span className="text-slate-400 font-normal normal-case">(Opcional)</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm font-semibold">$</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Ej: 4000"
                  value={precioRecarga}
                  onChange={(e) => setPrecioRecarga(e.target.value !== '' ? Number(e.target.value) : '')}
                  className="block w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] focus:outline-none transition-all text-sm font-semibold"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Stock Mínimo Alerta
            </label>
            <input
              type="number"
              min="0"
              placeholder="10"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(Number(e.target.value))}
              className="block w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] focus:outline-none transition-all text-sm font-medium"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70">
            <div>
              <label className="block text-sm font-bold text-slate-800">Producto Activo</label>
              <p className="text-xs text-slate-500 mt-0.5">Determina si está disponible para la venta</p>
            </div>
            <button
              type="button"
              onClick={() => setActivo(!activo)}
              className="focus:outline-none transition-transform active:scale-95"
            >
              {activo ? (
                <ToggleRight className="h-10 w-10 text-[#013299] cursor-pointer" />
              ) : (
                <ToggleLeft className="h-10 w-10 text-slate-400 cursor-pointer" />
              )}
            </button>
          </div>

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
              disabled={isPending}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#013299] hover:bg-blue-900 text-white rounded-xl font-bold shadow-md shadow-[#013299]/20 hover:shadow-none transition-all text-xs disabled:opacity-50 min-w-[130px]"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>{editingProducto ? 'Guardar Cambios' : 'Crear Producto'}</span>}
            </button>
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
}
