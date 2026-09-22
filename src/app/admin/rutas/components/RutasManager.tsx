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
  eliminarRutaDiaAction
} from '../actions';

export default function RutasManager() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [rutas, setRutas] = useState<any[]>([]);
  const [pedidosFlotantes, setPedidosFlotantes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState<{ texto: string; error: boolean } | null>(null);

  const diasSemanaUnidad = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  const numDia = new Date(fechaSeleccionada + 'T12:00:00').getDay();
  const nombreDiaSemana = diasSemanaUnidad[numDia];

  const cargarDatos = async () => {
    setCargando(true);
    setMensajeEstado(null);
    const res = await obtenerRutasPorFechaAction(fechaSeleccionada);
    if (res.success) {
      setRutas(res.rutas || []);
      setPedidosFlotantes(res.pedidos || []);
    }
    setCargando(false);
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
    if (res.success) await cargarDatos();
    return res; 
  };

  const handleActualizarEsperado = async (
    paradaId: string,
    cantidades: { bot20_esperado: number; bot10_esperado: number; soda_esperada: number }
  ) => {
    const res = await actualizarEsperadoParadaAction(paradaId, cantidades);
    if (res.success) await cargarDatos();
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

  const handleReorder = async (rutaId: string, nuevasParadas: any[]) => {
    const rutasClonadas = [...rutas];
    const indexRuta = rutasClonadas.findIndex(r => r.id === rutaId);
    if (indexRuta > -1) {
      rutasClonadas[indexRuta].paradas = nuevasParadas;
      setRutas(rutasClonadas);
    }
    const payload = nuevasParadas.map((parada, index) => ({ id: parada.id, orden_nuevo: index + 1 }));
    setCargando(true);
    const res = await actualizarOrdenParadasAction(payload);
    if (!res.success) {
      alert('Error al guardar el nuevo orden: ' + res.message);
      await cargarDatos();
    }
    setCargando(false);
  };

  return (
    <div className="space-y-6">

      {/* ── Barra superior ── */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Día de despacho</label>
            <input
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="pt-5">
            <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md font-black text-xs border border-blue-100">
               {nombreDiaSemana}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={handleIniciarHojasDelDia} disabled={cargando}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded shadow-sm transition-colors uppercase tracking-wider">
            {cargando ? 'Procesando...' : 'cargar Ruta fijos'}
          </button>
          <button onClick={() => setModalAbierto(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded shadow-sm transition-colors uppercase tracking-wider">
            Agendar Pedido
          </button>
        </div>
      </div>

      {/* ── Alertas de feedback ── */}
      {mensajeEstado && (
        <div className={`p-3 rounded-lg border text-sm font-semibold ${
          mensajeEstado.error
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {mensajeEstado.texto}
        </div>
      )}

      {/* ── Contenido principal ── */}
      {cargando ? (
        <div className="text-center py-12 text-sm font-medium text-gray-500">
          Cargando la planificación de la jornada...
        </div>
      ) : rutas.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 p-12 text-center rounded-xl">
          <p className="text-gray-600 font-bold text-base">No hay Hojas de Ruta activas en esta fecha.</p>
          <p className="text-xs text-gray-400 mt-1">
            Haga clic en "Iniciar Hoja del Día" si ya configuró sus plantillas de ruta base para el día {nombreDiaSemana}.
          </p>
        </div>
      ) : (
        /* ── Una sola columna, ancho completo, TablaSortable es el contenedor ── */
        <div className="flex flex-col gap-6">
          {rutas.map((ruta) =>
            ruta.paradas.length === 0 ? (
              <div key={ruta.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-800 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold text-xs">
                      🚚 {ruta.vehiculo?.marca} {ruta.vehiculo?.modelo}
                    </span>
                    <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono tracking-wide">
                      {ruta.vehiculo?.patente}
                    </span>
                    <span className="text-slate-300 text-[10px]">
                      {ruta.usuario?.nombre} {ruta.usuario?.apellido}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black text-[10px] px-2 py-1 rounded">
                      {ruta.estado}
                    </span>
                    <button onClick={() => handleEliminarRuta(ruta.id)}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-red-100 text-[10px] font-bold px-2.5 py-1.5 rounded border border-red-400/30 transition-colors">
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-400 italic py-6 text-center">
                  Ruta vacía. No tiene clientes ni paradas asignadas todavía.
                </p>
              </div>
            ) : (
              /* Ruta con paradas: TablaSortable ocupa todo el ancho */
              <TablaSortable
                key={ruta.id}
                rutaId={ruta.id}
                ruta={ruta}
                paradas={ruta.paradas}
                onReorder={handleReorder}
                onActualizarParada={handleActualizarParada}
                onActualizarEsperado={handleActualizarEsperado}
                onEliminarRuta={handleEliminarRuta}
              />
            )
          )}
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
    </div>
  );
}