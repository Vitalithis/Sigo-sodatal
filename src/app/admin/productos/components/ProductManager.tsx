'use client';

import React, { useMemo } from 'react';
import { 
  Check, 
  AlertCircle, 
  X, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Boxes,
  AlertTriangle,
  Tag,
  CheckCircle2
} from 'lucide-react';
import { CategoriaProducto } from '@lib/prisma/generated';
import { useProductManager, Producto } from './hooks/useProductManager';
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

  // Métricas rápidas
  const totalProductos = initialProductos.length;
  const activosCount = useMemo(() => initialProductos.filter((p) => p.activo).length, [initialProductos]);
  const stockCriticoCount = useMemo(() => {
    return initialProductos.filter((p) => {
      const cant = p.stock_fabrica?.cantidad ?? 0;
      return cant <= p.stock_minimo;
    }).length;
  }, [initialProductos]);

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {pm.notification && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border animate-in slide-in-from-top-4 duration-300 ${
          pm.notification.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {pm.notification.type === 'success'
            ? <Check className="h-5 w-5 text-emerald-600 shrink-0" />
            : <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />}
          <p className="text-sm font-semibold">{pm.notification.message}</p>
          <button onClick={() => pm.setNotification(null)} className="text-slate-400 hover:text-slate-600 ml-2">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Productos</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalProductos}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-[#013299]">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Productos Activos</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{activosCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stock Crítico</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stockCriticoCount}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs por Categoría */}
      <div className="flex flex-wrap gap-2">
        {['TODOS', 'BOTELLON20', 'BOTELLON10', 'SODA', 'OTRO'].map((cat) => {
          const isActive = pm.categoryFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => pm.setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#013299] text-white shadow-md shadow-[#013299]/20'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
              }`}
            >
              <Tag className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {cat === 'TODOS' ? 'Todos los Productos' : getCategoryName(cat as CategoriaProducto)}
            </button>
          );
        })}
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Search input */}
          <div className="md:col-span-5 relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Buscar producto por nombre..."
              value={pm.searchQuery}
              onChange={(e) => pm.setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] focus:outline-none transition-all text-xs"
            />
            {pm.searchQuery && (
              <button
                onClick={() => pm.setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="md:col-span-3">
            <select
              value={pm.statusFilter}
              onChange={(e) => pm.setStatusFilter(e.target.value)}
              className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] focus:outline-none transition-all cursor-pointer font-medium"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="ACTIVOS">Solo Activos</option>
              <option value="INACTIVOS">Solo Inactivos</option>
            </select>
          </div>

          {/* Sort dropdown */}
          <div className="md:col-span-4 relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <ArrowUpDown className="h-4 w-4" />
            </span>
            <select
              value={pm.sortBy}
              onChange={(e) => pm.setSortBy(e.target.value)}
              className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] focus:outline-none transition-all cursor-pointer font-medium"
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

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Package className="h-4 w-4 text-[#013299]" />
            Resultados ({pm.filteredAndSortedProductos.length})
          </h2>

          <div className="flex items-center gap-3">
            {pm.isPending && (
              <span className="flex items-center gap-1.5 text-xs text-[#013299] font-semibold bg-blue-50 px-2.5 py-1 rounded-full animate-pulse border border-blue-100">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Actualizando...
              </span>
            )}

            <button
              onClick={() => { pm.setEditingProducto(null); pm.setIsFormOpen(true); }}
              className="flex items-center gap-2 bg-[#013299] hover:bg-blue-900 text-white px-4 py-2.5 rounded-xl font-bold shadow-md shadow-[#013299]/20 hover:shadow-none transition-all text-xs"
            >
              <Plus className="h-4 w-4" />
              Agregar Producto
            </button>
          </div>
        </div>

        {pm.filteredAndSortedProductos.length === 0 ? (
          <div className="p-16 text-center">
            <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-800 font-bold text-base">No se encontraron productos</p>
            <p className="text-slate-400 text-xs mt-1">No hay productos que coincidan con los filtros aplicados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-3.5">Nombre</th>
                  <th className="px-3 py-3.5">Categoría</th>
                  <th className="px-3 py-3.5">Precio Venta</th>
                  <th className="px-3 py-3.5">Precio Recarga</th>
                  <th className="px-3 py-3.5 text-center">Stock Mín.</th>
                  <th className="px-3 py-3.5 text-center">Stock Fábrica</th>
                  <th className="px-3 py-3.5">Estado</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pm.filteredAndSortedProductos.map((prod) => {
                  const stockFabrica = prod.stock_fabrica?.cantidad ?? 0;
                  const stockBajo = stockFabrica <= prod.stock_minimo;
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{prod.nombre}</td>
                      <td className="px-3 py-3.5">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {getCategoryName(prod.categoria)}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 font-bold text-[#013299]">
                        ${prod.precio_venta_nueva.toLocaleString('es-CL')}
                      </td>
                      <td className="px-3 py-3.5">
                        {prod.precio_recarga !== null ? (
                          <span className="font-semibold text-slate-700">${prod.precio_recarga.toLocaleString('es-CL')}</span>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">No aplica</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono font-semibold text-slate-600">
                        {prod.stock_minimo}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 font-mono font-extrabold px-2 py-0.5 rounded-md ${
                          stockBajo 
                            ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                            : 'text-slate-800'
                        }`}>
                          {stockFabrica}
                          {stockBajo && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                          prod.activo 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${prod.activo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {prod.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { pm.setStockProducto(prod); pm.setIsStockOpen(true); }}
                            title="Ajustar stock"
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Boxes className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { pm.setEditingProducto(prod); pm.setIsFormOpen(true); }}
                            title="Editar producto"
                            className="p-1.5 text-[#013299] hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { pm.setDeletingProducto(prod); pm.setIsDeleteOpen(true); }}
                            title="Eliminar producto"
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                          >
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

      <ModalProducto
        isOpen={pm.isFormOpen}
        onClose={() => pm.setIsFormOpen(false)}
        editingProducto={pm.editingProducto}
        isPending={pm.isPending}
        onSubmit={pm.handleSubmit}
        nombre={pm.nombre}
        setNombre={pm.setNombre}
        categoria={pm.categoria}
        setCategoria={pm.setCategoria}
        precioVentaNueva={pm.precioVentaNueva}
        setPrecioVentaNueva={pm.setPrecioVentaNueva}
        precioRecarga={pm.precioRecarga}
        setPrecioRecarga={pm.setPrecioRecarga}
        stockMinimo={pm.stockMinimo}
        setStockMinimo={pm.setStockMinimo}
        activo={pm.activo}
        setActivo={pm.setActivo}
      />
      <ModalEliminar
        isOpen={pm.isDeleteOpen}
        producto={pm.deletingProducto}
        isPending={pm.isPending}
        onConfirm={pm.handleDeleteConfirm}
        onCancel={() => { pm.setIsDeleteOpen(false); pm.setDeletingProducto(null); }}
      />
      <ModalConstraint
        isOpen={pm.isConstraintOpen}
        producto={pm.blockedProducto}
        isPending={pm.isPending}
        onDesactivar={pm.handleDeactivateInstead}
        onCancel={() => { pm.setIsConstraintOpen(false); pm.setBlockedProducto(null); }}
      />
      <ModalStock
        isOpen={pm.isStockOpen}
        producto={pm.stockProducto}
        isPending={pm.isPending}
        onSubmit={pm.handleAjustarStock}
        onClose={() => { pm.setIsStockOpen(false); pm.setStockProducto(null); }}
        cantidad={pm.stockCantidad}
        setCantidad={pm.setStockCantidad}
        motivo={pm.stockMotivo}
        setMotivo={pm.setStockMotivo}
        tipo={pm.stockTipo}
        setTipo={pm.setStockTipo}
      />
    </div>
  );
}
