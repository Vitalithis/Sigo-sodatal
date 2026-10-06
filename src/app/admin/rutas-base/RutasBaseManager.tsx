'use client';

import React, { useState, useRef } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  crearRutaBaseAction,
  buscarClientesBaseAction,
  agregarClienteARutaBaseAction,
  obtenerRutasBaseAction,
  eliminarClienteDeRutaBaseAction,
  actualizarCantidadesClienteRutaBaseAction,
  actualizarOrdenClientesRutaBaseAction,
  ordenarRutaBasePorComunaYSectorAction
} from './actions';
import { DiaSemana } from '@lib/prisma/generated/edge';
import { 
  Search, Droplet, GlassWater, Calendar, Plus, User, Truck, 
  MapPin, Phone, Trash2, Edit3, Save, X, Layers, Users,
  ChevronDown, ChevronUp, ChevronsDownUp, ChevronsUpDown, AlertCircle,
  GripVertical, Building2
} from 'lucide-react';
import { usePopup } from '@/hooks/usePopup';
import PopupGlobal from '@/components/ui/PopupGlobal';

interface Props {
  rutasBaseIniciales: any[];
  choferes: any[];
  vehiculos: any[];
}

interface Cantidades {
  bot20_default: number;
  bot10_default: number;
  soda_default: number;
}

const CANTIDADES_VACIAS: Cantidades = { bot20_default: 0, bot10_default: 0, soda_default: 0 };
const inputCls = 'w-full border border-slate-200 p-2.5 rounded-xl text-xs text-slate-800 bg-white outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] transition-colors placeholder:text-slate-400';
const labelCls = 'block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1';

interface SortableRowProps {
  c: any;
  indexGlobal: number;
  enEdicion: boolean;
  cantidadesEdicion: Cantidades;
  setCantidadesEdicion: React.Dispatch<React.SetStateAction<Cantidades>>;
  iniciarEdicion: (c: any) => void;
  guardarEdicion: (id: string) => void;
  cancelarEdicion: () => void;
  eliminarCliente: (id: string, rutaId: string, nombre: string) => void;
  cargando: boolean;
  rbId: string;
}

function SortableClienteRow({
  c,
  indexGlobal,
  enEdicion,
  cantidadesEdicion,
  setCantidadesEdicion,
  iniciarEdicion,
  guardarEdicion,
  cancelarEdicion,
  eliminarCliente,
  cargando,
  rbId
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: (isDragging ? 'relative' : undefined) as any,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-slate-100 transition-colors ${
        isDragging ? 'bg-blue-50/90 shadow-md ring-2 ring-[#013299]/30' : 'hover:bg-slate-50/80 bg-white'
      }`}
    >
      {/* DRAG & DROP HANDLE + ORDEN */}
      <td
        {...attributes}
        {...listeners}
        className="px-3 py-3 text-center align-middle cursor-grab active:cursor-grabbing hover:bg-blue-50/60 select-none group w-[65px]"
        title="Arrastra para reordenar cliente en la ruta"
      >
        <div className="flex items-center justify-center gap-1 text-slate-400 group-hover:text-[#013299] transition-colors">
          <GripVertical className="w-4 h-4 shrink-0" />
          <span className="font-mono text-xs font-bold text-slate-500 group-hover:text-slate-800">{indexGlobal + 1}</span>
        </div>
      </td>

      <td className="px-4 py-3 font-bold text-slate-900 align-middle">
        {c.cliente?.nombre}
      </td>

      <td className="px-3 py-3 align-middle">
        <span className={`text-[9px] font-black px-2.5 py-1 rounded-full tracking-wide ${
          c.cliente?.tipo === 'EMPRESA'
            ? 'bg-purple-100 text-purple-700'
            : 'bg-emerald-100 text-emerald-700'
        }`}>
          {c.cliente?.tipo}
        </span>
      </td>

      <td className="px-4 py-3 align-middle text-[11px] leading-relaxed">
        <span className="flex items-center gap-1 text-slate-700 font-medium truncate max-w-[200px]" title={c.cliente?.direccion}>
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate">{c.cliente?.direccion}</span>
        </span>
        <span className="flex items-center gap-1 text-slate-500 mt-0.5 font-medium">
          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
          <span>{c.cliente?.telefono || 'Sin teléfono'}</span>
        </span>
      </td>

      <td className="px-4 py-3 align-middle text-[11px]">
        <span className="block font-bold text-slate-800">
          {c.cliente?.sector?.comuna?.nombre || '-'}
        </span>
        <span className="block text-slate-500 mt-0.5 truncate max-w-[140px]">
          {c.cliente?.sector?.nombre || 'General'}
        </span>
      </td>

      {/* Cantidades por defecto */}
      <td className="px-3 py-3 align-middle">
        {enEdicion ? (
          <div className="flex items-center justify-center gap-1">
            <input
              type="number"
              min={0}
              value={cantidadesEdicion.bot20_default}
              onChange={e => setCantidadesEdicion(prev => ({ ...prev, bot20_default: Math.max(0, Number(e.target.value)) }))}
              className="w-12 border border-slate-300 rounded-lg p-1.5 text-center text-xs font-bold focus:ring-2 focus:ring-[#013299]/20 outline-none"
              title="Bidones 20L"
            />
            <input
              type="number"
              min={0}
              value={cantidadesEdicion.bot10_default}
              onChange={e => setCantidadesEdicion(prev => ({ ...prev, bot10_default: Math.max(0, Number(e.target.value)) }))}
              className="w-12 border border-slate-300 rounded-lg p-1.5 text-center text-xs font-bold focus:ring-2 focus:ring-[#013299]/20 outline-none"
              title="Bidones 10L"
            />
            <input
              type="number"
              min={0}
              value={cantidadesEdicion.soda_default}
              onChange={e => setCantidadesEdicion(prev => ({ ...prev, soda_default: Math.max(0, Number(e.target.value)) }))}
              className="w-12 border border-slate-300 rounded-lg p-1.5 text-center text-xs font-bold focus:ring-2 focus:ring-[#013299]/20 outline-none"
              title="Sodas"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => iniciarEdicion(c)}
            className="w-full flex items-center justify-center gap-3 text-xs font-bold text-slate-700 hover:text-[#013299] transition-colors py-1 px-2 rounded-lg hover:bg-slate-100"
            title="Haz clic para editar las cargas programadas"
          >
            <span className="flex items-center gap-1" title="20 Litros">
              <Droplet className="h-3.5 w-3.5 text-blue-600" />
              <span>{c.bot20_default ?? 0}</span>
            </span>
            <span className="flex items-center gap-1" title="10 Litros">
              <Droplet className="h-3.5 w-3.5 text-sky-500" />
              <span>{c.bot10_default ?? 0}</span>
            </span>
            <span className="flex items-center gap-1" title="Soda">
              <GlassWater className="h-3.5 w-3.5 text-slate-400" />
              <span>{c.soda_default ?? 0}</span>
            </span>
          </button>
        )}
      </td>

      {/* Acciones */}
      <td className="px-4 py-3 text-center align-middle">
        {enEdicion ? (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => guardarEdicion(c.id)}
              disabled={cargando}
              className="text-emerald-600 hover:text-emerald-800 disabled:opacity-40 font-bold px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors text-xs flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar</span>
            </button>
            <button
              type="button"
              onClick={cancelarEdicion}
              className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors text-xs"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => eliminarCliente(c.id, rbId, c.cliente?.nombre || 'este cliente')}
            disabled={cargando}
            className="text-rose-500 hover:text-rose-700 disabled:opacity-40 font-bold px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors text-xs flex items-center justify-center gap-1 mx-auto"
            title="Quitar cliente de la plantilla"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Quitar</span>
          </button>
        )}
      </td>
    </tr>
  );
}

export default function RutasBaseManager({ rutasBaseIniciales, choferes, vehiculos }: Props) {
  const [rutasBase, setRutasBase] = useState(rutasBaseIniciales);
  const [cargando, setCargando] = useState(false);
  const [diaFiltro, setDiaFiltro] = useState<DiaSemana | 'TODOS'>('LUNES');
  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);
  const { popup, showSuccess, showError, showConfirm, close } = usePopup();

  // Paginación, vista completa y colapso por ruta base
  const [paginasPorRuta, setPaginasPorRuta] = useState<{ [rutaId: string]: number }>({});
  const [rutasColapsadas, setRutasColapsadas] = useState<{ [rutaId: string]: boolean }>({});
  const [mostrarTodosPorRuta, setMostrarTodosPorRuta] = useState<{ [rutaId: string]: boolean }>({});
  const ITEMS_POR_PAGINA = 10;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleColapsoRuta = (rutaId: string) => {
    setRutasColapsadas(prev => ({ ...prev, [rutaId]: !prev[rutaId] }));
  };

  const expandirTodas = () => setRutasColapsadas({});
  const contraerTodas = () => {
    const todas: { [key: string]: boolean } = {};
    rutasBase.forEach((r: any) => { todas[r.id] = true; });
    setRutasColapsadas(todas);
  };

  // Buscador por ruta
  const [buscando, setBuscando] = useState<{ [key: string]: boolean }>({});
  const [busquedas, setBusquedas] = useState<{ [key: string]: string }>({});
  const [resultadosCli, setResultadosCli] = useState<{ [key: string]: any[] }>({});
  const timerBuscador = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Modal para confirmar cantidades por defecto de nuevo cliente en la ruta
  const [pendiente, setPendiente] = useState<{ rutaId: string; cliente: any } | null>(null);
  const [cantidadesModal, setCantidadesModal] = useState<Cantidades>(CANTIDADES_VACIAS);

  // Edición inline de cantidades
  const [editando, setEditando] = useState<string | null>(null);
  const [cantidadesEdicion, setCantidadesEdicion] = useState<Cantidades>(CANTIDADES_VACIAS);

  // Formulario nueva ruta base
  const [form, setForm] = useState<{
    nombre: string;
    dia_semana: DiaSemana;
    usuario_id: string;
    vehiculo_id: string;
  }>({
    nombre: '',
    dia_semana: 'LUNES',
    usuario_id: '',
    vehiculo_id: ''
  });

  const dias: DiaSemana[] = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];

  const refrescar = async () => {
    setCargando(true);
    const res = await obtenerRutasBaseAction();
    if (res.success) setRutasBase(res.rutasBase);
    setCargando(false);
  };

  const manejarCrearRuta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.usuario_id || !form.vehiculo_id) {
      showError('Datos incompletos', 'Debes seleccionar Chofer y Camión.');
      return;
    }

    // Validar regla de negocio: el repartidor solo debe tener una ruta base diaria
    const choferYaAsignado = rutasBase.find(
      (rb: any) => rb.dia_semana === form.dia_semana && rb.usuario_id === form.usuario_id
    );
    if (choferYaAsignado) {
      const choferObj = choferes.find(c => c.id === form.usuario_id);
      const nombreChofer = `${choferObj?.nombre || ''} ${choferObj?.apellido || ''}`.trim() || 'Este repartidor';
      showError(
        'Repartidor Ocupado',
        `${nombreChofer} ya tiene asignada la ruta "${choferYaAsignado.nombre}" para el día ${form.dia_semana}. Cada repartidor solo puede tener una ruta base diaria.`
      );
      return;
    }

    setCargando(true);
    const res = await crearRutaBaseAction(form);
    if (res.success) {
      setForm({ nombre: '', dia_semana: diaFiltro !== 'TODOS' ? diaFiltro : 'LUNES', usuario_id: '', vehiculo_id: '' });
      setIsCrearModalOpen(false);
      await refrescar();
      showSuccess('Ruta Base Creada', 'La plantilla de ruta ha sido agregada exitosamente.');
    } else {
      showError('Error', res.message || 'No se pudo crear la plantilla.');
    }
    setCargando(false);
  };

  const buscarClientes = (rutaId: string, valor: string) => {
    setBusquedas(prev => ({ ...prev, [rutaId]: valor }));
    if (timerBuscador.current[rutaId]) clearTimeout(timerBuscador.current[rutaId]);

    if (valor.trim().length < 2) {
      setResultadosCli(prev => ({ ...prev, [rutaId]: [] }));
      setBuscando(prev => ({ ...prev, [rutaId]: false }));
      return;
    }

    setBuscando(prev => ({ ...prev, [rutaId]: true }));
    timerBuscador.current[rutaId] = setTimeout(async () => {
      try {
        const res = await buscarClientesBaseAction(valor, rutaId);
        if (res.success) {
          setResultadosCli(prev => ({ ...prev, [rutaId]: res.clientes }));
        }
      } catch (err) {
        console.error('Error buscando clientes:', err);
      } finally {
        setBuscando(prev => ({ ...prev, [rutaId]: false }));
      }
    }, 350);
  };

  const seleccionarClienteParaAlta = (rutaId: string, cliente: any) => {
    setPendiente({ rutaId, cliente });
    setCantidadesModal(CANTIDADES_VACIAS);
    setBusquedas(prev => ({ ...prev, [rutaId]: '' }));
    setResultadosCli(prev => ({ ...prev, [rutaId]: [] }));
    setRutasColapsadas(prev => ({ ...prev, [rutaId]: false }));
  };

  const cancelarAlta = () => {
    setPendiente(null);
    setCantidadesModal(CANTIDADES_VACIAS);
  };

  const confirmarAlta = async () => {
    if (!pendiente) return;
    setCargando(true);
    const res = await agregarClienteARutaBaseAction(pendiente.rutaId, pendiente.cliente.id, cantidadesModal);
    if (res.success) {
      const rutaActual = rutasBase.find((r: any) => r.id === pendiente.rutaId);
      const nuevoTotal = (rutaActual?.clientes?.length || 0) + 1;
      const ultimaPagina = Math.ceil(nuevoTotal / ITEMS_POR_PAGINA);
      setPaginasPorRuta(prev => ({ ...prev, [pendiente.rutaId]: ultimaPagina }));

      setPendiente(null);
      setCantidadesModal(CANTIDADES_VACIAS);
      await refrescar();
      showSuccess('Cliente Asignado', 'El cliente fue agregado exitosamente a esta ruta base.');
    } else {
      showError('Error', res.message || 'No se pudo asignar el cliente.');
    }
    setCargando(false);
  };

  const eliminarCliente = async (clienteRutaBaseId: string, rutaBaseId: string, clienteNombre: string) => {
    showConfirm('¿Quitar Cliente?', `¿Deseas remover a "${clienteNombre}" de esta plantilla de ruta?`, async () => {
      setCargando(true);
      const res = await eliminarClienteDeRutaBaseAction(clienteRutaBaseId, rutaBaseId);
      if (res.success) {
        await refrescar();
        showSuccess('Removido', 'Cliente retirado de la plantilla.');
      } else {
        showError('Error', res.message || 'No se pudo retirar el cliente.');
      }
      setCargando(false);
    });
  };

  const handleDragEnd = async (rutaId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ruta = rutasBase.find((r: any) => r.id === rutaId);
    if (!ruta || !ruta.clientes) return;

    const oldIndex = ruta.clientes.findIndex((c: any) => c.id === active.id);
    const newIndex = ruta.clientes.findIndex((c: any) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const nuevaLista = arrayMove(ruta.clientes, oldIndex, newIndex).map((c: any, idx: number) => ({
      ...c,
      orden: idx + 1
    }));

    // Actualización optimista inmediata en UI
    setRutasBase(prev =>
      prev.map((r: any) => (r.id === rutaId ? { ...r, clientes: nuevaLista } : r))
    );

    const payload = nuevaLista.map((c: any, idx: number) => ({
      id: c.id,
      orden_nuevo: idx + 1
    }));

    const res = await actualizarOrdenClientesRutaBaseAction(rutaId, payload);
    if (!res.success) {
      showError('Error al reordenar', res.message || 'No se pudo guardar el nuevo orden.');
      await refrescar();
    }
  };

  const ordenarPorComunaYSector = async (rutaId: string) => {
    const ruta = rutasBase.find((r: any) => r.id === rutaId);
    if (!ruta || !ruta.clientes || ruta.clientes.length === 0) return;

    setCargando(true);
    const res = await ordenarRutaBasePorComunaYSectorAction(rutaId);
    if (res.success) {
      showSuccess('Orden Actualizado', `Ruta "${ruta.nombre}" ordenada exitosamente por Comuna y luego Sector.`);
      await refrescar();
    } else {
      showError('Error al ordenar', res.message || 'No se pudo reordenar la ruta.');
    }
    setCargando(false);
  };

  const iniciarEdicion = (c: any) => {
    setEditando(c.id);
    setCantidadesEdicion({
      bot20_default: c.bot20_default ?? 0,
      bot10_default: c.bot10_default ?? 0,
      soda_default: c.soda_default ?? 0
    });
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setCantidadesEdicion(CANTIDADES_VACIAS);
  };

  const guardarEdicion = async (clienteRutaBaseId: string) => {
    setCargando(true);
    const res = await actualizarCantidadesClienteRutaBaseAction(clienteRutaBaseId, cantidadesEdicion);
    if (res.success) {
      setEditando(null);
      await refrescar();
      showSuccess('Cantidades Actualizadas', 'Se han modificado las cargas por defecto.');
    } else {
      showError('Error', res.message || 'No se pudieron actualizar las cantidades.');
    }
    setCargando(false);
  };

  const rutasFiltradas = diaFiltro === 'TODOS' 
    ? rutasBase 
    : rutasBase.filter((r: any) => r.dia_semana === diaFiltro);

  return (
    <div className="space-y-6 font-sans text-slate-800">
      <PopupGlobal popup={popup} onClose={close} />

      {/* BARRA SUPERIOR DE SELECTOR DE DÍA + BOTÓN NUEVA RUTA BASE */}
      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setDiaFiltro('TODOS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              diaFiltro === 'TODOS'
                ? 'bg-[#013299] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todos los Días</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
              diaFiltro === 'TODOS' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {rutasBase.length}
            </span>
          </button>

          {dias.map((dia) => {
            const count = rutasBase.filter((r: any) => r.dia_semana === dia).length;
            const isSelected = diaFiltro === dia;
            return (
              <button
                key={dia}
                onClick={() => setDiaFiltro(dia)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#013299] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{dia}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {rutasFiltradas.length > 0 && (
            <button
              type="button"
              onClick={Object.keys(rutasColapsadas).length > 0 ? expandirTodas : contraerTodas}
              className="text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold px-3 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              title={Object.keys(rutasColapsadas).length > 0 ? "Expandir todas las listas de clientes" : "Contraer todas las listas"}
            >
              {Object.keys(rutasColapsadas).length > 0 ? <ChevronsUpDown className="w-3.5 h-3.5 text-blue-600" /> : <ChevronsDownUp className="w-3.5 h-3.5 text-slate-500" />}
              <span>{Object.keys(rutasColapsadas).length > 0 ? 'Expandir Todas' : 'Contraer Todas'}</span>
            </button>
          )}

          <button
            onClick={() => {
              setForm(f => ({ ...f, dia_semana: diaFiltro !== 'TODOS' ? diaFiltro : 'LUNES' }));
              setIsCrearModalOpen(true);
            }}
            className="text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 bg-[#013299] hover:bg-blue-900"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Ruta Base</span>
          </button>
        </div>
      </div>

      {/* LISTADO DE TARJETAS DE RUTAS BASE PARA EL DÍA FILTRADO */}
      <div className="space-y-6">
        {rutasFiltradas.length === 0 ? (
          <div className="bg-white p-12 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-2xl space-y-2">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-600">No hay plantillas base definidas para {diaFiltro === 'TODOS' ? 'el sistema' : diaFiltro}.</p>
            <p className="text-[11px] text-slate-400">Haz clic en "+ Nueva Ruta Base" para agregar un circuito de reparto fijo.</p>
          </div>
        ) : (
          rutasFiltradas.map((rb: any) => {
            const resultados = resultadosCli[rb.id] ?? [];
            const busquedaActual = busquedas[rb.id] ?? '';
            const estaBuscando = buscando[rb.id] ?? false;
            const isColapsada = !!rutasColapsadas[rb.id];
            const esMostrarTodos = !!mostrarTodosPorRuta[rb.id];
            const paginaActual = paginasPorRuta[rb.id] || 1;
            const totalClientes = rb.clientes?.length || 0;
            const totalPaginas = Math.max(1, Math.ceil(totalClientes / ITEMS_POR_PAGINA));
            const indiceInicio = esMostrarTodos ? 0 : (paginaActual - 1) * ITEMS_POR_PAGINA;
            const clientesAMostrar = esMostrarTodos 
              ? (rb.clientes || []) 
              : (rb.clientes || []).slice(indiceInicio, indiceInicio + ITEMS_POR_PAGINA);

            const totalBot20 = rb.clientes?.reduce((acc: number, c: any) => acc + (c.bot20_default || 0), 0) || 0;
            const totalBot10 = rb.clientes?.reduce((acc: number, c: any) => acc + (c.bot10_default || 0), 0) || 0;
            const totalSoda = rb.clientes?.reduce((acc: number, c: any) => acc + (c.soda_default || 0), 0) || 0;

            const tieneResultadosAbiertos = resultados.length > 0 || (!estaBuscando && busquedaActual.trim().length >= 2);

            return (
              <div 
                key={rb.id} 
                className={`bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col transition-all hover:border-slate-200 relative ${
                  tieneResultadosAbiertos ? 'z-40' : 'z-10'
                }`}
              >

                {/* CABECERA DE RUTA BASE (CON BOTÓN DE COLAPSO Y ORDENAR) */}
                <div className={`bg-slate-50/90 p-5 flex flex-col lg:flex-row justify-between lg:items-center gap-4 relative z-20 ${
                  isColapsada ? 'rounded-2xl' : 'rounded-t-2xl border-b border-slate-100'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => toggleColapsoRuta(rb.id)}
                          className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                          title={isColapsada ? "Expandir lista de clientes" : "Contraer lista de clientes"}
                        >
                          {isColapsada ? <ChevronDown className="w-4 h-4 text-[#013299]" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                        <span className="bg-[#013299] text-white text-[10px] font-black px-2.5 py-0.5 rounded-md tracking-wider uppercase">
                          {rb.dia_semana}
                        </span>
                        <h3 className="text-base font-black text-slate-900">{rb.nombre}</h3>
                        <span className="bg-blue-50 text-[#013299] border border-blue-100 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                          {totalClientes} {totalClientes === 1 ? 'Cliente fijo' : 'Clientes fijos'}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleColapsoRuta(rb.id)}
                          className="text-[11px] font-bold text-slate-500 hover:text-[#013299] underline decoration-dotted ml-1"
                        >
                          {isColapsada ? 'Mostrar clientes' : 'Contraer'}
                        </button>
                        <button
                          type="button"
                          onClick={() => ordenarPorComunaYSector(rb.id)}
                          disabled={cargando || totalClientes <= 1}
                          className="text-[11px] font-bold text-[#013299] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 ml-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                          title="Reordenar automáticamente los clientes de esta ruta por Comuna y luego Sector"
                        >
                          <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Ordenar por Comuna y Sector</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 mt-2">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#013299]" />
                          <span className="font-bold text-slate-800">{rb.usuario?.nombre} {rb.usuario?.apellido}</span>
                        </span>
                        <span className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
                          <Truck className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-mono font-bold text-slate-800">[{rb.vehiculo?.patente}]</span>
                          <span className="text-slate-500">{rb.vehiculo?.marca}</span>
                        </span>

                        {/* RESUMEN DE CARGAS ESPERADAS */}
                        <div className="flex items-center gap-3 border-l border-slate-200 pl-4 text-[11px] font-bold">
                          <span className="flex items-center gap-1 text-slate-700" title="Bidones 20L programados">
                            <Droplet className="w-3.5 h-3.5 text-blue-600" />
                            <span>{totalBot20} u (20L)</span>
                          </span>
                          <span className="flex items-center gap-1 text-slate-700" title="Bidones 10L programados">
                            <Droplet className="w-3.5 h-3.5 text-sky-500" />
                            <span>{totalBot10} u (10L)</span>
                          </span>
                          <span className="flex items-center gap-1 text-slate-700" title="Sodas programadas">
                            <GlassWater className="w-3.5 h-3.5 text-slate-400" />
                            <span>{totalSoda} u (Soda)</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BUSCADOR PARA AGREGAR CLIENTE FIJO */}
                  <div className="relative w-full lg:w-80">
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#013299]/20 focus-within:border-[#013299] transition-colors shadow-xs">
                      <Search className="h-4 w-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder={estaBuscando ? 'Buscando...' : 'Añadir cliente a esta ruta...'}
                        value={busquedaActual}
                        onChange={e => buscarClientes(rb.id, e.target.value)}
                        className="text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none w-full bg-transparent"
                      />
                    </div>

                    {resultados.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 z-50 p-1">
                        {resultados.map((c: any) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => seleccionarClienteParaAlta(rb.id, c)}
                            className="w-full text-left p-2.5 hover:bg-blue-50 rounded-xl transition-colors block"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-900 text-xs">{c.nombre}</span>
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 uppercase">
                                {c.frecuencia || 'SEMANAL'}
                              </span>
                            </div>
                            <span className="block text-[11px] text-slate-500 truncate mt-0.5">📍 {c.direccion}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {!estaBuscando && busquedaActual.trim().length >= 2 && resultados.length === 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl p-3 text-xs text-slate-500 text-center shadow-lg z-50">
                        Sin resultados para "{busquedaActual}"
                      </div>
                    )}
                  </div>
                </div>

                {/* TABLA DE CLIENTES FIJOS (DRAG & DROP, CONTRAÍBLE Y PAGINADA) */}
                {!isColapsada && (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(rb.id, e)}>
                    <div className="overflow-x-auto relative z-10">
                      <table className="w-full text-left text-xs min-w-[760px]">
                        <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="px-3 py-3 w-[65px] text-center" title="Arrastra el icono para reordenar">Orden</th>
                            <th className="px-4 py-3 min-w-[180px]">Cliente Fijo</th>
                            <th className="px-3 py-3 w-[90px]">Tipo</th>
                            <th className="px-4 py-3 min-w-[180px]">Dirección y Contacto</th>
                            <th className="px-4 py-3 min-w-[140px]">Comuna / Sector</th>
                            <th className="px-3 py-3 w-[160px] text-center">Bot 20L / Bot 10L / Soda</th>
                            <th className="px-4 py-3 w-[120px] text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {totalClientes === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-5 py-10 text-center text-slate-400 italic">
                                Sin clientes fijos asignados a esta plantilla. Utiliza el buscador para añadir clientes.
                              </td>
                            </tr>
                          ) : (
                            <SortableContext items={clientesAMostrar.map((c: any) => c.id)} strategy={verticalListSortingStrategy}>
                              {clientesAMostrar.map((c: any, indexEnPagina: number) => {
                                const indexGlobal = esMostrarTodos ? indexEnPagina : indiceInicio + indexEnPagina;
                                return (
                                  <SortableClienteRow
                                    key={c.id}
                                    c={c}
                                    indexGlobal={indexGlobal}
                                    enEdicion={editando === c.id}
                                    cantidadesEdicion={cantidadesEdicion}
                                    setCantidadesEdicion={setCantidadesEdicion}
                                    iniciarEdicion={iniciarEdicion}
                                    guardarEdicion={guardarEdicion}
                                    cancelarEdicion={cancelarEdicion}
                                    eliminarCliente={eliminarCliente}
                                    cargando={cargando}
                                    rbId={rb.id}
                                  />
                                );
                              })}
                            </SortableContext>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* BARRA DE PAGINACIÓN */}
                    <div className="bg-slate-50/70 border-t border-slate-100 px-5 py-2.5 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-medium">
                          {totalClientes === 0 ? (
                            '0 clientes fijos'
                          ) : esMostrarTodos ? (
                            <>
                              Mostrando todos los <b className="text-[#013299]">{totalClientes}</b> clientes fijos (Drag & Drop activo)
                            </>
                          ) : (
                            <>
                              Mostrando <b className="text-slate-800">{indiceInicio + 1}</b> a <b className="text-slate-800">{Math.min(indiceInicio + ITEMS_POR_PAGINA, totalClientes)}</b> de <b className="text-[#013299]">{totalClientes}</b> clientes fijos
                            </>
                          )}
                        </span>
                        {totalClientes > ITEMS_POR_PAGINA && (
                          <button
                            type="button"
                            onClick={() => setMostrarTodosPorRuta(prev => ({ ...prev, [rb.id]: !prev[rb.id] }))}
                            className="text-[11px] font-bold text-[#013299] hover:underline bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 transition-colors shadow-2xs"
                          >
                            {esMostrarTodos ? 'Ver 10 por página' : `Ver todos (${totalClientes})`}
                          </button>
                        )}
                      </div>
                      {!esMostrarTodos && totalPaginas > 1 && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPaginasPorRuta(prev => ({ ...prev, [rb.id]: Math.max(1, paginaActual - 1) }))}
                            disabled={paginaActual === 1 || cargando}
                            className="px-3 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 shadow-2xs transition-colors"
                          >
                            ◀ Anterior
                          </button>
                          <span className="text-xs font-bold text-slate-600 px-2">
                            Página {paginaActual} de {totalPaginas}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPaginasPorRuta(prev => ({ ...prev, [rb.id]: Math.min(totalPaginas, paginaActual + 1) }))}
                            disabled={paginaActual === totalPaginas || cargando}
                            className="px-3 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 shadow-2xs transition-colors"
                          >
                            Siguiente ▶
                          </button>
                        </div>
                      )}
                    </div>
                  </DndContext>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Crear Nueva Plantilla de Ruta Base */}
      {isCrearModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={manejarCrearRuta} className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Nueva Plantilla de Ruta Base
              </h3>
              <button type="button" onClick={() => setIsCrearModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className={labelCls}>Nombre Descriptivo de la Ruta *</label>
                <input
                  type="text"
                  placeholder="Ej: Ruta 1 - Centro / Sur"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Día Fijo de Operación *</label>
                <select
                  value={form.dia_semana}
                  onChange={e => setForm({ ...form, dia_semana: e.target.value as DiaSemana })}
                  className={`${inputCls} font-bold`}
                >
                  {dias.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Repartidor Encargado *</label>
                <select
                  value={form.usuario_id}
                  onChange={e => {
                    const choferId = e.target.value;
                    const choferObj = choferes.find(c => c.id === choferId);
                    setForm(prev => ({
                      ...prev,
                      usuario_id: choferId,
                      vehiculo_id: choferObj?.vehiculo_id || prev.vehiculo_id
                    }));
                  }}
                  className={inputCls}
                  required
                >
                  <option value="">-- Seleccionar Chofer --</option>
                  {choferes.map(c => {
                    const rutaExistente = rutasBase.find(
                      (rb: any) => rb.dia_semana === form.dia_semana && rb.usuario_id === c.id
                    );
                    return (
                      <option 
                        key={c.id} 
                        value={c.id} 
                        disabled={Boolean(rutaExistente)}
                        className={rutaExistente ? 'text-slate-400 bg-slate-50' : ''}
                      >
                        {c.nombre} {c.apellido}
                        {rutaExistente 
                          ? ` ⛔ Ya tiene ruta el ${form.dia_semana} ("${rutaExistente.nombre}")` 
                          : (c.vehiculo ? ` (Habitual: ${c.vehiculo.patente})` : '')}
                      </option>
                    );
                  })}
                </select>

                {(() => {
                  const conflicto = rutasBase.find(
                    (rb: any) => rb.dia_semana === form.dia_semana && rb.usuario_id === form.usuario_id
                  );
                  if (!conflicto) return null;
                  const choferObj = choferes.find(c => c.id === form.usuario_id);
                  const nombreChofer = `${choferObj?.nombre || ''} ${choferObj?.apellido || ''}`.trim() || 'Este repartidor';
                  return (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <b>{nombreChofer}</b> ya tiene asignada la ruta <b>&quot;{conflicto.nombre}&quot;</b> para el día <b>{form.dia_semana}</b>. Cada repartidor solo puede tener una ruta base diaria.
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div>
                <label className={labelCls}>Camión Habitual *</label>
                <select
                  value={form.vehiculo_id}
                  onChange={e => setForm({ ...form, vehiculo_id: e.target.value })}
                  className={inputCls}
                  required
                >
                  <option value="">-- Seleccionar Vehículo --</option>
                  {vehiculos.map(v => <option key={v.id} value={v.id}>[{v.patente}] {v.marca} {v.modelo}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCrearModalOpen(false)}
                className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-4 py-2.5 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              {(() => {
                const tieneConflicto = Boolean(
                  rutasBase.find((rb: any) => rb.dia_semana === form.dia_semana && rb.usuario_id === form.usuario_id)
                );
                return (
                  <button
                    type="submit"
                    disabled={cargando || tieneConflicto}
                    className="text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#013299' }}
                  >
                    <Save className="w-4 h-4" />
                    <span>{cargando ? 'Guardando...' : 'Crear Plantilla'}</span>
                  </button>
                );
              })()}
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Fijar cantidades por defecto al agregar cliente */}
      {pendiente && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Cantidades Programadas
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Define la carga habitual para <strong className="text-slate-800">{pendiente.cliente.nombre}</strong> cuando opere esta ruta.
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <Droplet className="h-4 w-4 text-blue-600" /> Bidón 20L
                </label>
                <input
                  type="number"
                  min={0}
                  value={cantidadesModal.bot20_default}
                  onChange={e => setCantidadesModal(prev => ({ ...prev, bot20_default: Math.max(0, Number(e.target.value)) }))}
                  className="border border-slate-200 rounded-xl p-2 w-20 text-center font-bold text-sm bg-white focus:ring-2 focus:ring-[#013299]/20 outline-none"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <Droplet className="h-4 w-4 text-sky-500" /> Bidón 10L
                </label>
                <input
                  type="number"
                  min={0}
                  value={cantidadesModal.bot10_default}
                  onChange={e => setCantidadesModal(prev => ({ ...prev, bot10_default: Math.max(0, Number(e.target.value)) }))}
                  className="border border-slate-200 rounded-xl p-2 w-20 text-center font-bold text-sm bg-white focus:ring-2 focus:ring-[#013299]/20 outline-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <GlassWater className="h-4 w-4 text-slate-400" /> Soda
                </label>
                <input
                  type="number"
                  min={0}
                  value={cantidadesModal.soda_default}
                  onChange={e => setCantidadesModal(prev => ({ ...prev, soda_default: Math.max(0, Number(e.target.value)) }))}
                  className="border border-slate-200 rounded-xl p-2 w-20 text-center font-bold text-sm bg-white focus:ring-2 focus:ring-[#013299]/20 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={cancelarAlta}
                disabled={cargando}
                className="flex-1 border border-slate-200 text-slate-600 font-bold p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarAlta}
                disabled={cargando}
                className="flex-1 text-white font-bold p-2.5 rounded-xl transition-all text-xs shadow-sm flex items-center justify-center gap-1"
                style={{ backgroundColor: '#013299' }}
              >
                <span>{cargando ? 'Guardando...' : 'Confirmar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}