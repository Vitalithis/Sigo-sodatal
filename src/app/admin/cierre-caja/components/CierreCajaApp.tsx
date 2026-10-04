'use client';

import React, { useState, useTransition, useEffect } from 'react';
import {
  Archive,
  Plus,
  Trash2,
  Printer,
  Lock,
  Wallet,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CreditCard,
  Banknote,
  ArrowUpDown,
  Building,
  Globe,
  Package,
  PenLine,
  Calendar,
  DollarSign,
  ShieldCheck,
  Clock,
  History,
  FileSpreadsheet,
  Download,
  Eye,
  X,
  FileText,
  Pencil,
  Search,
  CalendarDays,
  RotateCcw,
} from 'lucide-react';
import {
  agregarVentaAction,
  editarVentaAction,
  eliminarVentaAction,
  agregarGastoAction,
  editarGastoAction,
  eliminarGastoAction,
  actualizarEfectivoInicialAction,
  cerrarCajaAction,
  obtenerCierresMensualesAction,
  obtenerDetalleCierreAction,
  obtenerCierrePorFechaAction,
  MetodoPagoCaja,
} from '../actions';
import { handleDateInputSoloHabiles } from '@/lib/fechas';

export const METODO_LABELS: Record<MetodoPagoCaja, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  CREDITO_OFICINA: 'Crédito Oficina',
  PAGINA_WEB: 'Página Web',
};

const MESES = [
  { id: 1, nombre: 'Enero' },
  { id: 2, nombre: 'Febrero' },
  { id: 3, nombre: 'Marzo' },
  { id: 4, nombre: 'Abril' },
  { id: 5, nombre: 'Mayo' },
  { id: 6, nombre: 'Junio' },
  { id: 7, nombre: 'Julio' },
  { id: 8, nombre: 'Agosto' },
  { id: 9, nombre: 'Septiembre' },
  { id: 10, nombre: 'Octubre' },
  { id: 11, nombre: 'Noviembre' },
  { id: 12, nombre: 'Diciembre' },
];

const ANIOS = [2025, 2026, 2027];

// ── Helpers ──────────────────────────────────────────────────────────────────
function clp(n: number) {
  return `$${Math.round(n || 0).toLocaleString('es-CL')}`;
}

function hoyFormateado() {
  return new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function horaActual() {
  return new Date().toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function descargarArchivoCSV(content: string, fileName: string) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const METODO_ICONS: Record<MetodoPagoCaja, React.ElementType> = {
  EFECTIVO: Banknote,
  TARJETA: CreditCard,
  TRANSFERENCIA: ArrowUpDown,
  CREDITO_OFICINA: Building,
  PAGINA_WEB: Globe,
};

const METODO_COLORS: Record<MetodoPagoCaja, { bg: string; text: string; border: string; badge: string }> = {
  EFECTIVO: { bg: 'bg-emerald-50/70', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800' },
  TARJETA: { bg: 'bg-blue-50/70', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800' },
  TRANSFERENCIA: { bg: 'bg-purple-50/70', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-800' },
  CREDITO_OFICINA: { bg: 'bg-amber-50/70', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' },
  PAGINA_WEB: { bg: 'bg-rose-50/70', text: 'text-rose-700', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-800' },
};

const METODOS: MetodoPagoCaja[] = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO_OFICINA', 'PAGINA_WEB'];

interface Props {
  initialCierre: any;
  initialProductos: any[];
  errorMsg?: string;
}

// ── Formulario: Agregar Venta ─────────────────────────────────────────────────
function FormVenta({
  cierreId,
  productos,
  esOtro,
  onDone,
}: {
  cierreId: string;
  productos: any[];
  esOtro: boolean;
  onDone: () => void;
}) {
  const [productoId, setProductoId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [precio, setPrecio] = useState('');
  const [metodo, setMetodo] = useState<MetodoPagoCaja>('EFECTIVO');
  const [isPending, startTransition] = useTransition();

  const handleProductoChange = (id: string) => {
    setProductoId(id);
    if (id) {
      const prod = productos.find((p: any) => p.id === id);
      if (prod) {
        setDescripcion(prod.nombre);
        setPrecio(String(prod.precio_venta_nueva));
      }
    } else {
      setDescripcion('');
      setPrecio('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cantNum = parseInt(cantidad, 10);
    if (!descripcion || !precio || isNaN(cantNum) || cantNum < 1) return;
    startTransition(async () => {
      await agregarVentaAction({
        cierreId,
        descripcion,
        productoId: esOtro ? undefined : productoId || undefined,
        cantidad: cantNum,
        precioUnitario: parseFloat(precio) || 0,
        metodoPago: metodo,
        esOtro,
      });
      onDone();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          {esOtro ? <PenLine className="h-4 w-4 text-purple-600" /> : <Package className="h-4 w-4 text-[#013299]" />}
          {esOtro ? 'Registrar Otro Ingreso / Servicio' : 'Registrar Venta de Planta'}
        </h4>
        <span className="text-[11px] text-slate-400 font-medium">Se sumará al arqueo del día</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {!esOtro && (
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
              Producto del catálogo *
            </label>
            <select
              value={productoId}
              onChange={e => handleProductoChange(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299]"
            >
              <option value="">— Seleccionar Producto —</option>
              {productos.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({clp(p.precio_venta_nueva)})
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={esOtro ? 'sm:col-span-2' : ''}>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
            {esOtro ? 'Descripción / Detalle del Ingreso *' : 'Descripción *'}
          </label>
          <input
            type="text"
            required
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder={esOtro ? 'Ej: Arriendo de dispensador, servicio técnico...' : 'Se autocompleta con el producto'}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299]"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Cantidad</label>
          <input
            type="number"
            min={1}
            value={cantidad}
            onChange={e => setCantidad(e.target.value)}
            onBlur={() => {
              const val = parseInt(cantidad, 10);
              if (isNaN(val) || val < 1) {
                setCantidad('1');
              }
            }}
            placeholder="1"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299]"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Precio Unitario ($)</label>
          <input
            type="number"
            min={0}
            step={100}
            required
            value={precio}
            onChange={e => setPrecio(e.target.value)}
            placeholder="0"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299]"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Subtotal</label>
          <div className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-[#013299] bg-white flex items-center h-[34px]">
            {clp((parseInt(cantidad, 10) || 0) * (parseFloat(precio) || 0))}
          </div>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">Método de Pago</label>
        <div className="flex flex-wrap gap-2">
          {METODOS.map(m => {
            const Icon = METODO_ICONS[m];
            const active = metodo === m;
            const style = METODO_COLORS[m];
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMetodo(m)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${active
                  ? `${style.bg} ${style.border} ${style.text} shadow-xs ring-2 ring-blue-500/20`
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {METODO_LABELS[m]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/80">
        <button
          type="button"
          onClick={onDone}
          className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/80 rounded-xl transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-[#013299] hover:bg-blue-900 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm shadow-blue-900/10 disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Registrar Venta
        </button>
      </div>
    </form>
  );
}

// ── Modal: Confirmar Eliminación ──────────────────────────────────────────────
function ModalConfirmarEliminar({
  item,
  onConfirm,
  onCancel,
  isPending,
}: {
  item: {
    tipo: 'venta' | 'gasto';
    id: string;
    titulo: string;
    detalle: string;
    subtotal?: number;
  };
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 text-center space-y-4">
        <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto border border-rose-100 text-rose-600">
          <Trash2 className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900">{item.titulo}</h3>
          <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
            ¿Estás seguro de que deseas eliminar este registro del arqueo? Esta acción actualizará los totales de la caja inmediatamente.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-1 text-xs">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Elemento a eliminar:</span>
          <p className="font-bold text-slate-800">{item.detalle}</p>
          {item.subtotal !== undefined && (
            <p className="font-black text-rose-600 mt-1">
              Monto involucrado: {clp(item.subtotal)}
            </p>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="w-1/2 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="w-1/2 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-md shadow-rose-600/20 flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Sí, Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Editar Venta (Planta u Otros) ──────────────────────────────────────
function ModalEditarVenta({
  venta,
  productos,
  cierreId,
  onClose,
  onSuccess,
}: {
  venta: any;
  productos: any[];
  cierreId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [productoId, setProductoId] = useState(venta.producto_id || '');
  const [descripcion, setDescripcion] = useState(venta.descripcion || '');
  const [cantidad, setCantidad] = useState(String(venta.cantidad || 1));
  const [precio, setPrecio] = useState(String(venta.precio_unitario || 0));
  const [metodo, setMetodo] = useState<MetodoPagoCaja>(venta.metodo_pago || 'EFECTIVO');
  const [isPending, startTransition] = useTransition();

  const handleProductoChange = (id: string) => {
    setProductoId(id);
    if (id) {
      const prod = productos.find((p: any) => p.id === id);
      if (prod) {
        setDescripcion(prod.nombre);
        setPrecio(String(prod.precio_venta_nueva));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cantNum = parseInt(cantidad, 10);
    const precioNum = parseFloat(precio) || 0;
    if (!descripcion.trim() || isNaN(cantNum) || cantNum < 1) return;

    startTransition(async () => {
      const res = await editarVentaAction({
        ventaId: venta.id,
        cierreId,
        descripcion: descripcion.trim(),
        productoId: venta.es_otro ? undefined : (productoId || undefined),
        cantidad: cantNum,
        precioUnitario: precioNum,
        metodoPago: metodo,
        esOtro: venta.es_otro,
      });
      if (res.success) {
        onSuccess();
      }
    });
  };

  const cantNum = parseInt(cantidad, 10) || 0;
  const precioNum = parseFloat(precio) || 0;
  const subtotal = cantNum * precioNum;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${venta.es_otro ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-[#013299]'}`}>
              <Pencil className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                {venta.es_otro ? 'Editar Otro Ingreso' : 'Editar Venta de Planta'}
              </h3>
              <p className="text-[11px] text-slate-400">Modifica los datos del registro y recalcula el arqueo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!venta.es_otro && productos.length > 0 && (
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                Producto del catálogo
              </label>
              <select
                value={productoId}
                onChange={e => handleProductoChange(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#013299]/20"
              >
                <option value="">— Mantener o Personalizado —</option>
                {productos.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({clp(p.precio_venta_nueva)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
              Descripción / Glosa *
            </label>
            <input
              type="text"
              required
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#013299]/20"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Cantidad *</label>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#013299]/20"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">P. Unitario ($) *</label>
              <input
                type="number"
                min={0}
                step={100}
                value={precio}
                onChange={e => setPrecio(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#013299]/20"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Subtotal</label>
              <div className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-[#013299] bg-slate-50 flex items-center h-[34px]">
                {clp(subtotal)}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
              Método de Pago
            </label>
            <div className="flex flex-wrap gap-2">
              {METODOS.map(m => {
                const Icon = METODO_ICONS[m];
                const active = metodo === m;
                const style = METODO_COLORS[m];
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMetodo(m)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${active
                      ? `${style.bg} ${style.border} ${style.text} ring-2 ring-blue-500/20`
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {METODO_LABELS[m]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 bg-[#013299] hover:bg-blue-900 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: Editar Gasto ────────────────────────────────────────────────────────
function ModalEditarGasto({
  gasto,
  onClose,
  onSuccess,
}: {
  gasto: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [tipo, setTipo] = useState(gasto.tipo || 'BENCINA');
  const [descripcion, setDescripcion] = useState(gasto.descripcion || '');
  const [monto, setMonto] = useState(String(gasto.monto || 0));
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = parseFloat(monto) || 0;
    if (!descripcion.trim() || isNaN(montoNum) || montoNum < 0) return;

    startTransition(async () => {
      const res = await editarGastoAction({
        gastoId: gasto.id,
        tipo,
        descripcion: descripcion.trim(),
        monto: montoNum,
      });
      if (res.success) {
        onSuccess();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <Pencil className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Editar Egreso de Caja</h3>
              <p className="text-[11px] text-slate-400">Modifica la categoría, descripción o monto</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
              Categoría
            </label>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              {['BENCINA', 'MATERIALES', 'LIMPIEZA', 'OTRO'].map(t => (
                <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
              Descripción / Glosa *
            </label>
            <input
              type="text"
              required
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
              Monto ($) *
            </label>
            <input
              type="number"
              min={0}
              step={100}
              required
              value={monto}
              onChange={e => setMonto(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: Detalle Completo de Cierre de Caja (Productos, Cantidades y Montos) ──
function ModalDetalleCierre({
  cierre,
  onClose,
  onImprimir,
  onExportarCSV,
}: {
  cierre: any;
  onClose: () => void;
  onImprimir: (c: any) => void;
  onExportarCSV: (c: any) => void;
}) {
  const ventas: any[] = cierre.ventas || [];
  const gastos: any[] = cierre.gastos || [];
  const totalGastos = gastos.reduce((s: number, g: any) => s + (g.monto || 0), 0);
  const totalVentas = cierre.total_general || ventas.reduce((s: number, v: any) => s + (v.subtotal || 0), 0);
  const efectivoEsperado = (cierre.efectivo_inicial || 0) + (cierre.total_efectivo || 0) - totalGastos;
  const totalUnidades = ventas.reduce((s: number, v: any) => s + (v.cantidad || 0), 0);
  const [tabDetalle, setTabDetalle] = useState<'productos' | 'transacciones' | 'gastos'>('productos');

  // Agrupación por producto (Cantidades y Montos por producto)
  const productosAgrupados = ventas.reduce((acc: any[], v: any) => {
    const key = v.producto_id ? `prod_${v.producto_id}` : `desc_${v.descripcion.trim().toLowerCase()}`;
    const nombre = v.producto?.nombre || v.descripcion;
    const existing = acc.find(item => item.key === key);
    if (existing) {
      existing.cantidad += v.cantidad;
      existing.totalMonto += v.subtotal;
      existing.conteo += 1;
    } else {
      acc.push({
        key,
        nombre,
        codigo: v.producto?.codigo || null,
        esOtro: v.es_otro,
        cantidad: v.cantidad,
        precioRef: v.precio_unitario,
        totalMonto: v.subtotal,
        conteo: 1,
      });
    }
    return acc;
  }, []);

  // Ordenar productos con mayor recaudación primero
  productosAgrupados.sort((a, b) => b.totalMonto - a.totalMonto);

  const fechaFormateada = new Date(cierre.fecha).toLocaleDateString('es-CL', {
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-3xl w-full p-6 max-h-[92vh] flex flex-col space-y-4">
        
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-[#013299] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                CC-{cierre.id.slice(-6).toUpperCase()}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                cierre.estado === 'CERRADO'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-blue-50 text-[#013299] border-blue-200'
              }`}>
                {cierre.estado === 'CERRADO' ? 'Caja Cerrada' : 'Caja Abierta'}
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900 capitalize mt-1">
              Arqueo del {fechaFormateada}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Responsable: <strong className="text-slate-700">{cierre.usuario?.nombre || 'Administración'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onExportarCSV(cierre)}
              className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors text-xs font-bold flex items-center gap-1.5 border border-slate-200"
              title="Exportar ventas a Excel (CSV)"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            <button
              onClick={() => onImprimir(cierre)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors text-xs font-bold flex items-center gap-1.5 border border-slate-200"
              title="Imprimir comprobante oficial"
            >
              <Printer className="h-4 w-4 text-slate-700" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Cuadro Resumen Financiero (4 Tarjetas KPI) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-gradient-to-br from-[#013299] to-blue-900 text-white rounded-xl p-3 shadow-xs">
            <span className="text-[10px] font-black uppercase text-blue-200 block">Total Ingresos</span>
            <span className="text-lg font-black text-white">{clp(totalVentas)}</span>
            <span className="text-[10px] text-blue-200 block mt-0.5">{totalUnidades} un. • {ventas.length} ventas</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Caja Inicial</span>
            <span className="text-lg font-black text-slate-800">{clp(cierre.efectivo_inicial)}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Fondo base</span>
          </div>
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
            <span className="text-[10px] font-bold text-rose-600 uppercase block">Total Gastos</span>
            <span className="text-lg font-black text-rose-600">-{clp(totalGastos)}</span>
            <span className="text-[10px] text-rose-400 block mt-0.5">{gastos.length} egresos</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[10px] font-bold text-slate-600 uppercase block">Efectivo en Caja</span>
            <span className="text-lg font-black text-slate-900">{clp(efectivoEsperado)}</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Ventas efec: {clp(cierre.total_efectivo || 0)}</span>
          </div>
        </div>

        {/* Selector de Pestañas del Modal */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setTabDetalle('productos')}
            className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tabDetalle === 'productos'
                ? 'bg-white text-[#013299] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            Resumen por Producto ({productosAgrupados.length})
          </button>
          <button
            onClick={() => setTabDetalle('transacciones')}
            className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tabDetalle === 'transacciones'
                ? 'bg-white text-[#013299] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Detalle de Ventas ({ventas.length})
          </button>
          <button
            onClick={() => setTabDetalle('gastos')}
            className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tabDetalle === 'gastos'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5" />
            Gastos ({gastos.length})
          </button>
        </div>

        {/* Contenido scrolleable del Modal */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">

          {/* TAB 1: RESUMEN POR PRODUCTO (CANTIDADES Y MONTOS) */}
          {tabDetalle === 'productos' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Consolidado de unidades vendidas y montos acumulados por cada producto:</span>
                <span className="font-bold text-slate-800">Total: {totalUnidades} unidades</span>
              </div>

              {productosAgrupados.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                  <Package className="h-8 w-8 mx-auto text-slate-300 mb-1" />
                  <p className="font-bold text-xs text-slate-600">No hay ventas registradas en esta jornada</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Producto / Concepto</th>
                        <th className="py-2.5 px-3 text-center">Cant. Total</th>
                        <th className="py-2.5 px-3 text-right">P. Unitario Ref.</th>
                        <th className="py-2.5 px-3 text-right">Monto Total</th>
                        <th className="py-2.5 px-3 text-center">% Venta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productosAgrupados.map((p: any) => {
                        const pct = totalVentas > 0 ? Math.round((p.totalMonto / totalVentas) * 100) : 0;
                        return (
                          <tr key={p.key} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2 px-3 font-bold text-slate-800">
                              {p.nombre}
                              {p.esOtro && (
                                <span className="ml-2 inline-block bg-purple-50 text-purple-700 text-[9px] font-bold px-1.5 py-0.2 rounded border border-purple-100">
                                  Otro Ingreso
                                </span>
                              )}
                              {p.conteo > 1 && (
                                <span className="ml-1 text-[10px] text-slate-400 font-normal">
                                  ({p.conteo} ventas)
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="inline-block bg-blue-50 text-[#013299] font-black px-2.5 py-0.5 rounded-full text-xs border border-blue-100">
                                {p.cantidad} un.
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600 font-semibold">
                              {clp(p.precioRef)}
                            </td>
                            <td className="py-2 px-3 text-right font-black text-[#013299] text-xs">
                              {clp(p.totalMonto)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="text-[10px] font-bold text-slate-500">
                                {pct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
                        <td className="py-2.5 px-3 uppercase text-[10px]">TOTAL CONSOLIDADO</td>
                        <td className="py-2.5 px-3 text-center text-[#013299] text-xs">
                          {totalUnidades} un.
                        </td>
                        <td />
                        <td className="py-2.5 px-3 text-right text-[#013299] text-xs">
                          {clp(totalVentas)}
                        </td>
                        <td className="py-2.5 px-3 text-center">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DETALLE INDIVIDUAL DE TRANSACCIONES DE VENTA */}
          {tabDetalle === 'transacciones' && (
            <div className="space-y-2">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 text-center w-8">#</th>
                      <th className="py-2 px-3">Descripción</th>
                      <th className="py-2 px-3 text-center">Cant.</th>
                      <th className="py-2 px-3 text-right">P. Unitario</th>
                      <th className="py-2 px-3 text-right">Monto Total</th>
                      <th className="py-2 px-3 text-center">Método de Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ventas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                          Sin ventas registradas
                        </td>
                      </tr>
                    ) : (
                      ventas.map((v: any, idx: number) => {
                        const Icon = METODO_ICONS[v.metodo_pago as MetodoPagoCaja] || Banknote;
                        const style = METODO_COLORS[v.metodo_pago as MetodoPagoCaja] || METODO_COLORS.EFECTIVO;
                        return (
                          <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px]">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {v.descripcion}
                              {v.es_otro && (
                                <span className="ml-1.5 inline-block bg-purple-50 text-purple-700 text-[8px] font-bold px-1.5 py-0.2 rounded">
                                  Otro
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-slate-700">{v.cantidad}</td>
                            <td className="py-2 px-3 text-right text-slate-600">{clp(v.precio_unitario)}</td>
                            <td className="py-2 px-3 text-right font-black text-slate-900">{clp(v.subtotal)}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${style.bg} ${style.border} ${style.text}`}>
                                <Icon className="h-3 w-3" />
                                {METODO_LABELS[v.metodo_pago as MetodoPagoCaja] || v.metodo_pago}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
                      <td colSpan={2} className="py-2 px-3 uppercase text-[10px]">TOTAL VENTAS</td>
                      <td className="py-2 px-3 text-center">{totalUnidades}</td>
                      <td />
                      <td className="py-2 px-3 text-right text-[#013299]">{clp(totalVentas)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: GASTOS DE CAJA */}
          {tabDetalle === 'gastos' && (
            <div className="space-y-2">
              {gastos.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                  <TrendingDown className="h-8 w-8 mx-auto text-slate-300 mb-1" />
                  <p className="font-bold text-xs text-slate-600">No se registraron egresos en este día</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 w-28">Categoría</th>
                        <th className="py-2 px-3">Descripción / Motivo</th>
                        <th className="py-2 px-3 text-right w-28">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gastos.map((g: any) => (
                        <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-3 font-bold text-rose-700 text-[10px] uppercase">
                            <span className="inline-block bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                              {g.tipo}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-700 font-semibold">{g.descripcion}</td>
                          <td className="py-2 px-3 text-right font-black text-rose-600">-{clp(g.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-rose-50/60 font-black text-rose-900 border-t-2 border-rose-100">
                        <td colSpan={2} className="py-2 px-3 uppercase text-[10px]">TOTAL EGRESOS</td>
                        <td className="py-2 px-3 text-right text-rose-600">-{clp(totalGastos)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Desglose por Método de Pago */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
              Recaudación por Forma de Pago en este Día:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              {METODOS.map(m => {
                const Icon = METODO_ICONS[m];
                const sum = ventas.filter(v => v.metodo_pago === m).reduce((s, v) => s + v.subtotal, 0);
                return (
                  <div key={m} className="bg-white border border-slate-200 rounded-xl p-2 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block flex items-center justify-center gap-1">
                      <Icon className="h-3 w-3" />
                      {METODO_LABELS[m]}
                    </span>
                    <span className="font-black text-slate-900 text-xs block mt-0.5">{clp(sum)}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer del Modal */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-400 font-medium">
            Arqueo de caja auditado • Generado por SIGO Sodatal
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onImprimir(cierre)}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir Arqueo
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CierreCajaApp({ initialCierre, initialProductos, errorMsg }: Props) {
  const hoy = new Date();
  const [vistaModo, setVistaModo] = useState<'diario' | 'historial'>('diario');
  const [cierre, setCierre] = useState<any>(initialCierre);
  const [productos] = useState<any[]>(initialProductos);
  const [activeTab, setActiveTab] = useState<'fabrica' | 'otros' | 'gastos'>('fabrica');
  const [showFormVenta, setShowFormVenta] = useState(false);
  const [showFormOtro, setShowFormOtro] = useState(false);
  const [showFormGasto, setShowFormGasto] = useState(false);
  const [efectivoInicial, setEfectivoInicial] = useState(String(initialCierre?.efectivo_inicial ?? 0));
  const [gastoDesc, setGastoDesc] = useState('');
  const [gastoMonto, setGastoMonto] = useState('');
  const [gastoTipo, setGastoTipo] = useState('BENCINA');
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [efectivoGuardado, setEfectivoGuardado] = useState(false);
  const [editandoEfectivo, setEditandoEfectivo] = useState(false);
  const [showModalCierre, setShowModalCierre] = useState(false);
  const [itemAEliminar, setItemAEliminar] = useState<{
    tipo: 'venta' | 'gasto';
    id: string;
    titulo: string;
    detalle: string;
    subtotal?: number;
  } | null>(null);
  const [ventaAEditar, setVentaAEditar] = useState<any | null>(null);
  const [gastoAEditar, setGastoAEditar] = useState<any | null>(null);

  // ── Historial y Mensual State
  const [mesFiltro, setMesFiltro] = useState(hoy.getMonth() + 1);
  const [anioFiltro, setAnioFiltro] = useState(hoy.getFullYear());
  const [cierresMensuales, setCierresMensuales] = useState<any[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [detalleCierreModal, setDetalleCierreModal] = useState<any | null>(null);

  // Buscador de Día y Filtro
  const [filtroFechaExacta, setFiltroFechaExacta] = useState('');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [cierreParaImpresion, setCierreParaImpresion] = useState<any | null>(null);

  const showToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const refresh = () => {
    window.location.reload();
  };

  const cargarHistorial = async (anio: number, mes: number) => {
    setCargandoHistorial(true);
    const res = await obtenerCierresMensualesAction(anio, mes);
    setCargandoHistorial(false);
    if (res.success) {
      setCierresMensuales(res.cierres || []);
    } else {
      showToast('err', res.message || 'Error al cargar historial.');
    }
  };

  useEffect(() => {
    if (vistaModo === 'historial') {
      cargarHistorial(anioFiltro, mesFiltro);
    }
  }, [vistaModo, mesFiltro, anioFiltro]);

  useEffect(() => {
    const handleAfterPrint = () => {
      setCierreParaImpresion(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handleBuscarPorDia = async (fechaStr: string) => {
    if (!fechaStr) {
      showToast('err', 'Por favor selecciona o ingresa una fecha.');
      return;
    }
    setCargandoHistorial(true);
    const res = await obtenerCierrePorFechaAction(fechaStr);
    setCargandoHistorial(false);

    if (res.success && res.cierre) {
      const [y, m] = fechaStr.split('-').map(Number);
      if (y && m && (y !== anioFiltro || m !== mesFiltro)) {
        setAnioFiltro(y);
        setMesFiltro(m);
      }
      setDetalleCierreModal(res.cierre);
      showToast('ok', `Arqueo encontrado y cargado con éxito.`);
    } else {
      showToast('err', res.message || 'No se encontró arqueo para la fecha indicada.');
    }
  };

  const exportarDetalleDiaCSV = (c: any) => {
    const vList = c?.ventas || [];
    if (vList.length === 0) {
      showToast('err', 'No hay ventas registradas en este arqueo para exportar.');
      return;
    }
    const headers = [
      '#',
      'Fecha',
      'Folio',
      'Producto_o_Concepto',
      'Es_Otro_Ingreso',
      'Cantidad',
      'Precio_Unitario_CLP',
      'Subtotal_CLP',
      'Metodo_Pago',
    ];
    const rows = vList.map((v: any, idx: number) => {
      const f = new Date(c.fecha).toLocaleDateString('es-CL', { timeZone: 'UTC' });
      const folio = `CC-${c.id.slice(-6).toUpperCase()}`;
      const desc = `"${(v.producto?.nombre || v.descripcion).replace(/"/g, '""')}"`;
      return [
        idx + 1,
        f,
        folio,
        desc,
        v.es_otro ? 'SI' : 'NO',
        v.cantidad,
        v.precio_unitario,
        v.subtotal,
        v.metodo_pago,
      ];
    });
    const csvContent = [headers.join(';'), ...rows.map((r: any[]) => r.join(';'))].join('\n');
    const fStr = new Date(c.fecha).toISOString().slice(0, 10);
    descargarArchivoCSV(csvContent, `ventas_cierre_${fStr}.csv`);
    showToast('ok', 'Detalle de ventas exportado a Excel (CSV).');
  };

  const handleImprimirCierre = (c: any) => {
    setCierreParaImpresion(c);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleEfectivoGuardar = () => {
    startTransition(async () => {
      const montoNum = parseFloat(efectivoInicial) || 0;
      const res = await actualizarEfectivoInicialAction(cierre.id, montoNum);
      if (res.success) {
        setCierre((prev: any) => ({ ...prev, efectivo_inicial: montoNum }));
        setEditandoEfectivo(false);
        setEfectivoGuardado(true);
        setTimeout(() => setEfectivoGuardado(false), 3000);
        showToast('ok', 'Fondo inicial de caja guardado con éxito.');
      } else {
        showToast('err', res.message || 'Error al guardar efectivo');
      }
    });
  };

  const handleConfirmarEliminar = () => {
    if (!itemAEliminar) return;
    startTransition(async () => {
      if (itemAEliminar.tipo === 'venta') {
        const res = await eliminarVentaAction(itemAEliminar.id, cierre.id);
        if (res.success) {
          setItemAEliminar(null);
          showToast('ok', 'Venta eliminada con éxito.');
          refresh();
        } else {
          showToast('err', res.message || 'Error al eliminar venta.');
        }
      } else {
        const res = await eliminarGastoAction(itemAEliminar.id);
        if (res.success) {
          setItemAEliminar(null);
          showToast('ok', 'Egreso eliminado con éxito.');
          refresh();
        } else {
          showToast('err', res.message || 'Error al eliminar egreso.');
        }
      }
    });
  };

  const handleAgregarGasto = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await agregarGastoAction({
        cierreId: cierre.id,
        descripcion: gastoDesc,
        tipo: gastoTipo,
        monto: parseFloat(gastoMonto) || 0,
      });
      if (res.success) {
        setGastoDesc('');
        setGastoMonto('');
        setShowFormGasto(false);
        refresh();
      } else {
        showToast('err', res.message || 'Error al registrar egreso');
      }
    });
  };

  const handleCerrarCaja = () => {
    startTransition(async () => {
      const res = await cerrarCajaAction(cierre.id);
      if (res.success) {
        setShowModalCierre(false);
        refresh();
      } else {
        showToast('err', res.message || 'Error al cerrar caja');
      }
    });
  };

  const handleImprimir = () => {
    window.print();
  };

  const exportarMensualCSV = () => {
    if (cierresMensuales.length === 0) {
      showToast('err', 'No hay registros en el mes seleccionado para exportar.');
      return;
    }

    const headers = [
      'Fecha',
      'Folio',
      'Responsable',
      'Estado',
      'Total_Ingresos_CLP',
      'Fondo_Inicial_CLP',
      'Total_Egresos_CLP',
      'Efectivo_Caja_Final_CLP',
      'Efectivo_Ventas_CLP',
      'Tarjeta_POS_CLP',
      'Transferencia_CLP',
      'Credito_Oficina_CLP',
      'Pagina_Web_CLP',
    ];

    const rows = cierresMensuales.map((c: any) => {
      const f = new Date(c.fecha).toLocaleDateString('es-CL', { timeZone: 'UTC' });
      const folio = `CC-${c.id.slice(-6).toUpperCase()}`;
      const resp = `"${c.usuario?.nombre || 'Administración'}"`;
      const gSum = (c.gastos || []).reduce((s: number, g: any) => s + g.monto, 0);
      const efFinal = (c.efectivo_inicial || 0) + (c.total_efectivo || 0) - gSum;
      return [
        f,
        folio,
        resp,
        c.estado,
        c.total_general || 0,
        c.efectivo_inicial || 0,
        gSum,
        efFinal,
        c.total_efectivo || 0,
        c.total_tarjeta || 0,
        c.total_transferencia || 0,
        c.total_credito_oficina || 0,
        c.total_pagina_web || 0,
      ];
    });

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const nombreMes = MESES.find(m => m.id === mesFiltro)?.nombre.toLowerCase() || 'mes';
    descargarArchivoCSV(csvContent, `cierres_caja_${nombreMes}_${anioFiltro}.csv`);
    showToast('ok', 'Archivo Excel (CSV) descargado con éxito.');
  };

  if (errorMsg) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl flex items-start gap-4 shadow-sm">
        <AlertCircle className="h-6 w-6 shrink-0 text-rose-600 mt-0.5" />
        <div>
          <h3 className="font-bold text-sm text-rose-900">Error en Módulo de Cierre</h3>
          <p className="text-xs text-rose-700 mt-1">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (!cierre) return null;

  const ventas = cierre.ventas ?? [];
  const gastos = cierre.gastos ?? [];
  const ventasFabrica = ventas.filter((v: any) => !v.es_otro);
  const ventasOtras = ventas.filter((v: any) => v.es_otro);
  const totalGastos = gastos.reduce((s: number, g: any) => s + g.monto, 0);
  const cerrado = cierre.estado === 'CERRADO';
  const totalGeneralVentas = cierre.total_general || 0;
  const efectivoEnCajaEsperado = (cierre.efectivo_inicial || 0) + (cierre.total_efectivo || 0) - totalGastos;

  const totalesMetodo: Record<MetodoPagoCaja, number> = {
    EFECTIVO: cierre.total_efectivo || 0,
    TARJETA: cierre.total_tarjeta || 0,
    TRANSFERENCIA: cierre.total_transferencia || 0,
    CREDITO_OFICINA: cierre.total_credito_oficina || 0,
    PAGINA_WEB: cierre.total_pagina_web || 0,
  };

  const folioCierre = `CC-${cierre.id.slice(-6).toUpperCase()}`;

  // Métricas acumuladas del mes para la vista Historial
  const totalIngresosMes = cierresMensuales.reduce((s, c) => s + (c.total_general || 0), 0);
  const totalGastosMes = cierresMensuales.reduce((s, c) => {
    const gSum = (c.gastos || []).reduce((gs: number, g: any) => gs + (g.monto || 0), 0);
    return s + gSum;
  }, 0);
  const totalEfectivoMes = cierresMensuales.reduce((s, c) => s + (c.total_efectivo || 0), 0);
  const nombreMesSeleccionado = MESES.find(m => m.id === mesFiltro)?.nombre || '';

  // Filtrado de cierres según búsqueda por día o texto
  const cierresFiltrados = cierresMensuales.filter((c: any) => {
    if (filtroFechaExacta) {
      const fechaC = new Date(c.fecha).toISOString().slice(0, 10);
      if (fechaC !== filtroFechaExacta) return false;
    }
    if (filtroTexto.trim()) {
      const q = filtroTexto.trim().toLowerCase();
      const folio = `CC-${c.id?.slice(-6).toUpperCase()}`.toLowerCase();
      const resp = (c.usuario?.nombre || '').toLowerCase();
      const est = (c.estado || '').toLowerCase();
      const fechaStr = new Date(c.fecha).toLocaleDateString('es-CL', { timeZone: 'UTC' }).toLowerCase();
      if (!folio.includes(q) && !resp.includes(q) && !est.includes(q) && !fechaStr.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Datos para documento de impresión (soporta el día actual o cualquier día histórico seleccionado en el modal)
  const cierreDocImpresion = cierreParaImpresion || cierre;
  const ventasDocImpresion = cierreDocImpresion?.ventas || [];
  const gastosDocImpresion = cierreDocImpresion?.gastos || [];
  const totalGastoDocImpresion = gastosDocImpresion.reduce((s: number, g: any) => s + (g.monto || 0), 0);
  const totalGeneralDocImpresion = cierreDocImpresion?.total_general || ventasDocImpresion.reduce((s: number, v: any) => s + (v.subtotal || 0), 0);
  const efectivoEnCajaDocImpresion = (cierreDocImpresion?.efectivo_inicial || 0) + (cierreDocImpresion?.total_efectivo || 0) - totalGastoDocImpresion;
  const folioDocImpresion = `CC-${cierreDocImpresion?.id ? cierreDocImpresion.id.slice(-6).toUpperCase() : ''}`;
  const fechaDocImpresion = cierreDocImpresion?.fecha
    ? new Date(cierreDocImpresion.fecha).toLocaleDateString('es-CL', {
        timeZone: 'UTC',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : hoyFormateado();

  return (
    <>
      {/* Notificación Flotante (Toast) */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-xs font-bold animate-in slide-in-from-top-2 duration-200 ${toast.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
          {toast.type === 'ok' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
          {toast.msg}
        </div>
      )}

      {/* ── MODAL CONFIRMACIÓN CIERRE DE CAJA ── */}
      {showModalCierre && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto border border-rose-100 text-rose-600">
              <Lock className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">¿Cerrar Definitivamente la Caja?</h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Esta acción congelará los registros del día ({hoyFormateado()}). No se podrán agregar ni modificar ventas ni egresos.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Total Ventas Recaudadas:</span>
                <span className="font-black text-slate-800">{clp(totalGeneralVentas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Total Egresos de Caja:</span>
                <span className="font-black text-rose-600">-{clp(totalGastos)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 font-bold">
                <span className="text-slate-900">Efectivo Final a Entregar:</span>
                <span className="text-sm font-black text-[#013299]">{clp(efectivoEnCajaEsperado)}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModalCierre(false)}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                disabled={isPending}
              >
                Cancelar
              </button>
              <button
                onClick={handleCerrarCaja}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-md shadow-rose-600/20"
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Confirmar Cierre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMACIÓN ELIMINACIÓN ── */}
      {itemAEliminar && (
        <ModalConfirmarEliminar
          item={itemAEliminar}
          onConfirm={handleConfirmarEliminar}
          onCancel={() => setItemAEliminar(null)}
          isPending={isPending}
        />
      )}

      {/* ── MODAL EDITAR VENTA (PLANTA U OTROS) ── */}
      {ventaAEditar && (
        <ModalEditarVenta
          venta={ventaAEditar}
          productos={productos}
          cierreId={cierre.id}
          onClose={() => setVentaAEditar(null)}
          onSuccess={() => {
            setVentaAEditar(null);
            showToast('ok', 'Venta actualizada con éxito.');
            refresh();
          }}
        />
      )}

      {/* ── MODAL EDITAR GASTO ── */}
      {gastoAEditar && (
        <ModalEditarGasto
          gasto={gastoAEditar}
          onClose={() => setGastoAEditar(null)}
          onSuccess={() => {
            setGastoAEditar(null);
            showToast('ok', 'Egreso actualizado con éxito.');
            refresh();
          }}
        />
      )}

      {/* ── MODAL DETALLE DE CIERRE HISTÓRICO (PRODUCTOS, CANTIDADES Y MONTOS) ── */}
      {detalleCierreModal && (
        <ModalDetalleCierre
          cierre={detalleCierreModal}
          onClose={() => setDetalleCierreModal(null)}
          onImprimir={handleImprimirCierre}
          onExportarCSV={exportarDetalleDiaCSV}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PANTALLA WEB (Oculta al imprimir)
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="print:hidden space-y-6">

        {/* ── CABECERA PRINCIPAL CON NAVEGADOR DE VISTAS ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Cierre y Arqueo de Caja
            </h1>
            <p className="text-xs text-slate-500 font-medium capitalize">
              {hoyFormateado()} • Responsable: <span className="font-bold text-slate-700">{cierre.usuario?.nombre || 'Administración'}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Toggle de Vistas: Diario vs Historial */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setVistaModo('diario')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${vistaModo === 'diario'
                  ? 'bg-white text-[#013299] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Clock className="h-3.5 w-3.5" />
                Caja de Hoy
              </button>
              <button
                onClick={() => setVistaModo('historial')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${vistaModo === 'historial'
                  ? 'bg-white text-[#013299] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <History className="h-3.5 w-3.5" />
                Resultados Mensuales
              </button>
            </div>

            {vistaModo === 'diario' && (
              <>
                {cerrado ? (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-xs">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Caja Cerrada
                  </span>
                ) : (
                  <button
                    onClick={() => setShowModalCierre(true)}
                    disabled={isPending}
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-rose-600/20"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Cerrar Caja
                  </button>
                )}

                <button
                  onClick={handleImprimir}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir Reporte
                </button>
              </>
            )}

            {vistaModo === 'historial' && (
              <>
                <button
                  onClick={exportarMensualCSV}
                  className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  Exportar a Excel (CSV)
                </button>
                <button
                  onClick={handleImprimir}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir Informe Mensual
                </button>
              </>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            VISTA 1: CAJA DE HOY (OPERATIVA)
        ═══════════════════════════════════════════════════════════════════ */}
        {vistaModo === 'diario' && (
          <>
            {/* ── KPI METRICS STRIP (4 TARJETAS) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* 1. TOTAL INGRESOS (LA MÉTRICA MÁS IMPORTANTE) */}
              <div className="bg-gradient-to-br from-[#013299] via-blue-900 to-indigo-950 text-white rounded-2xl p-5 shadow-xl shadow-blue-900/20 ring-1 ring-blue-400/30 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-200">TOTAL INGRESOS</span>
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-amber-300 backdrop-blur-xs">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-black tracking-tight text-white">{clp(totalGeneralVentas)}</p>
                  <p className="text-[11px] text-blue-200/90 font-medium mt-1">
                    {ventasFabrica.length} ventas fabrica • {ventasOtras.length} otros ingresos
                  </p>
                </div>
              </div>

              {/* 2. Fondo Inicial (Texto estático con botón de edición) */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between space-y-3 hover:border-slate-200 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Fondo Inicial</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>

                {!editandoEfectivo ? (
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-2xl font-black text-slate-900">{clp(cierre.efectivo_inicial)}</p>
                      {!cerrado && (
                        <button
                          onClick={() => {
                            setEfectivoInicial(String(cierre.efectivo_inicial || 0));
                            setEditandoEfectivo(true);
                          }}
                          className="text-[11px] font-bold text-[#013299] hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <PenLine className="h-3 w-3" /> Editar
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" /> Fondo fijado en caja
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center border border-slate-200 rounded-xl px-2.5 py-1 bg-white focus-within:ring-2 focus-within:ring-[#013299]/20">
                      <span className="text-slate-400 font-bold text-xs mr-1">$</span>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={efectivoInicial}
                        onChange={e => setEfectivoInicial(e.target.value)}
                        className="w-full text-base font-black text-slate-900 bg-transparent focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditandoEfectivo(false)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-lg"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleEfectivoGuardar}
                        disabled={isPending}
                        className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1"
                      >
                        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        Guardar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Total Gastos */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between space-y-3 hover:border-slate-200 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Gastos</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-black text-rose-600">-{clp(totalGastos)}</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {gastos.length} retiros autorizados en caja
                  </p>
                </div>
              </div>

              {/* 4. Efectivo en Caja (Arqueo Físico) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider">Efectivo en Caja</span>
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200">
                    <Banknote className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">{clp(efectivoEnCajaEsperado)}</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Base ({clp(cierre.efectivo_inicial)}) + Efectivo ({clp(cierre.total_efectivo)}) - Egresos
                  </p>
                </div>
              </div>

            </div>

            {/* ── DESGLOSE POR MÉTODO DE PAGO (LISTA COMPACTA) ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3 flex items-center justify-between flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                <CreditCard className="h-4 w-4 text-[#013299]" />
                <span>Recaudación por método:</span>
              </div>
              <div className="flex items-center gap-4 sm:gap-6 flex-wrap text-slate-700">
                {METODOS.map(m => {
                  const Icon = METODO_ICONS[m];
                  const monto = totalesMetodo[m];
                  return (
                    <div key={m} className="flex items-center gap-1.5 font-medium">
                      <Icon className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-slate-500">{METODO_LABELS[m]}:</span>
                      <span className="font-black text-slate-900">{clp(monto)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── TABS DE OPERACIONES (VENTAS / OTROS / GASTOS) - ELEMENTO PRINCIPAL ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

              {/* Header de pestañas */}
              <div className="flex items-center justify-between border-b border-slate-100 p-2 sm:p-3 bg-slate-50/60 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl">
                  <button
                    onClick={() => setActiveTab('fabrica')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'fabrica'
                      ? 'bg-white text-[#013299] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    <Package className="h-3.5 w-3.5" />
                    Ventas Fabrica
                    <span className="bg-blue-100 text-[#013299] text-[10px] px-1.5 py-0.2 rounded-full font-black">
                      {ventasFabrica.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('otros')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'otros'
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    <PenLine className="h-3.5 w-3.5" />
                    Otros Ingresos
                    <span className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                      {ventasOtras.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('gastos')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'gastos'
                      ? 'bg-white text-rose-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    <TrendingDown className="h-3.5 w-3.5" />
                    Gastos
                    <span className="bg-rose-100 text-rose-800 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                      {gastos.length}
                    </span>
                  </button>
                </div>

                {!cerrado && (
                  <div>
                    {activeTab === 'fabrica' && (
                      <button
                        onClick={() => setShowFormVenta(v => !v)}
                        className="flex items-center gap-1.5 bg-[#013299] hover:bg-blue-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {showFormVenta ? 'Cerrar Formulario' : 'Nueva Venta Planta'}
                      </button>
                    )}
                    {activeTab === 'otros' && (
                      <button
                        onClick={() => setShowFormOtro(v => !v)}
                        className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {showFormOtro ? 'Cerrar Formulario' : 'Nuevo Otro Ingreso'}
                      </button>
                    )}
                    {activeTab === 'gastos' && (
                      <button
                        onClick={() => setShowFormGasto(v => !v)}
                        className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {showFormGasto ? 'Cerrar Formulario' : 'Registrar Egreso'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Formulario Desplegable: Ventas Planta */}
              {activeTab === 'fabrica' && showFormVenta && !cerrado && (
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <FormVenta
                    cierreId={cierre.id}
                    productos={productos}
                    esOtro={false}
                    onDone={() => { setShowFormVenta(false); refresh(); }}
                  />
                </div>
              )}

              {/* Formulario Desplegable: Otros Ingresos */}
              {activeTab === 'otros' && showFormOtro && !cerrado && (
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <FormVenta
                    cierreId={cierre.id}
                    productos={[]}
                    esOtro={true}
                    onDone={() => { setShowFormOtro(false); refresh(); }}
                  />
                </div>
              )}

              {/* Formulario Desplegable: Gastos */}
              {activeTab === 'gastos' && showFormGasto && !cerrado && (
                <form onSubmit={handleAgregarGasto} className="p-5 border-b border-slate-100 bg-rose-50/30 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-rose-100">
                    <h4 className="text-xs font-black text-rose-800 uppercase tracking-wider flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" /> Registrar Salida o Gasto en Efectivo
                    </h4>
                    <span className="text-[11px] text-slate-400 font-medium">Se descontará del efectivo en caja</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Categoría</label>
                      <select
                        value={gastoTipo}
                        onChange={e => setGastoTipo(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      >
                        {['BENCINA', 'MATERIALES', 'LIMPIEZA', 'OTRO'].map(t => (
                          <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Descripción / Glosa *</label>
                      <input
                        type="text"
                        required
                        value={gastoDesc}
                        onChange={e => setGastoDesc(e.target.value)}
                        placeholder="Ej: Combustible de emergencia camión #2, bolsas..."
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Monto ($) *</label>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        required
                        value={gastoMonto}
                        onChange={e => setGastoMonto(e.target.value)}
                        placeholder="0"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-rose-100">
                    <button type="button" onClick={() => setShowFormGasto(false)} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200/80 rounded-xl transition-colors">
                      Cancelar
                    </button>
                    <button type="submit" disabled={isPending} className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs">
                      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      Confirmar Egreso
                    </button>
                  </div>
                </form>
              )}

              {/* Tab Content: Ventas Fábrica */}
              {activeTab === 'fabrica' && (
                <TablaVentas
                  ventas={ventasFabrica}
                  onEditar={!cerrado ? (v: any) => setVentaAEditar(v) : undefined}
                  onEliminar={!cerrado ? (v: any) => setItemAEliminar({
                    tipo: 'venta',
                    id: v.id,
                    titulo: 'Eliminar Venta de Planta',
                    detalle: `${v.descripcion} (${v.cantidad} un. x ${clp(v.precio_unitario)})`,
                    subtotal: v.subtotal,
                  }) : undefined}
                />
              )}

              {/* Tab Content: Otros Ingresos */}
              {activeTab === 'otros' && (
                <TablaVentas
                  ventas={ventasOtras}
                  onEditar={!cerrado ? (v: any) => setVentaAEditar(v) : undefined}
                  onEliminar={!cerrado ? (v: any) => setItemAEliminar({
                    tipo: 'venta',
                    id: v.id,
                    titulo: 'Eliminar Otro Ingreso',
                    detalle: `${v.descripcion} (${v.cantidad} un. x ${clp(v.precio_unitario)})`,
                    subtotal: v.subtotal,
                  }) : undefined}
                />
              )}

              {/* Tab Content: Gastos */}
              {activeTab === 'gastos' && (
                <div>
                  {gastos.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 space-y-1">
                      <TrendingDown className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-bold text-xs text-slate-600">No hay egresos registrados</p>
                      <p className="text-[11px] text-slate-400">Los retiros de efectivo aparecerán listados aquí</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                            <th className="py-3 px-4">Categoría</th>
                            <th className="py-3 px-4">Descripción / Motivo</th>
                            <th className="py-3 px-4 text-right">Monto</th>
                            {!cerrado && <th className="py-3 px-4 text-center w-20">Acciones</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {gastos.map((g: any) => (
                            <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-4">
                                <span className="inline-block bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                                  {g.tipo}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-800">{g.descripcion}</td>
                              <td className="py-3 px-4 text-right font-black text-rose-600 text-sm">{clp(g.monto)}</td>
                              {!cerrado && (
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => setGastoAEditar(g)}
                                      className="p-1 text-slate-400 hover:text-[#013299] hover:bg-blue-50 rounded-md transition-colors"
                                      title="Editar egreso"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setItemAEliminar({
                                        tipo: 'gasto',
                                        id: g.id,
                                        titulo: 'Eliminar Egreso de Caja',
                                        detalle: `${g.tipo}: ${g.descripcion}`,
                                        subtotal: g.monto,
                                      })}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                      title="Eliminar egreso"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-rose-50/60 font-black text-rose-900 border-t-2 border-rose-100">
                            <td colSpan={2} className="py-3 px-4 uppercase text-[11px]">Total Egresos de Caja</td>
                            <td className="py-3 px-4 text-right text-sm">{clp(totalGastos)}</td>
                            {!cerrado && <td />}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            VISTA 2: HISTORIAL Y RESULTADOS MENSUALES
        ═══════════════════════════════════════════════════════════════════ */}
        {vistaModo === 'historial' && (
          <div className="space-y-6">

            {/* Barra de Filtro de Período y Buscador Directo por Día */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Selector de Mes / Año */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                    <Calendar className="h-4 w-4 text-[#013299]" />
                    <span>Período:</span>
                  </div>
                  <select
                    value={mesFiltro}
                    onChange={e => {
                      setMesFiltro(parseInt(e.target.value));
                      setFiltroFechaExacta('');
                    }}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#013299]/20"
                  >
                    {MESES.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                  <select
                    value={anioFiltro}
                    onChange={e => {
                      setAnioFiltro(parseInt(e.target.value));
                      setFiltroFechaExacta('');
                    }}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#013299]/20"
                  >
                    {ANIOS.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                {/* Buscador de Cierre por Día Específico */}
                <div className="flex items-center gap-2 flex-wrap bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1.5 pl-2 text-xs font-bold text-slate-700">
                    <CalendarDays className="h-4 w-4 text-[#013299]" />
                    <span>Buscador por día:</span>
                  </div>
                  <input
                    type="date"
                    value={filtroFechaExacta}
                    onChange={e => {
                      const ajustada = handleDateInputSoloHabiles(e.target.value, (msg) => showToast('err', msg));
                      setFiltroFechaExacta(ajustada);
                    }}
                    className="border border-slate-200 bg-white rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013299]/20"
                  />
                  <button
                    onClick={() => handleBuscarPorDia(filtroFechaExacta)}
                    disabled={!filtroFechaExacta || cargandoHistorial}
                    className="px-3 py-1.5 bg-[#013299] hover:bg-blue-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {cargandoHistorial ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    Buscar y Ver Detalle
                  </button>
                  {filtroFechaExacta && (
                    <button
                      onClick={() => setFiltroFechaExacta('')}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                      title="Quitar filtro de día"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-barra: Filtro por texto y contador */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por folio (ej: CC-B6C4) o responsable..."
                    value={filtroTexto}
                    onChange={e => setFiltroTexto(e.target.value)}
                    className="border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#013299]/20 w-64"
                  />
                  {(filtroTexto || filtroFechaExacta) && (
                    <button
                      onClick={() => {
                        setFiltroTexto('');
                        setFiltroFechaExacta('');
                      }}
                      className="text-[11px] text-[#013299] hover:underline font-bold"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>

                <div className="font-medium">
                  {cargandoHistorial ? (
                    <span className="flex items-center gap-1.5 text-[#013299]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando registros...
                    </span>
                  ) : (
                    <span>
                      Mostrando <strong>{cierresFiltrados.length}</strong> de {cierresMensuales.length} jornada(s) en {nombreMesSeleccionado} {anioFiltro}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Resumen Mensual (4 Tarjetas KPI) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Total Ingresos Mes */}
              <div className="bg-gradient-to-br from-[#013299] via-blue-900 to-indigo-950 text-white rounded-2xl p-5 shadow-xl shadow-blue-900/20 ring-1 ring-blue-400/30 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-200">TOTAL INGRESOS MES</span>
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-black tracking-tight text-white">{clp(totalIngresosMes)}</p>
                  <p className="text-[11px] text-blue-200/90 font-medium mt-1">
                    Acumulado en {nombreMesSeleccionado} {anioFiltro}
                  </p>
                </div>
              </div>

              {/* Total Egresos Mes */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Total Egresos Mes</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-black text-rose-600">-{clp(totalGastosMes)}</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Gastos operativos autorizados
                  </p>
                </div>
              </div>

              {/* Total Efectivo Recaudado */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Efectivo Recaudado</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                    <Banknote className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-black text-emerald-700">{clp(totalEfectivoMes)}</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Total ventas en efectivo del mes
                  </p>
                </div>
              </div>

              {/* Días Operados */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Jornadas Registradas</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#013299] border border-blue-100">
                    <Calendar className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">{cierresMensuales.length} días</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Cierres de caja en {nombreMesSeleccionado}
                  </p>
                </div>
              </div>

            </div>

            {/* Desglose por Método de Pago en el Mes */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3 flex items-center justify-between flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                <CreditCard className="h-4 w-4 text-[#013299]" />
                <span>Medios de pago del mes ({nombreMesSeleccionado}):</span>
              </div>
              <div className="flex items-center gap-4 sm:gap-6 flex-wrap text-slate-700">
                <div className="flex items-center gap-1.5 font-medium">
                  <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-slate-500">Efectivo:</span>
                  <span className="font-black text-slate-900">{clp(cierresMensuales.reduce((s, c) => s + (c.total_efectivo || 0), 0))}</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-slate-500">Tarjeta:</span>
                  <span className="font-black text-slate-900">{clp(cierresMensuales.reduce((s, c) => s + (c.total_tarjeta || 0), 0))}</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <ArrowUpDown className="h-3.5 w-3.5 text-purple-600" />
                  <span className="text-slate-500">Transferencia:</span>
                  <span className="font-black text-slate-900">{clp(cierresMensuales.reduce((s, c) => s + (c.total_transferencia || 0), 0))}</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Building className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-slate-500">Crédito Oficina:</span>
                  <span className="font-black text-slate-900">{clp(cierresMensuales.reduce((s, c) => s + (c.total_credito_oficina || 0), 0))}</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Globe className="h-3.5 w-3.5 text-rose-600" />
                  <span className="text-slate-500">Página Web:</span>
                  <span className="font-black text-slate-900">{clp(cierresMensuales.reduce((s, c) => s + (c.total_pagina_web || 0), 0))}</span>
                </div>
              </div>
            </div>

            {/* Tabla del Historial de Cierres Diarios */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Detalle Diario de Cierres ({nombreMesSeleccionado} {anioFiltro})</h3>
                  <p className="text-xs text-slate-500">Historial jornada a jornada para auditoría y control financiero</p>
                </div>
              </div>

              {cierresMensuales.length === 0 ? (
                <div className="p-16 text-center text-slate-400 space-y-2">
                  <Calendar className="h-10 w-10 mx-auto text-slate-300" />
                  <p className="font-bold text-sm text-slate-700">No se encontraron cierres de caja en este mes</p>
                  <p className="text-xs text-slate-400">Selecciona otro período en el filtro superior o registra ventas hoy.</p>
                </div>
              ) : cierresFiltrados.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Search className="h-8 w-8 mx-auto text-slate-300" />
                  <p className="font-bold text-sm text-slate-700">No hay cierres que coincidan con la búsqueda</p>
                  <p className="text-xs text-slate-400">Filtro aplicado: {filtroFechaExacta || filtroTexto}</p>
                  <button
                    onClick={() => {
                      setFiltroFechaExacta('');
                      setFiltroTexto('');
                    }}
                    className="mt-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Restablecer filtros
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        <th className="py-3.5 px-4">Fecha</th>
                        <th className="py-3.5 px-4">Folio</th>
                        <th className="py-3.5 px-4">Responsable</th>
                        <th className="py-3.5 px-4 text-right">Total Ingresos</th>
                        <th className="py-3.5 px-4 text-right">Fondo Base</th>
                        <th className="py-3.5 px-4 text-right">Egresos</th>
                        <th className="py-3.5 px-4 text-right">Efectivo Final</th>
                        <th className="py-3.5 px-4 text-center">Estado</th>
                        <th className="py-3.5 px-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {cierresFiltrados.map((c: any) => {
                        const gSum = (c.gastos || []).reduce((s: number, g: any) => s + g.monto, 0);
                        const efFinal = (c.efectivo_inicial || 0) + (c.total_efectivo || 0) - gSum;
                        const esCerrado = c.estado === 'CERRADO';
                        return (
                          <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {new Date(c.fecha).toLocaleDateString('es-CL', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short' })}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-[#013299]">
                              CC-{c.id.slice(-6).toUpperCase()}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-800">
                              {c.usuario?.nombre || 'Administración'}
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-[#013299] text-sm">
                              {clp(c.total_general)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-semibold text-slate-600">
                              {clp(c.efectivo_inicial)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                              -{clp(gSum)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                              {clp(efFinal)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${esCerrado
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-blue-50 text-[#013299] border-blue-200'
                                }`}>
                                {c.estado}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => setDetalleCierreModal(c)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors text-[11px] inline-flex items-center gap-1.5 shadow-2xs"
                              >
                                <Eye className="h-3.5 w-3.5 text-[#013299]" /> Detalle
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
                        <td colSpan={3} className="py-3.5 px-4 uppercase text-[11px]">TOTAL ACUMULADO DEL MES</td>
                        <td className="py-3.5 px-4 text-right text-sm text-[#013299]">{clp(totalIngresosMes)}</td>
                        <td className="py-3.5 px-4 text-right text-slate-600">
                          {clp(cierresMensuales.reduce((s, c) => s + (c.efectivo_inicial || 0), 0))}
                        </td>
                        <td className="py-3.5 px-4 text-right text-rose-600">-{clp(totalGastosMes)}</td>
                        <td className="py-3.5 px-4 text-right text-slate-900">
                          {clp(cierresMensuales.reduce((s, c) => {
                            const gs = (c.gastos || []).reduce((gss: number, g: any) => gss + g.monto, 0);
                            return s + ((c.efectivo_inicial || 0) + (c.total_efectivo || 0) - gs);
                          }, 0))}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          DOCUMENTO OFICIAL DE IMPRESIÓN (Visible ÚNICAMENTE al imprimir)
          Diseñado para calzar EXACTAMENTE en 1 sola hoja Carta o A4.
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden print:block text-slate-900 bg-white font-sans text-xs print-document">

        {(cierreParaImpresion || vistaModo === 'diario') ? (
          /* ── IMPRESIÓN DIARIA (VOUCHER OFICIAL) ── */
          <>
            <div className="border-b-2 border-[#013299] pb-3 mb-3 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-[#013299] tracking-tight uppercase">SODATAL</span>
                  <span className="bg-blue-100 text-[#013299] text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Agua Purificada & Soda
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Sistema Integral de Gestión y Operaciones (SIGO)
                </p>
              </div>
              <div className="text-right">
                <h1 className="text-base font-black text-slate-900 uppercase tracking-tight">Comprobante de Cierre de Caja</h1>
                <p className="text-[10px] text-slate-600 font-bold mt-0.5">
                  Folio: <span className="text-[#013299] font-mono">{folioDocImpresion}</span> • Fecha: <span className="capitalize">{fechaDocImpresion}</span>
                </p>
                <p className="text-[9px] text-slate-400 font-medium">
                  Emitido a las {horaActual()} hrs • Responsable: {cierreDocImpresion.usuario?.nombre || 'Administración'} • Estado: <strong className="uppercase">{cierreDocImpresion.estado}</strong>
                </p>
              </div>
            </div>

            {/* Cuadro Resumen Ejecutivo */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="border-2 border-[#013299] rounded-lg p-2 text-center bg-blue-50/40">
                <span className="text-[9px] font-black text-[#013299] uppercase block">TOTAL INGRESOS</span>
                <span className="text-base font-black text-[#013299]">{clp(totalGeneralDocImpresion)}</span>
              </div>
              <div className="border border-slate-300 rounded-lg p-2 text-center bg-slate-50/50">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Caja Inicial</span>
                <span className="text-sm font-black text-slate-800">{clp(cierreDocImpresion.efectivo_inicial)}</span>
              </div>
              <div className="border border-slate-300 rounded-lg p-2 text-center bg-slate-50/50">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Total Gastos</span>
                <span className="text-sm font-black text-rose-700">-{clp(totalGastoDocImpresion)}</span>
              </div>
              <div className="border border-slate-300 rounded-lg p-2 text-center bg-slate-50/50">
                <span className="text-[9px] font-bold text-slate-600 uppercase block">Efectivo en Caja</span>
                <span className="text-sm font-black text-slate-900">{clp(efectivoEnCajaDocImpresion)}</span>
              </div>
            </div>

            {/* Desglose por método de pago */}
            <div className="mb-3 border border-slate-300 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-700 border-b border-slate-200">
                Desglose de Ventas por Método de Pago
              </div>
              <table className="w-full text-[10px] text-center border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="py-1 px-2">Efectivo</th>
                    <th className="py-1 px-2">Tarjeta / POS</th>
                    <th className="py-1 px-2">Transferencia</th>
                    <th className="py-1 px-2">Crédito Oficina</th>
                    <th className="py-1 px-2">Página Web</th>
                    <th className="py-1 px-2 bg-slate-100 font-black text-slate-900">Total General</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-black text-slate-800">
                    <td className="py-1.5 px-2">{clp(cierreDocImpresion.total_efectivo)}</td>
                    <td className="py-1.5 px-2">{clp(cierreDocImpresion.total_tarjeta)}</td>
                    <td className="py-1.5 px-2">{clp(cierreDocImpresion.total_transferencia)}</td>
                    <td className="py-1.5 px-2">{clp(cierreDocImpresion.total_credito_oficina)}</td>
                    <td className="py-1.5 px-2">{clp(cierreDocImpresion.total_pagina_web)}</td>
                    <td className="py-1.5 px-2 bg-slate-50 text-[#013299] text-xs font-black">{clp(totalGeneralDocImpresion)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Detalle Ventas */}
            <div className="mb-3 border border-slate-300 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 flex justify-between">
                <span>Detalle de Ventas ({ventasDocImpresion.length} ítems)</span>
                <span>Total: {clp(totalGeneralDocImpresion)}</span>
              </div>
              <table className="w-full text-[9px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="py-1 px-2 w-6 text-center">#</th>
                    <th className="py-1 px-2">Descripción</th>
                    <th className="py-1 px-2 text-center w-12">Cant.</th>
                    <th className="py-1 px-2 text-right w-16">P. Unit.</th>
                    <th className="py-1 px-2 text-right w-20">Subtotal</th>
                    <th className="py-1 px-2 text-center w-24">Método Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ventasDocImpresion.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-2 px-2 text-center text-slate-400 font-semibold italic">
                        Sin ventas registradas durante el turno
                      </td>
                    </tr>
                  ) : (
                    ventasDocImpresion.map((v: any, idx: number) => (
                      <tr key={v.id}>
                        <td className="py-0.5 px-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-0.5 px-2 font-semibold text-slate-800">
                          {v.descripcion} {v.es_otro && <span className="text-[8px] text-purple-600 font-bold">(Otro)</span>}
                        </td>
                        <td className="py-0.5 px-2 text-center font-bold">{v.cantidad}</td>
                        <td className="py-0.5 px-2 text-right">{clp(v.precio_unitario)}</td>
                        <td className="py-0.5 px-2 text-right font-black text-slate-900">{clp(v.subtotal)}</td>
                        <td className="py-0.5 px-2 text-center font-semibold text-slate-600">
                          {METODO_LABELS[v.metodo_pago as MetodoPagoCaja] || v.metodo_pago}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Detalle Gastos */}
            {gastosDocImpresion.length > 0 && (
              <div className="mb-3 border border-slate-300 rounded-lg overflow-hidden">
                <div className="bg-rose-50 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-rose-800 border-b border-rose-200 flex justify-between">
                  <span>Detalle de Egresos y Salidas de Caja ({gastosDocImpresion.length} ítems)</span>
                  <span>Total Egresos: -{clp(totalGastoDocImpresion)}</span>
                </div>
                <table className="w-full text-[9px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <th className="py-1 px-2 w-20">Categoría</th>
                      <th className="py-1 px-2">Descripción / Motivo del Egreso</th>
                      <th className="py-1 px-2 text-right w-24">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gastosDocImpresion.map((g: any) => (
                      <tr key={g.id}>
                        <td className="py-0.5 px-2 font-bold text-rose-700 uppercase text-[8px]">{g.tipo}</td>
                        <td className="py-0.5 px-2 text-slate-700">{g.descripcion}</td>
                        <td className="py-0.5 px-2 text-right font-black text-rose-700">-{clp(g.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          /* ── IMPRESIÓN MENSUAL CONSOLIDADA ── */
          <>
            <div className="border-b-2 border-[#013299] pb-3 mb-3 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-[#013299] tracking-tight uppercase">SODATAL</span>
                  <span className="bg-blue-100 text-[#013299] text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Agua Purificada & Soda
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Informe Consolidado Mensual de Cuadratura y Cierre de Caja
                </p>
              </div>
              <div className="text-right">
                <h1 className="text-base font-black text-slate-900 uppercase tracking-tight">Reporte Mensual de Caja</h1>
                <p className="text-[10px] text-slate-600 font-bold mt-0.5">
                  Período: <span className="text-[#013299] font-bold uppercase">{nombreMesSeleccionado} {anioFiltro}</span>
                </p>
                <p className="text-[9px] text-slate-400 font-medium">
                  Fecha de Emisión: {hoyFormateado()} a las {horaActual()} hrs
                </p>
              </div>
            </div>

            {/* Resumen Mensual 4 Columnas */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="border-2 border-[#013299] rounded-lg p-2 text-center bg-blue-50/40">
                <span className="text-[9px] font-black text-[#013299] uppercase block">TOTAL INGRESOS MES</span>
                <span className="text-base font-black text-[#013299]">{clp(totalIngresosMes)}</span>
              </div>
              <div className="border border-slate-300 rounded-lg p-2 text-center bg-slate-50/50">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Total Egresos Mes</span>
                <span className="text-sm font-black text-rose-700">-{clp(totalGastosMes)}</span>
              </div>
              <div className="border border-slate-300 rounded-lg p-2 text-center bg-slate-50/50">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Efectivo Recaudado</span>
                <span className="text-sm font-black text-slate-800">{clp(totalEfectivoMes)}</span>
              </div>
              <div className="border border-slate-300 rounded-lg p-2 text-center bg-slate-50/50">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Jornadas Operadas</span>
                <span className="text-sm font-black text-slate-800">{cierresMensuales.length} días</span>
              </div>
            </div>

            {/* Tabla Mensual Detalle Jornada a Jornada */}
            <div className="mb-3 border border-slate-300 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-700 border-b border-slate-200">
                Detalle Diario del Mes ({nombreMesSeleccionado} {anioFiltro})
              </div>
              <table className="w-full text-[9px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="py-1 px-2">Fecha</th>
                    <th className="py-1 px-2">Folio</th>
                    <th className="py-1 px-2">Responsable</th>
                    <th className="py-1 px-2 text-right">Ingresos</th>
                    <th className="py-1 px-2 text-right">Fondo Base</th>
                    <th className="py-1 px-2 text-right">Egresos</th>
                    <th className="py-1 px-2 text-right">Efectivo Final</th>
                    <th className="py-1 px-2 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cierresMensuales.map((c: any) => {
                    const gSum = (c.gastos || []).reduce((s: number, g: any) => s + g.monto, 0);
                    const efFinal = (c.efectivo_inicial || 0) + (c.total_efectivo || 0) - gSum;
                    return (
                      <tr key={c.id}>
                        <td className="py-0.5 px-2 font-semibold">
                          {new Date(c.fecha).toLocaleDateString('es-CL', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </td>
                        <td className="py-0.5 px-2 font-mono">CC-{c.id.slice(-6).toUpperCase()}</td>
                        <td className="py-0.5 px-2">{c.usuario?.nombre || 'Administración'}</td>
                        <td className="py-0.5 px-2 text-right font-black text-[#013299]">{clp(c.total_general)}</td>
                        <td className="py-0.5 px-2 text-right">{clp(c.efectivo_inicial)}</td>
                        <td className="py-0.5 px-2 text-right text-rose-700">-{clp(gSum)}</td>
                        <td className="py-0.5 px-2 text-right font-black">{clp(efFinal)}</td>
                        <td className="py-0.5 px-2 text-center uppercase text-[8px] font-bold">{c.estado}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black border-t border-slate-300">
                    <td colSpan={3} className="py-1 px-2 uppercase">TOTAL MES</td>
                    <td className="py-1 px-2 text-right text-[#013299]">{clp(totalIngresosMes)}</td>
                    <td className="py-1 px-2 text-right">{clp(cierresMensuales.reduce((s, c) => s + (c.efectivo_inicial || 0), 0))}</td>
                    <td className="py-1 px-2 text-right text-rose-700">-{clp(totalGastosMes)}</td>
                    <td className="py-1 px-2 text-right">{clp(cierresMensuales.reduce((s, c) => {
                      const gs = (c.gastos || []).reduce((gss: number, g: any) => gss + g.monto, 0);
                      return s + ((c.efectivo_inicial || 0) + (c.total_efectivo || 0) - gs);
                    }, 0))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}

        {/* ── BLOQUE DE FIRMAS Y VALIDADACIÓN (Al pie) ── */}
        <div className="pt-6 mt-4 border-t-2 border-slate-200 flex justify-between items-end text-[9px] text-slate-500">
          <div className="space-y-1">
            <p className="font-bold text-slate-700">SODATAL - Agua Purificada & Soda</p>
            <p>Documento de arqueo oficial generado por SIGO Sodatal.</p>
            <p className="text-[8px] text-slate-400">Válido para respaldo contable y rendición de fondos.</p>
          </div>

          <div className="flex gap-10">
            <div className="w-44 text-center">
              <div className="border-b border-slate-400 mb-1 h-8" />
              <p className="font-bold text-slate-800">Firma Cajero / Responsable</p>
              <p className="text-[8px] text-slate-400">{cierre.usuario?.nombre || 'Operador de Turno'}</p>
            </div>
            <div className="w-44 text-center">
              <div className="border-b border-slate-400 mb-1 h-8" />
              <p className="font-bold text-slate-800">Firma Administración</p>
              <p className="text-[8px] text-slate-400">Revisión y Conforme</p>
            </div>
          </div>
        </div>

      </div>

      {/* ── ESTILOS GLOBALES DE IMPRESIÓN (Ajuste Perfecto a 1 Hoja Carta/A4) ── */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: portrait;
            margin: 8mm 10mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          nav, aside, header, footer, .sidebar, #sidebar {
            display: none !important;
          }
          .print-document {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}} />
    </>
  );
}

// ── Sub-componente: Tabla de Ventas (Pantalla Web) ────────────────────────────
function TablaVentas({
  ventas,
  onEditar,
  onEliminar,
}: {
  ventas: any[];
  onEditar?: (v: any) => void;
  onEliminar?: (v: any) => void;
}) {
  if (ventas.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-1">
        <Package className="h-8 w-8 mx-auto text-slate-300 mb-2" />
        <p className="font-bold text-xs text-slate-600">No hay ventas registradas</p>
        <p className="text-[11px] text-slate-400">Las ventas añadidas aparecerán en esta lista</p>
      </div>
    );
  }

  const total = ventas.reduce((s: number, v: any) => s + v.subtotal, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
            <th className="py-3 px-4">Descripción</th>
            <th className="py-3 px-4 text-center">Cant.</th>
            <th className="py-3 px-4 text-right">P. Unitario</th>
            <th className="py-3 px-4 text-right">Subtotal</th>
            <th className="py-3 px-4 text-center">Método de Pago</th>
            {(onEditar || onEliminar) && <th className="py-3 px-4 text-center w-20">Acciones</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {ventas.map((v: any) => {
            const Icon = METODO_ICONS[v.metodo_pago as MetodoPagoCaja] || Banknote;
            const style = METODO_COLORS[v.metodo_pago as MetodoPagoCaja] || METODO_COLORS.EFECTIVO;
            return (
              <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-800">
                  {v.descripcion}
                  {v.es_otro && (
                    <span className="ml-2 inline-block bg-purple-50 text-purple-700 text-[9px] font-bold px-1.5 py-0.2 rounded">
                      Otro
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-center font-bold text-slate-700">{v.cantidad}</td>
                <td className="py-3 px-4 text-right text-slate-600">{clp(v.precio_unitario)}</td>
                <td className="py-3 px-4 text-right font-black text-slate-900">{clp(v.subtotal)}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${style.bg} ${style.border} ${style.text}`}>
                    <Icon className="h-3 w-3" />
                    {METODO_LABELS[v.metodo_pago as MetodoPagoCaja] || v.metodo_pago}
                  </span>
                </td>
                {(onEditar || onEliminar) && (
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {onEditar && (
                        <button
                          onClick={() => onEditar(v)}
                          className="p-1 text-slate-400 hover:text-[#013299] hover:bg-blue-50 rounded-md transition-colors"
                          title="Editar registro"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {onEliminar && (
                        <button
                          onClick={() => onEliminar(v)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Eliminar registro"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50/90 font-black text-slate-900 border-t-2 border-slate-200">
            <td colSpan={3} className="py-3 px-4 uppercase text-[11px]">Subtotal Sección</td>
            <td className="py-3 px-4 text-right text-sm text-[#013299]">{clp(total)}</td>
            <td colSpan={(onEditar || onEliminar) ? 2 : 1} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
