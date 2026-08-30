import { createPortal } from 'react-dom';
import { X, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { CategoriaProducto } from '@/lib/prisma/generated';
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 bg-[#283289] text-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold">
              {editingProducto ? 'Editar Producto' : 'Agregar Nuevo Producto'}
            </h3>
            <p className="text-xs text-blue-200 mt-0.5">
              {editingProducto ? 'Actualiza la información del producto' : 'Crea un nuevo registro para el catálogo'}
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Nombre del Producto *
            </label>
            <input type="text" required placeholder="Ej: Bidón de Agua Purificada 20L"
              value={nombre} onChange={(e) => setNombre(e.target.value)}
              className="block w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] focus:outline-none transition-all text-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Categoría *
            </label>
            <select required value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaProducto)}
              className="block w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-800 focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] focus:outline-none transition-all text-sm cursor-pointer font-medium">
              <option value="">Selecciona una categoría</option>
              <option value="BOTELLON20">Botellón 20 Litros</option>
              <option value="BOTELLON10">Botellón 10 Litros</option>
              <option value="SODA">Soda / Sifón</option>
              <option value="OTRO">Otro / Accesorios</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Precio Venta Nueva *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 text-sm font-semibold">$</span>
                <input type="number" required min="0" placeholder="Ej: 8000"
                  value={precioVentaNueva}
                  onChange={(e) => setPrecioVentaNueva(e.target.value !== '' ? Number(e.target.value) : '')}
                  className="block w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] focus:outline-none transition-all text-sm font-medium" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Precio Recarga <span className="text-gray-300 font-normal normal-case">(Opcional)</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 text-sm font-semibold">$</span>
                <input type="number" min="0" placeholder="Ej: 4000"
                  value={precioRecarga}
                  onChange={(e) => setPrecioRecarga(e.target.value !== '' ? Number(e.target.value) : '')}
                  className="block w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] focus:outline-none transition-all text-sm font-medium" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Stock Mínimo Alerta
            </label>
            <input type="number" min="0" placeholder="10"
              value={stockMinimo} onChange={(e) => setStockMinimo(Number(e.target.value))}
              className="block w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] focus:outline-none transition-all text-sm font-medium" />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <label className="block text-sm font-bold text-gray-800">Producto Activo</label>
              <p className="text-xs text-gray-500 mt-0.5">Determina si está disponible para la venta</p>
            </div>
            <button type="button" onClick={() => setActivo(!activo)}
              className="focus:outline-none transition-transform active:scale-95">
              {activo
                ? <ToggleRight className="h-10 w-10 text-[#283289] cursor-pointer" />
                : <ToggleLeft className="h-10 w-10 text-gray-400 cursor-pointer" />}
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-colors text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#283289] hover:bg-[#1e2670] text-white rounded-xl font-bold shadow-sm transition-colors text-sm disabled:opacity-50 min-w-[130px]">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>{editingProducto ? 'Guardar Cambios' : 'Crear Producto'}</span>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}