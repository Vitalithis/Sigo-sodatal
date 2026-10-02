'use client';

import React, { useState, useEffect } from 'react';
import NuevoPedidoModal from './NuevoPedidoModal';
import TablaSortable from './TablaSortable'; 
import { DiaSemana } from '@lib/prisma/generated'; 
import { 
  obtenerRutasPorFechaAction, 
  generarRutasDesdeBaseAction, 
  asignarPedidoARutaAction,
  actualizarParadaCompletaAction,
  actualizarOrdenParadasAction,
  actualizarEsperadoParadaAction,
  eliminarRutaDiaAction,
  eliminarParadaAction
} from '../actions';

import VistaCalendarioRutas from './VistaCalendarioRutas';
import ModalEliminarParada from './ModalEliminarParada';
import { Calendar, ListFilter } from 'lucide-react';

const getFechaHoyLocal = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function RutasManager() {
  const [vistaModo, setVistaModo] = useState<'despacho' | 'calendario'>('despacho');
  const [fechaSeleccionada, setFechaSeleccionada] = useState(getFechaHoyLocal);
  const [rutas, setRutas] = useState<any[]>([]);
  const [pedidosFlotantes, setPedidosFlotantes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [paradaParaEliminar, setParadaParaEliminar] = useState<{ id: string; nombreCliente?: string } | null>(null);
  const [eliminandoParada, setEliminandoParada] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState<{ texto: string; error: boolean } | null>(null);

  const diasSemanaUnidad = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  const numDia = new Date(fechaSeleccionada + 'T12:00:00').getDay();
  const nombreDiaSemana = diasSemanaUnidad[numDia];

  const cargarDatos = async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    setMensajeEstado(null);
    const res = await obtenerRutasPorFechaAction(fechaSeleccionada);
    if (res.success) {
      setRutas(res.rutas || []);
      setPedidosFlotantes(res.pedidos || []);
    }
    if (!silencioso) setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, [fechaSeleccionada]);

  const handleIniciarHojasDelDia = async () => {
    setCargando(true);
    setMensajeEstado(null);
    const diaEnum = nombreDiaSemana as DiaSemana;
    const respuesta = await generarRutasDesdeBaseAction(fechaSeleccionada, diaEnum);
    if (respuesta.success) {
      setMensajeEstado({ texto: respuesta.message, error: false });
      await cargarDatos();
    } else {
      setMensajeEstado({ texto: respuesta.message || 'Error desconocido.', error: true });
      setCargando(false);
    }
  };

  const handleActualizarParada = async (paradaId: string, datos: any) => {
    const res = await actualizarParadaCompletaAction(paradaId, datos);
    if (res.success) await cargarDatos(true);
    return res; 
  };

  const handleActualizarEsperado = async (
    paradaId: string,
    cantidades: any
  ) => {
    const res = await actualizarEsperadoParadaAction(paradaId, cantidades);
    if (res.success) await cargarDatos(true);
    return res;
  };

  const handleEliminarRuta = async (rutaDiaId: string) => {
    if (!confirm('¿Eliminar esta hoja de ruta completa? Se perderán todas sus paradas y no se puede deshacer.')) return;
    const res = await eliminarRutaDiaAction(rutaDiaId);
    if (res.success) {
      await cargarDatos();
    } else {
      alert('Error al eliminar: ' + res.message);
    }
  };

  const handleSolicitarEliminarParada = (paradaId: string, nombreCliente?: string) => {
    setParadaParaEliminar({ id: paradaId, nombreCliente });
  };

  const handleConfirmarEliminarParada = async () => {
    if (!paradaParaEliminar) return;
    setEliminandoParada(true);
    const res = await eliminarParadaAction(paradaParaEliminar.id);
    if (res.success) {
      setMensajeEstado({ texto: res.message || 'Pedido quitado de la ruta.', error: false });
      await cargarDatos(true);
    } else {
      setMensajeEstado({ texto: res.message || 'Error al quitar el pedido.', error: true });
    }
    setEliminandoParada(false);
    setParadaParaEliminar(null);
  };

  const handleReorder = async (rutaId: string, nuevasParadas: any[]) => {
    setRutas(prev => prev.map(r => r.id === rutaId ? { ...r, paradas: nuevasParadas } : r));
    const payload = nuevasParadas.map((parada, index) => ({ id: parada.id, orden_nuevo: index + 1 }));
    const res = await actualizarOrdenParadasAction(payload);
    if (!res.success) {
      alert('Error al guardar el nuevo orden: ' + res.message);
      await cargarDatos(true);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Tabs de Modo de Vista ── */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-2xl shadow-sm gap-1">
        <button
          onClick={() => setVistaModo('despacho')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
            vistaModo === 'despacho'
              ? 'bg-[#013299] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ListFilter className="h-4 w-4" />
          Hojas de Ruta del Día
        </button>
        <button
          onClick={() => setVistaModo('calendario')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
            vistaModo === 'calendario'
              ? 'bg-[#013299] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Vista Calendario y Frecuencia de Visita
        </button>
      </div>

      {vistaModo === 'calendario' ? (
        <VistaCalendarioRutas />
      ) : (
        <>
          {/* ── Barra superior ── */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Día de Despacho
                </label>
                <input
                  type="date"
                  value={fechaSeleccionada}
                  onChange={(e) => setFechaSeleccionada(e.target.value)}
                  className="border border-slate-200 bg-slate-50 hover:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013299]/20 transition-all cursor-pointer"
                />
              </div>
              <div className="pt-5">
                <span className="bg-blue-50 text-[#013299] px-3.5 py-2 rounded-xl font-black text-xs border border-blue-200/60 uppercase tracking-wider">
                  {nombreDiaSemana}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleIniciarHojasDelDia}
                disabled={cargando}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all uppercase tracking-wider flex items-center gap-1.5"
              >
                {cargando ? 'Procesando...' : '📥 Cargar Ruta Base (Fijos)'}
              </button>
              <button
                onClick={() => setModalAbierto(true)}
                className="bg-[#013299] hover:bg-blue-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all uppercase tracking-wider flex items-center gap-1.5"
              >
                ➕ Agendar Pedido
              </button>
            </div>
          </div>

      {/* ── Alertas de feedback ── */}
      {mensajeEstado && (
        <div className={`p-4 rounded-2xl border text-xs font-bold ${
          mensajeEstado.error
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {mensajeEstado.texto}
        </div>
      )}

      {/* ── Contenido principal ── */}
      {cargando ? (
        <div className="text-center py-12 text-sm font-medium text-slate-500">
          Cargando la planificación de la jornada...
        </div>
      ) : rutas.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 p-12 text-center rounded-2xl">
          <p className="text-slate-700 font-bold text-base">No hay Hojas de Ruta activas en esta fecha.</p>
          <p className="text-xs text-slate-400 mt-1">
            Haga clic en "Cargar Ruta Base (Fijos)" para iniciar las rutas configuradas del día {nombreDiaSemana}.
          </p>
        </div>
      ) : (
        /* ── Una sola columna, ancho completo, TablaSortable es el contenedor ── */
        <div className="flex flex-col gap-6">
          {rutas.map((ruta) => (
            <TablaSortable
              key={ruta.id}
              rutaId={ruta.id}
              ruta={ruta}
              paradas={ruta.paradas}
              onReorder={handleReorder}
              onActualizarParada={handleActualizarParada}
              onActualizarEsperado={handleActualizarEsperado}
              onEliminarRuta={handleEliminarRuta}
              onEliminarParada={handleSolicitarEliminarParada}
            />
          ))}
        </div>
      )}

      {/* ── Modal nuevo pedido ── */}
      <NuevoPedidoModal
        fecha={fechaSeleccionada}
        isOpen={modalAbierto}
        rutasDia={rutas}
        onClose={() => setModalAbierto(false)}
        onSuccess={() => { setModalAbierto(false); cargarDatos(); }}
      />

      {/* ── Modal confirmar eliminar parada ── */}
      <ModalEliminarParada
        isOpen={!!paradaParaEliminar}
        paradaInfo={paradaParaEliminar}
        isPending={eliminandoParada}
        onConfirm={handleConfirmarEliminarParada}
        onCancel={() => setParadaParaEliminar(null)}
      />
        </>
      )}
    </div>
  );
}