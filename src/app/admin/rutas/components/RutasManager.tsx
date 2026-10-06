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
import ModalRutaContencion from './ModalRutaContencion';
import { Calendar, ListFilter, Shield, Zap, Users, Plus } from 'lucide-react';
import { getHoyHabilStr, handleDateInputSoloHabiles } from '@/lib/fechas';

export default function RutasManager() {
  const [vistaModo, setVistaModo] = useState<'despacho' | 'calendario'>('despacho');
  const [fechaSeleccionada, setFechaSeleccionada] = useState(getHoyHabilStr);
  const [rutas, setRutas] = useState<any[]>([]);
  const [rutaSeleccionadaId, setRutaSeleccionadaId] = useState<string | 'todas'>('todas');
  const [pedidosFlotantes, setPedidosFlotantes] = useState<any[]>([]);
  const [choferes, setChoferes] = useState<any[]>([]);
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalContencionAbierto, setModalContencionAbierto] = useState(false);
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
      if (res.choferes) setChoferes(res.choferes);
      if (res.vehiculos) setVehiculos(res.vehiculos);
    }
    if (!silencioso) setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, [fechaSeleccionada]);

  const handleIniciarHojasDelDia = async () => {
    setCargando(true);
    setMensajeEstado(null);

    if (['SABADO', 'DOMINGO'].includes(nombreDiaSemana)) {
      setCargando(false);
      setMensajeEstado({
        texto: `Los repartos habituales con ruta base funcionan de Lunes a Viernes. El día ${nombreDiaSemana} no tiene rutas base programadas. Puedes crear una "Ruta de Contención / Emergencia" si tienes pedidos extraordinarios hoy.`,
        error: true,
      });
      return;
    }

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

      {/* ── Barra Superior Unificada: Pestañas + Día de Despacho y Acciones ── */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Pestañas de modo de vista */}
        <div className="flex bg-slate-100/80 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setVistaModo('despacho')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
              vistaModo === 'despacho'
                ? 'bg-[#013299] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            Hojas de Ruta del Día
          </button>
          <button
            type="button"
            onClick={() => setVistaModo('calendario')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
              vistaModo === 'calendario'
                ? 'bg-[#013299] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Vista Calendario y Frecuencia de Visita
          </button>
        </div>

        {/* Controles de Día de Despacho y Botones (visibles en modo despacho) */}
        {vistaModo === 'despacho' && (
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap ml-auto">
            {/* Selector de fecha compacto */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl shadow-2xs">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Día:</span>
              <input
                id="fecha-despacho"
                name="fecha_despacho"
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => {
                  const ajustada = handleDateInputSoloHabiles(e.target.value, (msg) => {
                    setMensajeEstado({ texto: msg, error: false });
                  });
                  setFechaSeleccionada(ajustada);
                }}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              />
              <span className="bg-blue-50 text-[#013299] border border-blue-200/60 px-2 py-0.5 rounded-md font-black text-[10px] uppercase tracking-wider">
                {nombreDiaSemana}
              </span>
            </div>

            {/* Botones de acción compactos */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setModalContencionAbierto(true)}
                className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
                title="Crear hoja de ruta vacía para emergencias o repartos fuera de horario"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Ruta Express</span>
              </button>

              <button
                type="button"
                onClick={handleIniciarHojasDelDia}
                disabled={cargando}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
                title="Cargar rutas base y clientes fijos programados para este día"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{cargando ? 'Cargando...' : 'Clientes Base'}</span>
              </button>

              <button
                type="button"
                onClick={() => setModalAbierto(true)}
                className="bg-[#013299] hover:bg-blue-900 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
                title="Agendar nuevo pedido de cliente para esta jornada"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agendar Pedido</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {vistaModo === 'calendario' ? (
        <VistaCalendarioRutas />
      ) : (
        <>

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
        <div className="bg-slate-50 border border-dashed border-slate-200 p-10 text-center rounded-2xl">
          <p className="text-slate-800 font-extrabold text-base">No hay Hojas de Ruta activas en esta fecha.</p>
          <p className="text-xs text-slate-500 mt-1.5 max-w-lg mx-auto leading-relaxed">
            {['SABADO', 'DOMINGO'].includes(nombreDiaSemana)
              ? 'Los repartos habituales operan de lunes a viernes. Para salidas de emergencia o despachos en fin de semana, crea una Ruta de Contención / Emergencia.'
              : `Puedes cargar las rutas base configuradas para el día ${nombreDiaSemana}, o crear una Ruta de Contención si se trata de una salida extraordinaria.`}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setModalContencionAbierto(true)}
              className="bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-sm shadow-amber-600/20 transition-all inline-flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" /> Crear Ruta de Contención / Emergencia
            </button>
            {!['SABADO', 'DOMINGO'].includes(nombreDiaSemana) && (
              <button
                type="button"
                onClick={handleIniciarHojasDelDia}
                disabled={cargando}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5"
              >
                📥 Cargar Ruta Base ({nombreDiaSemana})
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ── Selector de Camiones / Rutas si hay más de 1 ruta ── */
        <div className="flex flex-col gap-5">
          {rutas.length > 1 && (
            <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2">
                  Camiones Activos ({rutas.length}):
                </span>

                <button
                  type="button"
                  onClick={() => setRutaSeleccionadaId('todas')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    rutaSeleccionadaId === 'todas'
                      ? 'bg-[#013299] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>Ver Todas</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    rutaSeleccionadaId === 'todas' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {rutas.reduce((acc, r) => acc + (r.paradas?.length || 0), 0)}
                  </span>
                </button>

                {rutas.map((r, idx) => {
                  const totalP = r.paradas?.length || 0;
                  const entregadasP = r.paradas?.filter((p: any) => p.estado === 'ENTREGADO').length || 0;
                  const esActiva = rutaSeleccionadaId === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRutaSeleccionadaId(r.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        esActiva
                          ? 'bg-[#013299] text-white shadow-sm ring-2 ring-[#013299]/20'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <span className="font-extrabold">🚚 {r.vehiculo?.marca || 'Camión'} {r.vehiculo?.modelo || ''}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        esActiva ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                      }`}>
                        {r.vehiculo?.patente || `#${idx + 1}`}
                      </span>
                      <span className="text-[11px] opacity-80 font-medium">· {r.usuario?.nombre || 'Chofer'}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        esActiva ? 'bg-white/20 text-white' : 'bg-blue-100 text-[#013299]'
                      }`}>
                        {entregadasP}/{totalP}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="text-[11px] text-slate-400 font-medium px-2 hidden lg:block">
                {rutaSeleccionadaId === 'todas' ? 'Mostrando todas las hojas de ruta' : 'Vista enfocada en 1 camión'}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-6">
            {(rutaSeleccionadaId === 'todas'
              ? rutas
              : rutas.filter((r) => r.id === rutaSeleccionadaId)
            ).map((ruta) => (
              <TablaSortable
                key={ruta.id}
                rutaId={ruta.id}
                ruta={ruta}
                paradas={ruta.paradas}
                todasLasRutas={rutas}
                choferes={choferes}
                vehiculos={vehiculos}
                onReorder={handleReorder}
                onActualizarParada={handleActualizarParada}
                onActualizarEsperado={handleActualizarEsperado}
                onEliminarRuta={handleEliminarRuta}
                onEliminarParada={handleSolicitarEliminarParada}
                onRutaActualizada={() => cargarDatos(true)}
              />
            ))}
          </div>
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

      {/* ── Modal crear ruta de contención / emergencia ── */}
      <ModalRutaContencion
        isOpen={modalContencionAbierto}
        fechaSeleccionada={fechaSeleccionada}
        choferes={choferes}
        vehiculos={vehiculos}
        onClose={() => setModalContencionAbierto(false)}
        onSuccess={async (msg) => {
          setMensajeEstado({ texto: msg, error: false });
          await cargarDatos();
        }}
      />
        </>
      )}
    </div>
  );
}