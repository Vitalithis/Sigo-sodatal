import { useState, useTransition, useMemo, useEffect } from 'react';
import { CategoriaProducto } from '@/lib/prisma/generated';
import {
  crearProductoAction,
  editarProductoAction,
  eliminarProductoAction,
  desactivarProductoAction,
  ajustarStockAction,
  ProductoInput,
} from '../../actions';

export interface Producto {
  id: string;
  nombre: string;
  categoria: CategoriaProducto;
  precio_venta_nueva: number;
  precio_recarga: number | null;
  stock_minimo: number;
  activo: boolean;
  stock_fabrica?: { cantidad: number } | null;
}

export interface UsuarioLite {
  id: string;
  nombre: string;
  apellido: string | null;
}

export interface Notificacion {
  type: 'success' | 'error';
  message: string;
}

export function useProductManager(initialProductos: Producto[], usuarioActualId: string) {
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<Notificacion | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TODOS');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [sortBy, setSortBy] = useState('nombre-asc');

  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingProducto, setDeletingProducto] = useState<Producto | null>(null);
  const [isConstraintOpen, setIsConstraintOpen] = useState(false);
  const [blockedProducto, setBlockedProducto] = useState<Producto | null>(null);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [stockProducto, setStockProducto] = useState<Producto | null>(null);

  // Form fields
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState<CategoriaProducto | ''>('');
  const [precioVentaNueva, setPrecioVentaNueva] = useState<number | ''>('');
  const [precioRecarga, setPrecioRecarga] = useState<number | ''>('');
  const [stockMinimo, setStockMinimo] = useState<number>(10);
  const [activo, setActivo] = useState(true);

  // Stock form
  const [stockCantidad, setStockCantidad] = useState<number | ''>('');
  const [stockMotivo, setStockMotivo] = useState('');
  const [stockTipo, setStockTipo] = useState<'entrada' | 'salida'>('entrada');

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  useEffect(() => {
    if (editingProducto) {
      setNombre(editingProducto.nombre);
      setCategoria(editingProducto.categoria);
      setPrecioVentaNueva(editingProducto.precio_venta_nueva);
      setPrecioRecarga(editingProducto.precio_recarga ?? '');
      setStockMinimo(editingProducto.stock_minimo);
      setActivo(editingProducto.activo);
    } else {
      setNombre(''); setCategoria(''); setPrecioVentaNueva('');
      setPrecioRecarga(''); setStockMinimo(10); setActivo(true);
    }
  }, [editingProducto, isFormOpen]);

  useEffect(() => {
    if (!isStockOpen) {
      setStockCantidad(''); setStockMotivo(''); setStockTipo('entrada');
    }
  }, [isStockOpen]);

  const filteredAndSortedProductos = useMemo(() => {
    let list = initialProductos.filter((prod) => {
      const matchesSearch = prod.nombre.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'TODOS' || prod.categoria === categoryFilter;
      const matchesStatus =
        statusFilter === 'TODOS' ? true :
        statusFilter === 'ACTIVOS' ? prod.activo :
        !prod.activo;
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

  const notify = (type: 'success' | 'error', message: string) =>
    setNotification({ type, message });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !categoria || precioVentaNueva === '') {
      notify('error', 'Por favor completa los campos obligatorios.'); return;
    }
    const payload: ProductoInput = {
      nombre, categoria: categoria as CategoriaProducto,
      precio_venta_nueva: Number(precioVentaNueva),
      precio_recarga: precioRecarga !== '' ? Number(precioRecarga) : undefined,
      stock_minimo: Number(stockMinimo), activo,
    };
    startTransition(async () => {
      const res = editingProducto
        ? await editarProductoAction(editingProducto.id, payload)
        : await crearProductoAction(payload);
      if (res.success) {
        notify('success', editingProducto ? 'Producto modificado correctamente.' : 'Producto creado correctamente.');
        setIsFormOpen(false); setEditingProducto(null);
      } else {
        notify('error', res.message || 'Ocurrió un error inesperado.');
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!deletingProducto) return;
    startTransition(async () => {
      const res = await eliminarProductoAction(deletingProducto.id);
      setIsDeleteOpen(false);
      if (res.success) {
        notify('success', 'Producto eliminado correctamente.');
        setDeletingProducto(null);
      } else if (res.errorType === 'FOREIGN_KEY_VIOLATION') {
        setBlockedProducto(deletingProducto);
        setIsConstraintOpen(true);
        setDeletingProducto(null);
      } else {
        notify('error', res.message || 'Error al eliminar el producto.');
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
        notify('success', 'Producto desactivado correctamente.');
        setBlockedProducto(null);
      } else {
        notify('error', res.message || 'Error al desactivar el producto.');
        setBlockedProducto(null);
      }
    });
  };

  const handleAjustarStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockProducto || stockCantidad === '' || !stockMotivo.trim()) {
      notify('error', 'Completa todos los campos del ajuste.'); return;
    }
    const delta = stockTipo === 'entrada' ? Number(stockCantidad) : -Number(stockCantidad);
    startTransition(async () => {
      const res = await ajustarStockAction({
        producto_id: stockProducto.id,
        usuario_id: usuarioActualId,
        cantidad: delta,
        motivo: stockMotivo.trim(),
      });
      if (res.success) {
        notify('success', `Stock actualizado. Nuevo stock: ${res.stock_despues} unidades.`);
        setIsStockOpen(false); setStockProducto(null);
      } else {
        notify('error', res.message || 'Error al ajustar el stock.');
      }
    });
  };

  return {
    // Filtros
    searchQuery, setSearchQuery,
    categoryFilter, setCategoryFilter,
    statusFilter, setStatusFilter,
    sortBy, setSortBy,
    filteredAndSortedProductos,
    // Estado general
    isPending, notification, setNotification,
    // Modal form
    isFormOpen, setIsFormOpen,
    editingProducto, setEditingProducto,
    nombre, setNombre,
    categoria, setCategoria,
    precioVentaNueva, setPrecioVentaNueva,
    precioRecarga, setPrecioRecarga,
    stockMinimo, setStockMinimo,
    activo, setActivo,
    handleSubmit,
    // Modal eliminar
    isDeleteOpen, setIsDeleteOpen,
    deletingProducto, setDeletingProducto,
    handleDeleteConfirm,
    // Modal constraint
    isConstraintOpen, setIsConstraintOpen,
    blockedProducto, setBlockedProducto,
    handleDeactivateInstead,
    // Modal stock
    isStockOpen, setIsStockOpen,
    stockProducto, setStockProducto,
    stockCantidad, setStockCantidad,
    stockMotivo, setStockMotivo,
    stockTipo, setStockTipo,
    handleAjustarStock,
  };
}