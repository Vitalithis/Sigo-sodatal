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
import { Search, Droplet, GlassWater } from 'lucide-react';

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

export default function RutasBaseManager({ rutasBaseIniciales, choferes, vehiculos }: Props) {
  const [rutasBase, setRutasBase] = useState(rutasBaseIniciales);
  const [cargando, setCargando] = useState(false);

  // Estados para el buscador
  const [buscando, setBuscando] = useState<{ [key: string]: boolean }>({});
  const [busquedas, setBusquedas] = useState<{ [key: string]: string }>({});
  const [resultadosCli, setResultadosCli] = useState<{ [key: string]: any[] }>({});

  // Ref para manejar el debounce y no saturar la base de datos
  const timerBuscador = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Estado del modal de alta (cliente seleccionado pendiente de confirmar cantidades)
  const [pendiente, setPendiente] = useState<{ rutaId: string; cliente: any } | null>(null);
  const [cantidadesModal, setCantidadesModal] = useState<Cantidades>(CANTIDADES_VACIAS);

  // Estado de edición inline en la tabla
  const [editando, setEditando] = useState<string | null>(null); // id de ClienteRutaBase
  const [cantidadesEdicion, setCantidadesEdicion] = useState<Cantidades>(CANTIDADES_VACIAS);

  const [form, setForm] = useState<{
    nombre: string;
    dia_semana: DiaSemana;
    usuario_id: string;
    vehiculo_id: string;
  }>({
    nombre: '',
    dia_semana: 'LUNES' as DiaSemana,
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
    if (!form.usuario_id || !form.vehiculo_id) return alert('Debes seleccionar Chofer y Camión.');
    setCargando(true);
    const res = await crearRutaBaseAction(form);
    if (res.success) {
      setForm({ nombre: '', dia_semana: 'LUNES', usuario_id: '', vehiculo_id: '' });
      await refrescar();
    } else {
      alert(res.message);
    }
    setCargando(false);
  };

  const buscarClientes = (rutaId: string, valor: string) => {
    setBusquedas(prev => ({ ...prev, [rutaId]: valor }));

    if (timerBuscador.current[rutaId]) {
      clearTimeout(timerBuscador.current[rutaId]);
    }

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

  // Al elegir un resultado del buscador, no se agrega directo: se abre el modal de cantidades
  const seleccionarClienteParaAlta = (rutaId: string, cliente: any) => {
    setPendiente({ rutaId, cliente });
    setCantidadesModal(CANTIDADES_VACIAS);
    // Limpiar buscador y dropdown de esa ruta
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
    } else {
      alert(res.message);
    }
    setCargando(false);
  };

  const eliminarCliente = async (clienteRutaBaseId: string, rutaBaseId: string) => {
    if (!confirm('¿Eliminar este cliente de la ruta?')) return;
    setCargando(true);
    const res = await eliminarClienteDeRutaBaseAction(clienteRutaBaseId, rutaBaseId);
    if (res.success) {
      await refrescar();
    } else {
      alert(res.message);
    }
    setCargando(false);
  };

  const moverCliente = async (clienteRutaBaseId: string, rutaBaseId: string, direccion: 'subir' | 'bajar') => {
    setCargando(true);
    const res = await reordenarClienteRutaBaseAction(clienteRutaBaseId, rutaBaseId, direccion);
    if (res.success) {
      await refrescar();
    } else {
      alert(res.message);
    }
    setCargando(false);
  };

  // --- Edición inline de cantidades en la tabla ---
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
    } else {
      alert(res.message);
    }
    setCargando(false);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 font-sans text-slate-800">

      {/* PANEL IZQUIERDO: Formulario de Creación */}
      <div className="xl:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
        <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
          🛠️ Nueva Plantilla de Ruta
        </h2>
        <form onSubmit={manejarCrearRuta} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-600 mb-1.5">Nombre Descriptivo</label>
            <input
              type="text"
              placeholder="Ej: Ruta Centro - Sur"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              className="border border-slate-300 rounded-lg p-2.5 w-full font-medium focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1.5">Día Fijo de Operación</label>
            <select
              value={form.dia_semana}
              onChange={e => setForm({ ...form, dia_semana: e.target.value as DiaSemana })}
              className="border border-slate-300 rounded-lg p-2.5 w-full font-bold bg-white text-slate-800 focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] outline-none transition-colors"
            >
              {dias.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1.5">Repartidor Encargado</label>
            <select
              value={form.usuario_id}
              onChange={e => setForm({ ...form, usuario_id: e.target.value })}
              className="border border-slate-300 rounded-lg p-2.5 w-full font-medium bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] outline-none transition-colors"
              required
            >
              <option value="">-- Seleccionar Chofer --</option>
              {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1.5">Camión Habitual</label>
            <select
              value={form.vehiculo_id}
              onChange={e => setForm({ ...form, vehiculo_id: e.target.value })}
              className="border border-slate-300 rounded-lg p-2.5 w-full font-medium bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] outline-none transition-colors"
              required
            >
              <option value="">-- Seleccionar Vehículo --</option>
              {vehiculos.map(v => <option key={v.id} value={v.id}>[{v.patente}] {v.marca}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-[#1e40af] hover:bg-blue-800 text-white font-bold p-3 rounded-lg transition-colors uppercase tracking-wider mt-4"
          >
            {cargando ? 'Guardando...' : '⚡ Crear Estructura'}
          </button>
        </form>
      </div>

      {/* PANEL DERECHO: Tarjetas de Rutas Base (Estilo Apilado) */}
      <div className="xl:col-span-3 space-y-6">
        {rutasBase.length === 0 ? (
          <div className="bg-white p-12 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-300 rounded-xl">
            No hay plantillas base definidas todavía. Crea una a la izquierda para empezar.
          </div>
        ) : (
          rutasBase.map((rb: any) => {
            const resultados = resultadosCli[rb.id] ?? [];
            const busquedaActual = busquedas[rb.id] ?? '';
            const estaBuscando = buscando[rb.id] ?? false;

            return (
              <div key={rb.id} className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">

                {/* CABECERA (Info + Buscador) */}
                <div className="bg-slate-50/80 p-4 border-b border-slate-200 rounded-t-xl flex flex-col lg:flex-row justify-between lg:items-center gap-4 relative z-20">

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="bg-[#0f172a] text-white text-[10px] font-black px-2 py-0.5 rounded tracking-widest uppercase">
                          {rb.dia_semana}
                        </span>
                        <h3 className="text-sm font-black text-slate-800">{rb.nombre}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
                        <span className="flex items-center gap-1.5">
                          👤 <span className="font-bold text-slate-800">{rb.usuario?.nombre} {rb.usuario?.apellido}</span>
                        </span>
                        <span className="flex items-center gap-1.5 border-l border-slate-300 pl-4">
                          🚚 <span className="font-bold text-slate-800">{rb.vehiculo?.marca} ({rb.vehiculo?.patente})</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Buscador Derecha */}
                  <div className="relative w-full lg:w-72">
                    <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-[#1e40af]/20 focus-within:border-[#1e40af] transition-colors">
                      <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder={estaBuscando ? 'Buscando...' : 'Añadir cliente fijo...'}
                        value={busquedaActual}
                        onChange={e => buscarClientes(rb.id, e.target.value)}
                        className="text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none w-full bg-transparent"
                      />
                    </div>

                    {resultados.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 z-50">
                        {resultados.map((c: any) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => seleccionarClienteParaAlta(rb.id, c)}
                            className="w-full text-left p-3 hover:bg-blue-50 transition-colors block"
                          >
                            <span className="block font-bold text-slate-800 text-xs">{c.nombre}</span>
                            <span className="block text-[10px] text-slate-500 truncate mt-0.5">📍 {c.direccion}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {!estaBuscando && busquedaActual.trim().length >= 2 && resultados.length === 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-500 text-center shadow-lg z-50">
                        Sin resultados para "{busquedaActual}"
                      </div>
                    )}
                  </div>
                </div>

                {/* TABLA INFERIOR */}
                <div className="overflow-x-auto relative z-10">
                  <table className="w-full text-left text-xs min-w-[760px]">
                    <thead className="bg-white border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-3 w-[200px]">Cliente Fijo</th>
                        <th className="px-3 py-3 w-[90px]">Tipo</th>
                        <th className="px-4 py-3 min-w-[180px]">Dirección y Contacto</th>
                        <th className="px-4 py-3 min-w-[140px]">Comuna / Sector</th>
                        <th className="px-3 py-3 w-[160px] text-center">B.20 / B.10 / Soda</th>
                        <th className="px-4 py-3 w-[130px] text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rb.clientes.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-12 text-center text-slate-400 italic">
                            Sin clientes fijos asignados a esta plantilla.
                          </td>
                        </tr>
                      ) : (
                        rb.clientes.map((c: any) => {
                          const enEdicion = editando === c.id;
                          return (
                            <tr key={c.id} className="hover:bg-slate-50 transition-colors">

                              <td className="px-5 py-3 font-bold text-slate-800 align-middle">
                                {c.cliente?.nombre}
                              </td>

                              <td className="px-3 py-3 align-middle">
                                <span className={`text-[9px] font-black px-2.5 py-1 rounded tracking-wide ${
                                  c.cliente?.tipo === 'EMPRESA'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {c.cliente?.tipo}
                                </span>
                              </td>

                              <td className="px-4 py-3 align-middle text-[11px] leading-relaxed">
                                <span className="block text-slate-700 font-medium truncate max-w-[200px]" title={c.cliente?.direccion}>
                                  📍 {c.cliente?.direccion}
                                </span>
                                <span className="block text-slate-500 mt-0.5 font-medium">
                                  📞 {c.cliente?.telefono || 'Sin teléfono'}
                                </span>
                              </td>

                              <td className="px-4 py-3 align-middle text-[11px]">
                                <span className="block font-bold text-slate-700">
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
                                      className="w-11 border border-slate-300 rounded p-1 text-center text-[11px] font-bold focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] outline-none"
                                      title="Bidones 20L"
                                    />
                                    <input
                                      type="number"
                                      min={0}
                                      value={cantidadesEdicion.bot10_default}
                                      onChange={e => setCantidadesEdicion(prev => ({ ...prev, bot10_default: Math.max(0, Number(e.target.value)) }))}
                                      className="w-11 border border-slate-300 rounded p-1 text-center text-[11px] font-bold focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] outline-none"
                                      title="Bidones 10L"
                                    />
                                    <input
                                      type="number"
                                      min={0}
                                      value={cantidadesEdicion.soda_default}
                                      onChange={e => setCantidadesEdicion(prev => ({ ...prev, soda_default: Math.max(0, Number(e.target.value)) }))}
                                      className="w-11 border border-slate-300 rounded p-1 text-center text-[11px] font-bold focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] outline-none"
                                      title="Sodas"
                                    />
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => iniciarEdicion(c)}
                                    className="w-full flex items-center justify-center gap-2 text-[11px] font-bold text-slate-700 hover:text-[#1e40af] transition-colors"
                                    title="Click para editar cantidades"
                                  >
                                    <span className="flex items-center gap-1">
                                      <Droplet className="h-3 w-3 text-blue-500" />{c.bot20_default ?? 0}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Droplet className="h-3 w-3 text-sky-400" />{c.bot10_default ?? 0}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <GlassWater className="h-3 w-3 text-slate-400" />{c.soda_default ?? 0}
                                    </span>
                                  </button>
                                )}
                              </td>

                              {/* Acción */}
                              <td className="px-4 py-3 text-center align-middle">
                                {enEdicion ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => guardarEdicion(c.id)}
                                      disabled={cargando}
                                      className="text-emerald-600 hover:text-emerald-800 disabled:opacity-40 font-bold px-2 py-1 rounded hover:bg-emerald-50 transition-colors text-[11px]"
                                    >
                                      Guardar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelarEdicion}
                                      className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded hover:bg-slate-100 transition-colors text-[11px]"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => eliminarCliente(c.id, rb.id)}
                                    disabled={cargando}
                                    className="text-red-500 hover:text-red-700 disabled:opacity-40 font-bold px-3 py-1.5 rounded hover:bg-red-50 transition-colors text-[11px]"
                                    title="Quitar de la ruta"
                                  >
                                    Quitar
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

      {/* MODAL: Fijar cantidades al agregar cliente */}
      {pendiente && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
              Cantidades por Defecto
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Para <span className="font-bold text-slate-800">{pendiente.cliente.nombre}</span>, definí lo que se le carga cada vez que sale esta ruta.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-2">
                  <Droplet className="h-3.5 w-3.5 text-blue-500" /> Bidón 20L
                </label>
                <input
                  type="number"
                  min={0}
                  value={cantidadesModal.bot20_default}
                  onChange={e => setCantidadesModal(prev => ({ ...prev, bot20_default: Math.max(0, Number(e.target.value)) }))}
                  className="border border-slate-300 rounded-lg p-2 w-20 text-center font-bold focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] outline-none"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-2">
                  <Droplet className="h-3.5 w-3.5 text-sky-400" /> Bidón 10L
                </label>
                <input
                  type="number"
                  min={0}
                  value={cantidadesModal.bot10_default}
                  onChange={e => setCantidadesModal(prev => ({ ...prev, bot10_default: Math.max(0, Number(e.target.value)) }))}
                  className="border border-slate-300 rounded-lg p-2 w-20 text-center font-bold focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] outline-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-2">
                  <GlassWater className="h-3.5 w-3.5 text-slate-400" /> Soda
                </label>
                <input
                  type="number"
                  min={0}
                  value={cantidadesModal.soda_default}
                  onChange={e => setCantidadesModal(prev => ({ ...prev, soda_default: Math.max(0, Number(e.target.value)) }))}
                  className="border border-slate-300 rounded-lg p-2 w-20 text-center font-bold focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <button
                type="button"
                onClick={cancelarAlta}
                disabled={cargando}
                className="flex-1 border border-slate-300 text-slate-600 font-bold p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-xs uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarAlta}
                disabled={cargando}
                className="flex-1 bg-[#1e40af] hover:bg-blue-800 text-white font-bold p-2.5 rounded-lg transition-colors text-xs uppercase tracking-wider"
              >
                {cargando ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}