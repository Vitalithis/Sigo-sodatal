'use client';

import React, { useState, useRef } from 'react';
import {
  crearRutaBaseAction,
  buscarClientesBaseAction,
  agregarClienteARutaBaseAction,
  obtenerRutasBaseAction,
  eliminarClienteDeRutaBaseAction,
  reordenarClienteRutaBaseAction,
  actualizarCantidadesClienteRutaBaseAction
} from './actions';
import { DiaSemana } from '@lib/prisma/generated/edge';
import { 
  Search, Droplet, GlassWater, Calendar, Plus, User, Truck, 
  MapPin, Phone, Trash2, Edit3, Save, X, ArrowUp, ArrowDown, Layers, Users
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

export default function RutasBaseManager({ rutasBaseIniciales, choferes, vehiculos }: Props) {
  const [rutasBase, setRutasBase] = useState(rutasBaseIniciales);
  const [cargando, setCargando] = useState(false);
  const [diaFiltro, setDiaFiltro] = useState<DiaSemana | 'TODOS'>('LUNES');
  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);
  const { popup, showSuccess, showError, showConfirm, close } = usePopup();

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

  const moverCliente = async (clienteRutaBaseId: string, rutaBaseId: string, direccion: 'subir' | 'bajar') => {
    setCargando(true);
    const res = await reordenarClienteRutaBaseAction(clienteRutaBaseId, rutaBaseId, direccion);
    if (res.success) {
      await refrescar();
    } else {
      showError('Error', res.message || 'No se pudo reordenar.');
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

        <button
          onClick={() => {
            setForm(f => ({ ...f, dia_semana: diaFiltro !== 'TODOS' ? diaFiltro : 'LUNES' }));
            setIsCrearModalOpen(true);
          }}
          className="text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 shrink-0"
          style={{ backgroundColor: '#013299' }}
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Ruta Base</span>
        </button>
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

            const totalBot20 = rb.clientes?.reduce((acc: number, c: any) => acc + (c.bot20_default || 0), 0) || 0;
            const totalBot10 = rb.clientes?.reduce((acc: number, c: any) => acc + (c.bot10_default || 0), 0) || 0;
            const totalSoda = rb.clientes?.reduce((acc: number, c: any) => acc + (c.soda_default || 0), 0) || 0;

            return (
              <div key={rb.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all hover:border-slate-200">

                {/* CABECERA DE RUTA BASE */}
                <div className="bg-slate-50/90 p-5 border-b border-slate-100 flex flex-col lg:flex-row justify-between lg:items-center gap-4 relative z-20">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="bg-[#013299] text-white text-[10px] font-black px-2.5 py-0.5 rounded-md tracking-wider uppercase">
                          {rb.dia_semana}
                        </span>
                        <h3 className="text-base font-black text-slate-900">{rb.nombre}</h3>
                        <span className="bg-blue-50 text-[#013299] border border-blue-100 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                          {rb.clientes?.length || 0} Clientes fijos
                        </span>
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

                {/* TABLA DE CLIENTES FIJOS */}
                <div className="overflow-x-auto relative z-10">
                  <table className="w-full text-left text-xs min-w-[760px]">
                    <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-3 w-[50px] text-center">Orden</th>
                        <th className="px-4 py-3 min-w-[180px]">Cliente Fijo</th>
                        <th className="px-3 py-3 w-[90px]">Tipo</th>
                        <th className="px-4 py-3 min-w-[180px]">Dirección y Contacto</th>
                        <th className="px-4 py-3 min-w-[140px]">Comuna / Sector</th>
                        <th className="px-3 py-3 w-[160px] text-center">Bot 20L / Bot 10L / Soda</th>
                        <th className="px-4 py-3 w-[120px] text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rb.clientes.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-10 text-center text-slate-400 italic">
                            Sin clientes fijos asignados a esta plantilla. Utiliza el buscador para añadir clientes.
                          </td>
                        </tr>
                      ) : (
                        rb.clientes.map((c: any, index: number) => {
                          const enEdicion = editando === c.id;
                          return (
                            <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* Reordenamiento */}
                              <td className="px-3 py-3 text-center align-middle">
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <span className="font-mono text-xs font-bold text-slate-400">{index + 1}</span>
                                  <div className="flex items-center gap-0.5">
                                    {index > 0 && (
                                      <button
                                        onClick={() => moverCliente(c.id, rb.id, 'subir')}
                                        disabled={cargando}
                                        title="Subir posición"
                                        className="p-1 hover:bg-slate-200 rounded text-slate-500"
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                    )}
                                    {index < rb.clientes.length - 1 && (
                                      <button
                                        onClick={() => moverCliente(c.id, rb.id, 'bajar')}
                                        disabled={cargando}
                                        title="Bajar posición"
                                        className="p-1 hover:bg-slate-200 rounded text-slate-500"
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
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
                                    onClick={() => eliminarCliente(c.id, rb.id, c.cliente?.nombre || 'este cliente')}
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
                        })
                      )}
                    </tbody>
                  </table>
                </div>
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
                  {choferes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.apellido}
                      {c.vehiculo ? ` (Habitual: ${c.vehiculo.patente})` : ''}
                    </option>
                  ))}
                </select>
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
              <button
                type="submit"
                disabled={cargando}
                className="text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                style={{ backgroundColor: '#013299' }}
              >
                <Save className="w-4 h-4" />
                <span>{cargando ? 'Guardando...' : 'Crear Plantilla'}</span>
              </button>
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