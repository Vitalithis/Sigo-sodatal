'use client';
import { createPortal } from 'react-dom';
import React, { useState, useTransition, useMemo, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Search, X, Check, Loader2, AlertTriangle, 
  Package, ToggleLeft, ToggleRight, AlertCircle, RefreshCw, Info,
  ArrowUpDown, Filter
} from 'lucide-react';
import { CategoriaProducto } from '@/lib/prisma/generated';
import { 
  crearProductoAction, 
  editarProductoAction, 
  eliminarProductoAction, 
  desactivarProductoAction,
  ProductoInput 
} from '../actions';

interface Producto {
  id: string;
  nombre: string;
  categoria: CategoriaProducto;
  precio_venta_nueva: number;
  precio_recarga: number | null;
  stock_minimo: number;
  activo: boolean;
}

interface ProductManagerProps {
  initialProductos: Producto[];
}

export default function ProductManager({ initialProductos }: ProductManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('TODOS');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [sortBy, setSortBy] = useState<string>('nombre-asc');

  const [isPending, startTransition] = useTransition();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingProducto, setDeletingProducto] = useState<Producto | null>(null);

  const [isConstraintOpen, setIsConstraintOpen] = useState(false);
  const [blockedProducto, setBlockedProducto] = useState<Producto | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState<CategoriaProducto | ''>('');
  const [precioVentaNueva, setPrecioVentaNueva] = useState<number | ''>('');
  const [precioRecarga, setPrecioRecarga] = useState<number | ''>('');
  const [stockMinimo, setStockMinimo] = useState<number>(10);
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    if (editingProducto) {
      setNombre(editingProducto.nombre);
      setCategoria(editingProducto.categoria);
      setPrecioVentaNueva(editingProducto.precio_venta_nueva);
      setPrecioRecarga(editingProducto.precio_recarga !== null ? editingProducto.precio_recarga : '');
      setStockMinimo(editingProducto.stock_minimo);
      setActivo(editingProducto.activo);
    } else {
      setNombre('');
      setCategoria('');
      setPrecioVentaNueva('');
      setPrecioRecarga('');
      setStockMinimo(10);
      setActivo(true);
    }
  }, [editingProducto, isFormOpen]);

  const filteredAndSortedProductos = useMemo(() => {
    let list = initialProductos.filter((prod) => {
      const matchesSearch = prod.nombre.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'TODOS' || prod.categoria === categoryFilter;
      let matchesStatus = true;
      if (statusFilter === 'ACTIVOS') matchesStatus = prod.activo === true;
      if (statusFilter === 'INACTIVOS') matchesStatus = prod.activo === false;
      return matchesSearch && matchesCategory && matchesStatus;
    });

    list.sort((a, b) => {
      if (sortBy === 'nombre-asc') return a.nombre.localeCompare(b.nombre);
      if (sortBy === 'nombre-desc') return b.nombre.localeCompare(a.nombre);
      if (sortBy === 'precio-asc') return a.precio_venta_nueva - b.precio_venta_nueva;
      if (sortBy === 'precio-desc') return b.precio_venta_nueva - a.precio_venta_nueva;
      if (sortBy === 'stock-asc') return a.stock_minimo - b.stock_minimo;
      if (sortBy === 'stock-desc') return b.stock_minimo - a.stock_minimo;
      return 0;
    });

    return list;
  }, [initialProductos, searchQuery, categoryFilter, statusFilter, sortBy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !categoria || precioVentaNueva === '') {
      setNotification({ type: 'error', message: 'Por favor completa los campos obligatorios.' });
      return;
    }

    const payload: ProductoInput = {
      nombre,
      categoria: categoria as CategoriaProducto,
      precio_venta_nueva: Number(precioVentaNueva),
      precio_recarga: precioRecarga !== '' ? Number(precioRecarga) : undefined,
      stock_minimo: Number(stockMinimo),
      activo,
    };

    startTransition(async () => {
      let res;
      if (editingProducto) {
        res = await editarProductoAction(editingProducto.id, payload);
      } else {
        res = await crearProductoAction(payload);
      }

      if (res.success) {
        setNotification({
          type: 'success',
          message: editingProducto ? 'Producto modificado correctamente.' : 'Producto agregado correctamente.',
        });
        setIsFormOpen(false);
        setEditingProducto(null);
      } else {
        setNotification({ type: 'error', message: res.message || 'Ocurrió un error inesperado.' });
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!deletingProducto) return;
    startTransition(async () => {
      const res = await eliminarProductoAction(deletingProducto.id);
      setIsDeleteOpen(false);
      if (res.success) {
        setNotification({ type: 'success', message: 'Producto eliminado correctamente.' });
        setDeletingProducto(null);
      } else if (res.errorType === 'FOREIGN_KEY_VIOLATION') {
        setBlockedProducto(deletingProducto);
        setIsConstraintOpen(true);
        setDeletingProducto(null);
      } else {
        setNotification({ type: 'error', message: res.message || 'Error al eliminar el producto.' });
        setDeletingProducto(null);
      }
    });
  };

  const handleDeactivateInstead = () => {
    if (!blockedProducto) return;
    startTransition(async () => {
      const res = await desactivarProductoAction(blockedProducto.id);
      setIsConstraintOpen(false);
      if (res.success) {
        setNotification({ type: 'success', message: 'Producto desactivado correctamente.' });
        setBlockedProducto(null);
      } else {
        setNotification({ type: 'error', message: res.message || 'Error al desactivar el producto.' });
        setBlockedProducto(null);
      }
    });
  };

  const getCategoryName = (cat: CategoriaProducto) => {
    switch (cat) {
      case 'BOTELLON20': return 'Botellón 20L';
      case 'BOTELLON10': return 'Botellón 10L';
      case 'SODA': return 'Soda / Sifón';
      case 'OTRO': return 'Otros / Accesorios';
      default: return cat;
    }
  };

    return (
    <>
      <div className="mb-6">

        {/* Toast de notificación */}
        {notification && (
          <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border animate-in slide-in-from-top-4 duration-300 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {notification.type === 'success'
              ? <Check className="h-5 w-5 text-emerald-600 shrink-0" />
              : <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />}
            <p className="text-sm font-semibold">{notification.message}</p>
            <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600 ml-2">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tabs de categoría */}
        <div className="flex gap-2 border-b border-gray-200">
          {['TODOS', 'BOTELLON20', 'BOTELLON10', 'SODA', 'OTRO'].map((cat) => {
            const isActive = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`flex items-center h-10 px-4 text-xs font-bold rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-[#283289] text-[#283289] bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {cat === 'TODOS' ? 'Todos los Productos' : getCategoryName(cat as CategoriaProducto)}
              </button>
            );
          })}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#283289]" />
            <h3 className="text-sm font-bold text-gray-800">Filtros y Búsqueda</h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5 relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="Buscar producto por nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] focus:outline-none transition-all text-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="md:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-xs focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] focus:outline-none transition-all cursor-pointer font-medium"
                >
                  <option value="TODOS">Todos los Estados</option>
                  <option value="ACTIVOS">Solo Activos</option>
                  <option value="INACTIVOS">Solo Inactivos</option>
                </select>
              </div>

              <div className="md:col-span-4 relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <ArrowUpDown className="h-4 w-4" />
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-xs focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] focus:outline-none transition-all cursor-pointer font-medium"
                >
                  <option value="nombre-asc">Nombre: A - Z</option>
                  <option value="nombre-desc">Nombre: Z - A</option>
                  <option value="precio-asc">Precio Venta: Menor a Mayor</option>
                  <option value="precio-desc">Precio Venta: Mayor a Menor</option>
                  <option value="stock-asc">Stock Mínimo: Menor a Mayor</option>
                  <option value="stock-desc">Stock Mínimo: Mayor a Menor</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de productos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Package className="h-4 w-4 text-[#283289]" />
              Resultados ({filteredAndSortedProductos.length})
            </h2>
            <div className="flex items-center gap-3">
              {isPending && (
                <span className="flex items-center gap-1.5 text-xs text-[#283289] font-semibold bg-blue-50 px-2.5 py-1 rounded-full animate-pulse border border-blue-100">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Actualizando...
                </span>
              )}
              <button
                onClick={() => {
                  setEditingProducto(null);
                  setIsFormOpen(true);
                }}
                className="flex items-center gap-2 bg-[#283289] hover:bg-[#1e2670] active:bg-[#151b4d] text-white px-4 py-2 rounded-xl font-bold shadow-sm transition-all text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar Producto
              </button>
            </div>
          </div>

          {filteredAndSortedProductos.length === 0 ? (
            <div className="p-16 text-center">
              <Package className="h-12 w-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-700 font-bold text-base">No se encontraron productos</p>
              <p className="text-gray-400 text-xs mt-1 max-w-md mx-auto">
                No hay productos que coincidan con la búsqueda o filtros aplicados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-400 uppercase text-[10px] tracking-wider bg-gray-50/70 border-b border-gray-100">
                    <th className="px-5 py-3 font-bold">Nombre del Producto</th>
                    <th className="px-3 py-3 font-bold">Categoría</th>
                    <th className="px-3 py-3 font-bold">Precio Venta</th>
                    <th className="px-3 py-3 font-bold">Precio Recarga</th>
                    <th className="px-3 py-3 font-bold text-center">Stock Mínimo</th>
                    <th className="px-3 py-3 font-bold">Estado</th>
                    <th className="px-5 py-3 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedProductos.map((prod) => (
                    <tr key={prod.id} className="border-t border-gray-50 hover:bg-slate-50 transition-colors group">
                      <td className="px-5 py-3 font-bold text-gray-900">{prod.nombre}</td>
                      <td className="px-3 py-3">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                          {getCategoryName(prod.categoria)}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-[#283289]">
                        ${prod.precio_venta_nueva.toLocaleString('es-CL')}
                      </td>
                      <td className="px-3 py-3">
                        {prod.precio_recarga !== null ? (
                          <span className="font-semibold text-gray-600">${prod.precio_recarga.toLocaleString('es-CL')}</span>
                        ) : (
                          <span className="text-gray-400 italic text-[10px]">No aplica</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center font-mono font-medium text-gray-600">{prod.stock_minimo}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${
                          prod.activo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${prod.activo ? 'bg-green-500' : 'bg-gray-400'}`} />
                          {prod.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingProducto(prod);
                              setIsFormOpen(true);
                            }}
                            title="Editar producto"
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingProducto(prod);
                              setIsDeleteOpen(true);
                            }}
                            title="Eliminar producto"
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

{/* MODAL: Crear / Editar Producto */}
      {isFormOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5 bg-[#283289] text-white flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold">
                    {editingProducto ? 'Editar Producto' : 'Agregar Nuevo Producto'}
                  </h3>
                  <p className="text-xs text-blue-200 mt-0.5">
                    {editingProducto
                      ? 'Actualiza la información del producto en el sistema'
                      : 'Crea un nuevo registro para el catálogo'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Nombre del Producto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Bidón de Agua Purificada 20L"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="block w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] focus:outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Categoría *
                  </label>
                  <select
                    required
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as CategoriaProducto)}
                    className="block w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-800 focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] focus:outline-none transition-all text-sm cursor-pointer font-medium"
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Precio Venta Nueva *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 text-sm font-semibold">
                        $
                      </span>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="Ej: 8000"
                        value={precioVentaNueva}
                        onChange={(e) =>
                          setPrecioVentaNueva(e.target.value !== '' ? Number(e.target.value) : '')
                        }
                        className="block w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] focus:outline-none transition-all text-sm font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Precio Recarga{' '}
                      <span className="text-gray-300 font-normal normal-case">(Opcional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 text-sm font-semibold">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ej: 4000"
                        value={precioRecarga}
                        onChange={(e) =>
                          setPrecioRecarga(e.target.value !== '' ? Number(e.target.value) : '')
                        }
                        className="block w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] focus:outline-none transition-all text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Stock Mínimo Alerta
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="10"
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(Number(e.target.value))}
                    className="block w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] focus:outline-none transition-all text-sm font-medium"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <label className="block text-sm font-bold text-gray-800">Producto Activo</label>
                    <p className="text-xs text-gray-500 mt-0.5">Determina si está disponible para la venta</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivo(!activo)}
                    className="focus:outline-none transition-transform active:scale-95"
                  >
                    {activo ? (
                      <ToggleRight className="h-10 w-10 text-[#283289] cursor-pointer" />
                    ) : (
                      <ToggleLeft className="h-10 w-10 text-gray-400 cursor-pointer" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#283289] hover:bg-[#1e2670] active:bg-[#151b4d] text-white rounded-xl font-bold shadow-sm transition-colors text-sm disabled:opacity-50 min-w-[130px]"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span>{editingProducto ? 'Guardar Cambios' : 'Crear Producto'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL: Confirmación de Eliminación */}
      {isDeleteOpen &&
        deletingProducto &&
        typeof document !== 'undefined' &&
        createPortal(
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
                    <span className="font-semibold text-gray-800">"{deletingProducto.nombre}"</span>. Esta
                    acción no se puede deshacer.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteOpen(false);
                      setDeletingProducto(null);
                    }}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={isPending}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-sm transition-colors text-sm disabled:opacity-50 min-w-[100px]"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Eliminar</span>}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL: Advertencia de clave foránea */}
      {isConstraintOpen &&
        blockedProducto &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 space-y-4">
                <div className="h-12 w-12 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div className="space-y-1.5 text-center">
                  <h3 className="text-base font-bold text-gray-900">No se puede eliminar el producto</h3>
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-800">"{blockedProducto.nombre}"</span> está
                    vinculado a transacciones existentes y no puede eliminarse.
                  </p>
                  <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 mt-2 text-left">
                    <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-[#283289]" />
                      Recomendación
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Desactiva el producto para que no aparezca en las ventas, manteniendo la consistencia
                      histórica.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsConstraintOpen(false);
                      setBlockedProducto(null);
                    }}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-colors text-sm"
                  >
                    Mantener Activo
                  </button>
                  <button
                    type="button"
                    onClick={handleDeactivateInstead}
                    disabled={isPending}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-sm transition-colors text-sm disabled:opacity-50 min-w-[140px]"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span>Desactivar Producto</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
    )}
    </>
  );
}