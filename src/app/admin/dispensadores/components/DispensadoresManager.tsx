'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  crearDispensadorIndependienteAction, 
  editarDispensadorIndependienteAction,
  asignarDispensadorAClienteAction,
  retirarDispensadorDeClienteAction,
  darDeBajaDispensadorAction,
  eliminarDispensadorIndependienteAction,
  enviarATallerConReemplazoAction,
  finalizarTallerAction,
  DispensadorInput
} from '../actions';
import { 
  Search, Plus, Edit2, Trash2, UserPlus, UserMinus, ShieldAlert, 
  Package, Wrench, CheckCircle2, Ban, X, AlertTriangle, Info, ChevronDown, RefreshCw
} from 'lucide-react';

interface Props {
  initialDispensadores: any[];
  initialClientes: any[];
}

// Buscador de clientes optimizado para modales
function SearchableClientSelect({
  clientes,
  selectedId,
  onSelect,
  placeholder = "Escribe para buscar cliente por nombre o dirección..."
}: {
  clientes: any[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  placeholder?: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

  const selectedCliente = clientes.find(c => c.id === selectedId);

  const filtered = searchTerm.trim()
    ? clientes.filter(c => {
        const q = searchTerm.toLowerCase();
        return c.nombre.toLowerCase().includes(q) || (c.direccion || '').toLowerCase().includes(q);
      })
    : (showAll ? clientes : []);

  return (
    <div className="space-y-2">
      {selectedCliente ? (
        <div className="flex items-center justify-between p-3 bg-blue-50/90 border border-blue-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <CheckCircle2 className="h-5 w-5 text-[#013299] shrink-0" />
            <div className="truncate">
              <div className="font-extrabold text-xs text-slate-900 truncate">{selectedCliente.nombre}</div>
              <div className="text-[11px] text-slate-500 truncate">{selectedCliente.direccion || 'Sin dirección'}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { onSelect(null); setSearchTerm(''); setShowAll(false); }}
            className="text-xs text-slate-600 hover:text-rose-600 font-bold px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm shrink-0 transition-colors"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center border border-slate-200 rounded-xl px-3 py-2 bg-white focus-within:border-[#013299] focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Search className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              placeholder={placeholder}
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setShowAll(false); }}
              className="w-full text-sm text-slate-800 outline-none bg-transparent placeholder:text-slate-400"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setShowAll(false); }}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                title="Ver lista completa de clientes"
                className="text-slate-400 hover:text-[#013299] p-0.5 flex items-center gap-1 text-xs font-semibold"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {!searchTerm.trim() && !showAll && (
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Escribe para buscar entre los {clientes.length} clientes...</span>
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="text-[#013299] font-semibold hover:underline"
              >
                Ver todos los clientes
              </button>
            </div>
          )}

          {(searchTerm.trim().length > 0 || showAll) && (
            <div className="border border-slate-200 rounded-xl bg-white max-h-48 overflow-y-auto divide-y divide-slate-100 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  setSearchTerm('');
                  setShowAll(false);
                }}
                className="w-full text-left p-2 text-xs italic text-slate-500 hover:bg-slate-50 font-medium"
              >
                — Sin cliente asignado (Dejar en Bodega) —
              </button>
              {filtered.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 text-center">
                  No se encontraron clientes coincidentes con "{searchTerm}".
                </div>
              ) : (
                filtered.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelect(c.id);
                      setSearchTerm('');
                      setShowAll(false);
                    }}
                    className="w-full text-left p-2.5 hover:bg-blue-50/70 transition-colors flex flex-col gap-0.5"
                  >
                    <div className="font-bold text-xs text-slate-800">{c.nombre}</div>
                    <div className="text-[11px] text-slate-400 truncate">{c.direccion || 'Sin dirección'}</div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Buscador de dispensadores de reemplazo (Bodega) optimizado para modales
function SearchableDispenserSelect({
  dispensadores,
  selectedId,
  onSelect,
  placeholder = "Buscar por marca, modelo o N° de serie..."
}: {
  dispensadores: any[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  placeholder?: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

  const selectedDispenser = dispensadores.find(d => d.id === selectedId);

  const filtered = searchTerm.trim()
    ? dispensadores.filter(d => {
        const q = searchTerm.toLowerCase();
        return (
          d.marca.toLowerCase().includes(q) ||
          (d.modelo || '').toLowerCase().includes(q) ||
          (d.numero_serie || '').toLowerCase().includes(q)
        );
      })
    : (showAll ? dispensadores : []);

  return (
    <div className="space-y-2">
      {selectedDispenser ? (
        <div className="flex items-center justify-between p-3 bg-purple-50/90 border border-purple-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <CheckCircle2 className="h-5 w-5 text-purple-700 shrink-0" />
            <div className="truncate">
              <div className="font-extrabold text-xs text-slate-900 truncate">
                {selectedDispenser.marca} {selectedDispenser.modelo}
              </div>
              <div className="text-[11px] text-purple-700 font-mono font-bold truncate">
                N° Serie: {selectedDispenser.numero_serie || 'Sin S/N'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { onSelect(null); setSearchTerm(''); setShowAll(false); }}
            className="text-xs text-slate-600 hover:text-rose-600 font-bold px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm shrink-0 transition-colors"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center border border-slate-200 rounded-xl px-3 py-2 bg-white focus-within:border-[#013299] focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Search className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              placeholder={placeholder}
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setShowAll(false); }}
              className="w-full text-sm text-slate-800 outline-none bg-transparent placeholder:text-slate-400"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setShowAll(false); }}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                title="Ver todas las máquinas disponibles"
                className="text-slate-400 hover:text-[#013299] p-0.5 flex items-center gap-1 text-xs font-semibold"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {!searchTerm.trim() && !showAll && (
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Escribe para buscar entre las {dispensadores.length} máquinas en bodega...</span>
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="text-[#013299] font-semibold hover:underline"
              >
                Ver todas ({dispensadores.length})
              </button>
            </div>
          )}

          {(searchTerm.trim().length > 0 || showAll) && (
            <div className="border border-slate-200 rounded-xl bg-white max-h-48 overflow-y-auto divide-y divide-slate-100 shadow-inner">
              {filtered.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 text-center">
                  No se encontraron máquinas de bodega que coincidan con "{searchTerm}".
                </div>
              ) : (
                filtered.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      onSelect(d.id);
                      setSearchTerm('');
                      setShowAll(false);
                    }}
                    className="w-full text-left p-2.5 hover:bg-purple-50/70 transition-colors flex flex-col gap-0.5"
                  >
                    <div className="font-bold text-xs text-slate-800">{d.marca} {d.modelo}</div>
                    <div className="text-[11px] text-slate-500 font-mono">N° Serie: {d.numero_serie || 'Sin S/N'}</div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DispensadoresManager({ initialDispensadores, initialClientes }: Props) {
  const router = useRouter();
  const [dispensadores, setDispensadores] = useState<any[]>(initialDispensadores);
  const [clientes] = useState<any[]>(initialClientes);

  // Sincronización cuando los datos iniciales cambian desde el servidor
  useEffect(() => {
    setDispensadores(initialDispensadores);
  }, [initialDispensadores]);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAsignarModalOpen, setIsAsignarModalOpen] = useState(false);
  const [isRetirarModalOpen, setIsRetirarModalOpen] = useState(false);
  const [isBajaModalOpen, setIsBajaModalOpen] = useState(false);
  const [isEliminarModalOpen, setIsEliminarModalOpen] = useState(false);
  const [isTallerModalOpen, setIsTallerModalOpen] = useState(false);
  const [isFinalizarTallerModalOpen, setIsFinalizarTallerModalOpen] = useState(false);

  // Dispensadores seleccionados para acciones en modales
  const [dispensadorSeleccionado, setDispensadorSeleccionado] = useState<any | null>(null);
  const [clienteAsignarId, setClienteAsignarId] = useState<string | null>(null);
  const [precioArriendoAsignar, setPrecioArriendoAsignar] = useState(0);

  // Taller y reemplazo
  const [dejarReemplazo, setDejarReemplazo] = useState(true);
  const [reemplazoSeleccionadoId, setReemplazoSeleccionadoId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modalErrorMsg, setModalErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState<DispensadorInput>({
    marca: '',
    modelo: '',
    numero_serie: '',
    precio_arriendo: 0,
    estado: 'DISPONIBLE' as any,
    cliente_id: null,
  });

  // Dispensadores disponibles en bodega para usar como reemplazo
  const dispensadoresBodegaDisponibles = dispensadores.filter(
    d => d.estado === 'DISPONIBLE' && d.id !== dispensadorSeleccionado?.id
  );

  const dispensadoresFiltrados = dispensadores.filter(d => {
    const q = busqueda.toLowerCase();
    const matchBusqueda = 
      d.marca.toLowerCase().includes(q) ||
      (d.modelo || '').toLowerCase().includes(q) ||
      (d.numero_serie || '').toLowerCase().includes(q) ||
      (d.cliente?.nombre || '').toLowerCase().includes(q);
    const matchEstado = filtroEstado === 'TODOS' || d.estado === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  const totalTotales = dispensadores.length;
  const totalDisponibles = dispensadores.filter(d => d.estado === 'DISPONIBLE').length;
  const totalEnCliente = dispensadores.filter(d => d.estado === 'EN_CLIENTE').length;
  const totalEnTaller = dispensadores.filter(d => d.estado === 'EN_TALLER').length;

  const handleOpenCreate = () => {
    setEditingId(null);
    setErrorMsg(null);
    setForm({
      marca: '',
      modelo: 'Estándar',
      numero_serie: '',
      precio_arriendo: 0,
      estado: 'DISPONIBLE' as any,
      cliente_id: null,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (d: any) => {
    setEditingId(d.id);
    setErrorMsg(null);
    setForm({
      marca: d.marca,
      modelo: d.modelo,
      numero_serie: d.numero_serie || '',
      precio_arriendo: d.precio_arriendo || 0,
      estado: d.estado,
      cliente_id: d.cliente_id || null,
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.marca) {
      setErrorMsg('La marca es obligatoria.');
      return;
    }

    startTransition(async () => {
      const res = editingId
        ? await editarDispensadorIndependienteAction(editingId, form)
        : await crearDispensadorIndependienteAction(form);

      if (res.success && res.data) {
        setDispensadores(prev => {
          const idx = prev.findIndex(item => item.id === res.data.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = res.data;
            return copy;
          }
          return [res.data, ...prev];
        });
        setIsModalOpen(false);
        router.refresh();
      } else {
        setErrorMsg(res.message || 'Error al guardar el dispensador.');
      }
    });
  };

  // Modal Asignar
  const handleOpenAsignarModal = (d: any) => {
    setDispensadorSeleccionado(d);
    setClienteAsignarId(d.cliente_id || null);
    setPrecioArriendoAsignar(d.precio_arriendo || 0);
    setModalErrorMsg(null);
    setIsAsignarModalOpen(true);
  };

  const handleConfirmAsignar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispensadorSeleccionado || !clienteAsignarId) {
      setModalErrorMsg('Debes seleccionar un cliente.');
      return;
    }

    startTransition(async () => {
      const res = await asignarDispensadorAClienteAction(dispensadorSeleccionado.id, clienteAsignarId, precioArriendoAsignar);
      if (res.success && res.data) {
        setDispensadores(prev => prev.map(item => item.id === res.data.id ? res.data : item));
        setIsAsignarModalOpen(false);
        router.refresh();
      } else {
        setModalErrorMsg(res.message || 'Error al asignar dispensador.');
      }
    });
  };

  // Modal Retirar
  const handleOpenRetirarModal = (d: any) => {
    setDispensadorSeleccionado(d);
    setModalErrorMsg(null);
    setIsRetirarModalOpen(true);
  };

  const handleConfirmRetirar = async () => {
    if (!dispensadorSeleccionado) return;

    startTransition(async () => {
      const res = await retirarDispensadorDeClienteAction(dispensadorSeleccionado.id, 'DISPONIBLE' as any);
      if (res.success && res.data) {
        setDispensadores(prev => prev.map(item => item.id === res.data.id ? res.data : item));
        setIsRetirarModalOpen(false);
        router.refresh();
      } else {
        setModalErrorMsg(res.message || 'Error al retirar el dispensador.');
      }
    });
  };

  // Modal Dar de Baja
  const handleOpenBajaModal = (d: any) => {
    setDispensadorSeleccionado(d);
    setModalErrorMsg(null);
    setIsBajaModalOpen(true);
  };

  const handleConfirmBaja = async () => {
    if (!dispensadorSeleccionado) return;

    startTransition(async () => {
      const res = await darDeBajaDispensadorAction(dispensadorSeleccionado.id);
      if (res.success && res.data) {
        setDispensadores(prev => prev.map(item => item.id === res.data.id ? res.data : item));
        setIsBajaModalOpen(false);
        router.refresh();
      } else {
        setModalErrorMsg(res.message || 'Error al dar de baja el dispensador.');
      }
    });
  };

  // Modal Eliminar
  const handleOpenEliminarModal = (d: any) => {
    setDispensadorSeleccionado(d);
    setModalErrorMsg(null);
    setIsEliminarModalOpen(true);
  };

  const handleConfirmEliminar = async () => {
    if (!dispensadorSeleccionado) return;

    startTransition(async () => {
      const res = await eliminarDispensadorIndependienteAction(dispensadorSeleccionado.id);
      if (res.success) {
        setDispensadores(prev => prev.filter(item => item.id !== dispensadorSeleccionado.id));
        setIsEliminarModalOpen(false);
        router.refresh();
      } else {
        setModalErrorMsg(res.message || 'No se puede eliminar un dispensador con registros vinculados.');
      }
    });
  };

  // Modal Enviar a Taller y Dejar Reemplazo
  const handleOpenTallerModal = (d: any) => {
    setDispensadorSeleccionado(d);
    setDejarReemplazo(!!d.cliente_id);
    setReemplazoSeleccionadoId(null);
    setModalErrorMsg(null);
    setIsTallerModalOpen(true);
  };

  const handleConfirmEnviarATaller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispensadorSeleccionado) return;

    const idReemplazo = (dejarReemplazo && dispensadorSeleccionado.cliente_id) ? reemplazoSeleccionadoId : null;

    startTransition(async () => {
      const res = await enviarATallerConReemplazoAction(dispensadorSeleccionado.id, idReemplazo);
      if (res.success && res.data) {
        setDispensadores(prev => prev.map(item => {
          if (item.id === res.data.id) return res.data;
          if (res.reemplazo && item.id === res.reemplazo.id) return res.reemplazo;
          return item;
        }));
        setIsTallerModalOpen(false);
        router.refresh();
      } else {
        setModalErrorMsg(res.message || 'Error al enviar a taller.');
      }
    });
  };

  // Modal Finalizar Taller
  const handleOpenFinalizarTallerModal = (d: any) => {
    setDispensadorSeleccionado(d);
    // Buscar si hay algún dispensador que esté REEMPLAZADO_TEMPORALMENTE para el cliente de este dispensador
    const reemplazoActual = dispensadores.find(
      item => item.cliente_id && item.cliente_id === d.cliente_id && item.estado === 'REEMPLAZADO_TEMPORALMENTE'
    );
    setReemplazoSeleccionadoId(reemplazoActual?.id || null);
    setModalErrorMsg(null);
    setIsFinalizarTallerModalOpen(true);
  };

  const handleConfirmFinalizarTaller = async () => {
    if (!dispensadorSeleccionado) return;

    startTransition(async () => {
      const res = await finalizarTallerAction(dispensadorSeleccionado.id, reemplazoSeleccionadoId);
      if (res.success && res.data) {
        setDispensadores(prev => prev.map(item => {
          if (item.id === res.data.id) return res.data;
          if (res.reemplazo && item.id === res.reemplazo.id) return res.reemplazo;
          return item;
        }));
        setIsFinalizarTallerModalOpen(false);
        router.refresh();
      } else {
        setModalErrorMsg(res.message || 'Error al finalizar reparación.');
      }
    });
  };

  const badgeEstado = (estado: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      DISPONIBLE: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Disponible (Bodega)' },
      EN_CLIENTE: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'En Cliente' },
      EN_TALLER: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'En Taller' },
      REEMPLAZADO_TEMPORALMENTE: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Reemplazo Temp.' },
      RETIRADO: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Retirado' },
      BAJA: { bg: 'bg-rose-100', text: 'text-rose-800', label: 'Dado de Baja' },
    };
    const info = map[estado] || { bg: 'bg-slate-100', text: 'text-slate-700', label: estado };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${info.bg} ${info.text}`}>{info.label}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-xl text-[#013299]">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Dispensadores</span>
            <span className="text-2xl font-black text-slate-800">{totalTotales}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Disponibles (Bodega)</span>
            <span className="text-2xl font-black text-emerald-600">{totalDisponibles}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
            <UserPlus className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">En Clientes</span>
            <span className="text-2xl font-black text-blue-600">{totalEnCliente}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">En Taller</span>
            <span className="text-2xl font-black text-amber-600">{totalEnTaller}</span>
          </div>
        </div>
      </div>

      {/* Controles y Búsqueda */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 border border-slate-200 rounded-xl px-3 py-2">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar por marca, modelo, N° de serie o cliente asignado..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="text-sm text-slate-800 placeholder:text-slate-400 outline-none w-full bg-transparent"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium bg-white outline-none"
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="DISPONIBLE">Disponibles en Bodega</option>
            <option value="EN_CLIENTE">Asignados a Cliente</option>
            <option value="EN_TALLER">En Taller / Mantención</option>
            <option value="REEMPLAZADO_TEMPORALMENTE">Reemplazo Temporal</option>
            <option value="RETIRADO">Retirados</option>
            <option value="BAJA">Dados de Baja</option>
          </select>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-95 transition-opacity"
            style={{ backgroundColor: '#013299' }}
          >
            <Plus className="h-4 w-4" /> Nuevo Dispensador
          </button>
        </div>
      </div>

      {/* Tabla de Dispensadores */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr style={{ backgroundColor: '#013299' }}>
                {['Marca / Modelo', 'N° Serie', 'Estado', 'Cliente Asignado', 'Precio Arriendo', 'Acciones'].map(h => (
                  <th key={h} className="py-3 px-5 text-left text-xs font-bold text-white uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dispensadoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                    No se encontraron dispensadores registrados.
                  </td>
                </tr>
              ) : (
                dispensadoresFiltrados.map(d => (
                  <tr key={d.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-extrabold text-slate-900">{d.marca}</div>
                      <div className="text-xs text-slate-400">{d.modelo}</div>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-xs font-bold text-slate-700">
                      {d.numero_serie || 'Sin N° Serie'}
                    </td>
                    <td className="py-3.5 px-5">
                      {badgeEstado(d.estado)}
                    </td>
                    <td className="py-3.5 px-5">
                      {d.cliente ? (
                        <div>
                          <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            {d.cliente.nombre}
                            {d.estado === 'REEMPLAZADO_TEMPORALMENTE' && (
                              <span className="bg-purple-100 text-purple-700 text-[10px] font-black uppercase px-1.5 py-0.5 rounded">Reemplazo</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">{d.cliente.direccion}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Dispensador libre (Sin cliente)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 font-black text-slate-800">
                      ${(d.precio_arriendo || 0).toLocaleString('es-CL')} / mes
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Botón Enviar a Taller vs Finalizar Taller */}
                        {d.estado === 'EN_TALLER' ? (
                          <button
                            onClick={() => handleOpenFinalizarTallerModal(d)}
                            title="Finalizar reparación en taller"
                            className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Repuesto (Listo)
                          </button>
                        ) : (
                          d.estado !== 'BAJA' && d.estado !== 'RETIRADO' && (
                            <button
                              onClick={() => handleOpenTallerModal(d)}
                              title="Enviar a taller y asignar reemplazo"
                              className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg border border-amber-200 transition-colors"
                            >
                              <Wrench className="h-3.5 w-3.5" /> Enviar a Taller
                            </button>
                          )
                        )}

                        {/* Botón Asignar / Retirar */}
                        {d.cliente ? (
                          <button
                            onClick={() => handleOpenRetirarModal(d)}
                            title="Retirar del cliente"
                            className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-300 transition-colors"
                          >
                            <UserMinus className="h-3.5 w-3.5" /> Retirar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenAsignarModal(d)}
                            title="Asignar a cliente"
                            className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-200 transition-colors"
                          >
                            <UserPlus className="h-3.5 w-3.5" /> Asignar
                          </button>
                        )}

                        {d.estado !== 'BAJA' && (
                          <button
                            onClick={() => handleOpenBajaModal(d)}
                            title="Dar de baja el dispensador"
                            className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg border border-rose-200 transition-colors"
                          >
                            <Ban className="h-3.5 w-3.5" /> Dar de baja
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenEdit(d)}
                          title="Editar dispensador"
                          className="p-1.5 text-slate-500 hover:text-[#013299] hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEliminarModal(d)}
                          title="Eliminar dispensador"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar Dispensador */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh] border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center text-white shrink-0 rounded-t-2xl" style={{ backgroundColor: '#013299' }}>
              <h2 className="text-base font-bold">{editingId ? 'Editar Dispensador' : 'Nuevo Dispensador'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitForm} className="p-6 overflow-y-auto space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" /> {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Marca *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Oasis, Bacorp..."
                    value={form.marca}
                    onChange={e => setForm(p => ({ ...p, marca: e.target.value }))}
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-sm text-slate-800 outline-none focus:border-[#013299]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Modelo</label>
                  <input
                    type="text"
                    placeholder="Ej: Sobremesa, Frio-Calor"
                    value={form.modelo}
                    onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))}
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-sm text-slate-800 outline-none focus:border-[#013299]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Número de Serie</label>
                  <input
                    type="text"
                    placeholder="Ej: SN-982341"
                    value={form.numero_serie || ''}
                    onChange={e => setForm(p => ({ ...p, numero_serie: e.target.value }))}
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-sm text-slate-800 outline-none focus:border-[#013299]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Precio Arriendo ($/mes)</label>
                  <input
                    type="number"
                    placeholder="Ej: 5000"
                    value={form.precio_arriendo || ''}
                    onChange={e => setForm(p => ({ ...p, precio_arriendo: Number(e.target.value) }))}
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-sm text-slate-800 outline-none focus:border-[#013299]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Estado Actual</label>
                <select
                  value={form.estado}
                  onChange={e => {
                    const val = e.target.value as any;
                    setForm(p => ({
                      ...p,
                      estado: val,
                      cliente_id: (val === 'DISPONIBLE' || val === 'RETIRADO' || val === 'BAJA') ? null : p.cliente_id
                    }));
                  }}
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-sm text-slate-800 outline-none focus:border-[#013299] bg-white font-medium"
                >
                  <option value="DISPONIBLE">Disponible en Bodega</option>
                  <option value="EN_CLIENTE">En Cliente</option>
                  <option value="EN_TALLER">En Taller / Reparación</option>
                  <option value="REEMPLAZADO_TEMPORALMENTE">Reemplazado Temporalmente</option>
                  <option value="RETIRADO">Retirado</option>
                  <option value="BAJA">Dado de Baja</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Cliente Asignado (Buscador)</label>
                <SearchableClientSelect
                  clientes={clientes}
                  selectedId={form.cliente_id || null}
                  onSelect={cid => {
                    setForm(p => ({
                      ...p,
                      cliente_id: cid,
                      estado: cid 
                        ? (p.estado === 'DISPONIBLE' ? ('EN_CLIENTE' as any) : p.estado)
                        : (p.estado === 'EN_CLIENTE' ? ('DISPONIBLE' as any) : p.estado)
                    }));
                  }}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 font-medium hover:text-slate-800">Cancelar</button>
                <button type="submit" disabled={isPending} className="text-white px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-60 shadow-sm" style={{ backgroundColor: '#013299' }}>
                  {isPending ? 'Guardando...' : 'Guardar Dispensador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Enviar a Taller y Dejar Reemplazo */}
      {isTallerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col border border-slate-100 max-h-[90vh]">
            <div className="p-5 border-b border-amber-100 bg-amber-500 flex justify-between items-center text-white shrink-0 rounded-t-2xl">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Wrench className="h-5 w-5" /> Enviar a Taller / Servicio Técnico
              </h2>
              <button onClick={() => setIsTallerModalOpen(false)} className="text-white/80 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmEnviarATaller} className="p-6 space-y-4 overflow-y-auto">
              {modalErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" /> {modalErrorMsg}
                </div>
              )}

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <div>Enviando a taller: <b className="text-slate-900">{dispensadorSeleccionado?.marca} {dispensadorSeleccionado?.modelo}</b> ({dispensadorSeleccionado?.numero_serie || 'Sin S/N'}).</div>
                {dispensadorSeleccionado?.cliente ? (
                  <div className="text-amber-800">Pertenece/asignado a cliente: <b>{dispensadorSeleccionado.cliente.nombre}</b>.</div>
                ) : (
                  <div className="text-slate-500 italic">Dispensador actualmente libre en bodega.</div>
                )}
              </div>

              {dispensadorSeleccionado?.cliente && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={dejarReemplazo}
                      onChange={e => setDejarReemplazo(e.target.checked)}
                      className="h-4 w-4 text-[#013299] rounded border-slate-300 focus:ring-[#013299]"
                    />
                    <span>Dejar máquina de reemplazo temporal al cliente</span>
                  </label>

                  {dejarReemplazo && (
                    <div className="space-y-1.5 pl-6">
                      <label className="text-xs font-bold text-slate-600 uppercase block">Seleccionar máquina de reemplazo (de Bodega)</label>
                      {dispensadoresBodegaDisponibles.length === 0 ? (
                        <div className="p-3 bg-slate-100 text-slate-500 text-xs rounded-xl font-medium">
                          ⚠️ No hay otros dispensadores disponibles en bodega para entregar como reemplazo.
                        </div>
                      ) : (
                        <SearchableDispenserSelect
                          dispensadores={dispensadoresBodegaDisponibles}
                          selectedId={reemplazoSeleccionadoId}
                          onSelect={id => setReemplazoSeleccionadoId(id)}
                          placeholder="Buscar máquina de bodega por marca, modelo o N° serie..."
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsTallerModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 font-medium hover:text-slate-800">Cancelar</button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="text-white px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-60 bg-amber-600 hover:bg-amber-700 shadow-sm"
                >
                  {isPending ? 'Enviando a taller...' : 'Confirmar Ingreso a Taller'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Finalizar Taller */}
      {isFinalizarTallerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-emerald-100 bg-emerald-600 flex justify-between items-center text-white shrink-0 rounded-t-2xl">
              <h2 className="text-base font-bold flex items-center gap-2">
                <RefreshCw className="h-5 w-5" /> Finalizar Taller y Devolver Equipo
              </h2>
              <button onClick={() => setIsFinalizarTallerModalOpen(false)} className="text-white/80 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {modalErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" /> {modalErrorMsg}
                </div>
              )}

              <p className="text-sm text-slate-700">
                ¿Finalizar reparación de <b className="text-slate-900">{dispensadorSeleccionado?.marca} {dispensadorSeleccionado?.modelo}</b> ({dispensadorSeleccionado?.numero_serie || 'Sin S/N'})?
              </p>

              {reemplazoSeleccionadoId ? (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 text-purple-600 mt-0.5" />
                  <span>
                    La máquina de reemplazo temporal será recogida y devuelta a <b>Bodega (Disponible)</b>, mientras que la máquina reparada volverá a estar activa con el cliente <b>{dispensadorSeleccionado?.cliente?.nombre}</b>.
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>
                    El dispensador volverá a estado <b>{dispensadorSeleccionado?.cliente ? 'En Cliente' : 'Disponible (Bodega)'}</b>.
                  </span>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsFinalizarTallerModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 font-medium hover:text-slate-800">Cancelar</button>
                <button
                  type="button"
                  onClick={handleConfirmFinalizarTaller}
                  disabled={isPending}
                  className="text-white px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-60 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                  {isPending ? 'Finalizando...' : 'Finalizar y Activar Equipo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Asignar a Cliente con Buscador */}
      {isAsignarModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col border border-slate-100 max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center text-white shrink-0 rounded-t-2xl" style={{ backgroundColor: '#013299' }}>
              <h2 className="text-base font-bold flex items-center gap-2">
                <UserPlus className="h-5 w-5" /> Asignar Dispensador a Cliente
              </h2>
              <button onClick={() => setIsAsignarModalOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmAsignar} className="p-6 space-y-4 overflow-y-auto">
              {modalErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" /> {modalErrorMsg}
                </div>
              )}

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-slate-700">
                Asignando dispensador <b className="text-slate-900">{dispensadorSeleccionado?.marca} {dispensadorSeleccionado?.modelo}</b> ({dispensadorSeleccionado?.numero_serie || 'Sin S/N'}).
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Buscar y Seleccionar Cliente *</label>
                <SearchableClientSelect
                  clientes={clientes}
                  selectedId={clienteAsignarId}
                  onSelect={id => setClienteAsignarId(id)}
                  placeholder="Escribe el nombre o dirección..."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Precio Arriendo Mensual ($)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={precioArriendoAsignar}
                  onChange={e => setPrecioArriendoAsignar(Number(e.target.value))}
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-sm text-slate-800 outline-none focus:border-[#013299]"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsAsignarModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 font-medium hover:text-slate-800">Cancelar</button>
                <button type="submit" disabled={isPending} className="text-white px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-60 bg-emerald-600 hover:bg-emerald-700 shadow-sm">
                  {isPending ? 'Asignando...' : 'Confirmar Asignación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Retirar Dispensador */}
      {isRetirarModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-amber-100 bg-amber-500 flex justify-between items-center text-white">
              <h2 className="text-base font-bold flex items-center gap-2">
                <UserMinus className="h-5 w-5" /> Retirar Dispensador
              </h2>
              <button onClick={() => setIsRetirarModalOpen(false)} className="text-white/80 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {modalErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" /> {modalErrorMsg}
                </div>
              )}

              <p className="text-sm text-slate-700">
                ¿Estás seguro de retirar el dispensador <b className="text-slate-900">{dispensadorSeleccionado?.marca} {dispensadorSeleccionado?.modelo}</b> ({dispensadorSeleccionado?.numero_serie || 'Sin S/N'})?
              </p>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  El cliente <b>{dispensadorSeleccionado?.cliente?.nombre}</b> ya no tendrá asignado este dispensador y su estado volverá a <b>Disponible (Bodega)</b>.
                </span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsRetirarModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 font-medium hover:text-slate-800">Cancelar</button>
                <button
                  type="button"
                  onClick={handleConfirmRetirar}
                  disabled={isPending}
                  className="text-white px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-60 bg-amber-600 hover:bg-amber-700 shadow-sm"
                >
                  {isPending ? 'Retirando...' : 'Confirmar Retiro'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dar de Baja Dispensador */}
      {isBajaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-rose-100 bg-rose-600 flex justify-between items-center text-white">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Ban className="h-5 w-5" /> Dar de Baja Dispensador
              </h2>
              <button onClick={() => setIsBajaModalOpen(false)} className="text-white/80 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {modalErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" /> {modalErrorMsg}
                </div>
              )}

              <p className="text-sm text-slate-700">
                ¿Estás seguro de dar de baja el dispensador <b className="text-slate-900">{dispensadorSeleccionado?.marca} {dispensadorSeleccionado?.modelo}</b> ({dispensadorSeleccionado?.numero_serie || 'Sin S/N'})?
              </p>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>
                  El dispensador pasará a estado <b>Dado de Baja</b> y se desasociará automáticamente de cualquier cliente que lo tenga asignado.
                </span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsBajaModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 font-medium hover:text-slate-800">Cancelar</button>
                <button
                  type="button"
                  onClick={handleConfirmBaja}
                  disabled={isPending}
                  className="text-white px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-60 bg-rose-600 hover:bg-rose-700 shadow-sm"
                >
                  {isPending ? 'Procesando...' : 'Confirmar Dar de Baja'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar Dispensador */}
      {isEliminarModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-900 flex justify-between items-center text-white">
              <h2 className="text-base font-bold flex items-center gap-2 text-rose-400">
                <Trash2 className="h-5 w-5" /> Eliminar Dispensador
              </h2>
              <button onClick={() => setIsEliminarModalOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {modalErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" /> {modalErrorMsg}
                </div>
              )}

              <p className="text-sm text-slate-700">
                ¿Estás completamente seguro de eliminar el dispensador <b className="text-slate-900">{dispensadorSeleccionado?.marca} {dispensadorSeleccionado?.modelo}</b> ({dispensadorSeleccionado?.numero_serie || 'Sin S/N'})?
              </p>

              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
                <span>
                  Esta acción eliminará el registro del dispensador permanentemente de la base de datos.
                </span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsEliminarModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 font-medium hover:text-slate-800">Cancelar</button>
                <button
                  type="button"
                  onClick={handleConfirmEliminar}
                  disabled={isPending}
                  className="text-white px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-60 bg-rose-600 hover:bg-rose-700 shadow-sm"
                >
                  {isPending ? 'Eliminando...' : 'Eliminar Definitivamente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
