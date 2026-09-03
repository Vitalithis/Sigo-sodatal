'use client';

import { Check, AlertCircle, X, Search, Filter, ArrowUpDown, Package, Plus, Edit, Trash2, RefreshCw, Boxes } from 'lucide-react';
import { CategoriaProducto } from '@lib/prisma/generated';
import { useProductManager, Producto, UsuarioLite } from './hooks/useProductManager';
import { ModalProducto } from './modals/ModalProducto';
import { ModalEliminar } from './modals/ModalEliminar';
import { ModalConstraint } from './modals/ModalConstraint';
import { ModalStock } from './modals/ModalStock';

interface Props {
  initialProductos: Producto[];
  usuarioActualId: string;
}

const getCategoryName = (cat: CategoriaProducto) => {
  switch (cat) {
    case 'BOTELLON20': return 'Botellón 20L';
    case 'BOTELLON10': return 'Botellón 10L';
    case 'SODA': return 'Soda / Sifón';
    case 'OTRO': return 'Otros / Accesorios';
    default: return cat;
  }
};

export default function ProductManager({ initialProductos, usuarioActualId }: Props) {
  const pm = useProductManager(initialProductos, usuarioActualId);

  return (
    <>
      <div className="mb-6 space-y-4">

        {/* Toast */}
        {pm.notification && (
          <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border animate-in slide-in-from-top-4 duration-300 ${
            pm.notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {pm.notification.type === 'success'
              ? <Check className="h-5 w-5 text-emerald-600 shrink-0" />
              : <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />}
            <p className="text-sm font-semibold">{pm.notification.message}</p>
            <button onClick={() => pm.setNotification(null)} className="text-gray-400 hover:text-gray-600 ml-2">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tabs categoría */}
        <div className="flex gap-2 border-b border-gray-200">
          {['TODOS', 'BOTELLON20', 'BOTELLON10', 'SODA', 'OTRO'].map((cat) => (
            <button key={cat} onClick={() => pm.setCategoryFilter(cat)}
              className={`flex items-center h-10 px-4 text-xs font-bold rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                pm.categoryFilter === cat
                  ? 'border-[#283289] text-[#283289] bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              {cat === 'TODOS' ? 'Todos los Productos' : getCategoryName(cat as CategoriaProducto)}
            </button>
          ))}
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
                <input type="text" placeholder="Buscar producto por nombre..."
                  value={pm.searchQuery} onChange={(e) => pm.setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] focus:outline-none transition-all text-xs" />
                {pm.searchQuery && (
                  <button onClick={() => pm.setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="md:col-span-3">
                <select value={pm.statusFilter} onChange={(e) => pm.setStatusFilter(e.target.value)}
                  className="block w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-xs focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] focus:outline-none transition-all cursor-pointer font-medium">
                  <option value="TODOS">Todos los Estados</option>
                  <option value="ACTIVOS">Solo Activos</option>
                  <option value="INACTIVOS">Solo Inactivos</option>
                </select>
              </div>
              <div className="md:col-span-4 relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <ArrowUpDown className="h-4 w-4" />
                </span>
                <select value={pm.sortBy} onChange={(e) => pm.setSortBy(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-xs focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] focus:outline-none transition-all cursor-pointer font-medium">
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

        {/* Tabla */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Package className="h-4 w-4 text-[#283289]" />
              Resultados ({pm.filteredAndSortedProductos.length})
            </h2>
            <div className="flex items-center gap-3">
              {pm.isPending && (
                <span className="flex items-center gap-1.5 text-xs text-[#283289] font-semibold bg-blue-50 px-2.5 py-1 rounded-full animate-pulse border border-blue-100">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Actualizando...
                </span>
              )}
              <button onClick={() => { pm.setEditingProducto(null); pm.setIsFormOpen(true); }}
                className="flex items-center gap-2 bg-[#283289] hover:bg-[#1e2670] text-white px-4 py-2 rounded-xl font-bold shadow-sm transition-all text-xs">
                <Plus className="h-3.5 w-3.5" />
                Agregar Producto
              </button>
            </div>
          </div>

          {pm.filteredAndSortedProductos.length === 0 ? (
            <div className="p-16 text-center">
              <Package className="h-12 w-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-700 font-bold text-base">No se encontraron productos</p>
              <p className="text-gray-400 text-xs mt-1">No hay productos que coincidan con los filtros aplicados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-400 uppercase text-[10px] tracking-wider bg-gray-50/70 border-b border-gray-100">
                    <th className="px-5 py-3 font-bold">Nombre</th>
                    <th className="px-3 py-3 font-bold">Categoría</th>
                    <th className="px-3 py-3 font-bold">Precio Venta</th>
                    <th className="px-3 py-3 font-bold">Precio Recarga</th>
                    <th className="px-3 py-3 font-bold text-center">Stock Mín.</th>
                    <th className="px-3 py-3 font-bold text-center">Stock Fabrica</th>
                    <th className="px-3 py-3 font-bold">Estado</th>
                    <th className="px-5 py-3 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pm.filteredAndSortedProductos.map((prod) => {
                    const stockFabrica = prod.stock_fabrica?.cantidad ?? 0;
                    const stockBajo = stockFabrica <= prod.stock_minimo;
                    return (
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
                          {prod.precio_recarga !== null
                            ? <span className="font-semibold text-gray-600">${prod.precio_recarga.toLocaleString('es-CL')}</span>
                            : <span className="text-gray-400 italic text-[10px]">No aplica</span>}
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-medium text-gray-600">{prod.stock_minimo}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`font-black font-mono ${stockBajo ? 'text-rose-600' : 'text-gray-700'}`}>
                            {stockFabrica}
                            {stockBajo && <span className="ml-1 text-[9px] font-bold text-rose-500">⚠</span>}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${
                            prod.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${prod.activo ? 'bg-green-500' : 'bg-gray-400'}`} />
                            {prod.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { pm.setStockProducto(prod); pm.setIsStockOpen(true); }}
                              title="Ajustar stock"
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors">
                              <Boxes className="h-4 w-4" />
                            </button>
                            <button onClick={() => { pm.setEditingProducto(prod); pm.setIsFormOpen(true); }}
                              title="Editar producto"
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button onClick={() => { pm.setDeletingProducto(prod); pm.setIsDeleteOpen(true); }}
                              title="Eliminar producto"
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ModalProducto
        isOpen={pm.isFormOpen} onClose={() => pm.setIsFormOpen(false)}
        editingProducto={pm.editingProducto} isPending={pm.isPending}
        onSubmit={pm.handleSubmit}
        nombre={pm.nombre} setNombre={pm.setNombre}
        categoria={pm.categoria} setCategoria={pm.setCategoria}
        precioVentaNueva={pm.precioVentaNueva} setPrecioVentaNueva={pm.setPrecioVentaNueva}
        precioRecarga={pm.precioRecarga} setPrecioRecarga={pm.setPrecioRecarga}
        stockMinimo={pm.stockMinimo} setStockMinimo={pm.setStockMinimo}
        activo={pm.activo} setActivo={pm.setActivo}
      />
      <ModalEliminar
        isOpen={pm.isDeleteOpen} producto={pm.deletingProducto}
        isPending={pm.isPending} onConfirm={pm.handleDeleteConfirm}
        onCancel={() => { pm.setIsDeleteOpen(false); pm.setDeletingProducto(null); }}
      />
      <ModalConstraint
        isOpen={pm.isConstraintOpen} producto={pm.blockedProducto}
        isPending={pm.isPending} onDesactivar={pm.handleDeactivateInstead}
        onCancel={() => { pm.setIsConstraintOpen(false); pm.setBlockedProducto(null); }}
      />
      <ModalStock
        isOpen={pm.isStockOpen} producto={pm.stockProducto}
        isPending={pm.isPending} onSubmit={pm.handleAjustarStock}
        onClose={() => { pm.setIsStockOpen(false); pm.setStockProducto(null); }}
        cantidad={pm.stockCantidad} setCantidad={pm.setStockCantidad}
        motivo={pm.stockMotivo} setMotivo={pm.setStockMotivo}
        tipo={pm.stockTipo} setTipo={pm.setStockTipo}
      />
    </>
  );
}
