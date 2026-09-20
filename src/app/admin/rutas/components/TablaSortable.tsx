'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare } from 'lucide-react';

type EstadoParada = 'PENDIENTE' | 'ENTREGADO' | 'FALLIDO' | 'POSTERGADO';

const NUM_COLUMNAS = 9; // drag | nombre | telefono | direccion | b20 | b10 | soda | obs+estado(agrupadas en 1) -> ver nota abajo

// sector puede llegar como string, objeto {nombre}, o null
function getSectorNombre(p: any): string {
  const s = p.cliente?.sector;
  if (!s) return 'Sin Sector';
  if (typeof s === 'string') return s;
  return s.nombre || 'Sin Sector';
}

// --- FILA ARRASTRABLE ---
function SortableRow({ parada, index, onActualizarParada, onActualizarEsperado }: { parada: any, index: number, onActualizarParada: any, onActualizarEsperado: any }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: parada.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const [estado, setEstado] = useState<EstadoParada>((parada.estado as EstadoParada) || 'PENDIENTE');
  const [b20, setB20] = useState(parada.bot20_entregado || '');
  const [b10, setB10] = useState(parada.bot10_entregado || '');
  const [soda, setSoda] = useState(parada.soda_entregada || '');
  const [obs, setObs] = useState(parada.observaciones || '');
  const [expandido, setExpandido] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [confirmado, setConfirmado] = useState(parada.estado === 'ENTREGADO');
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error', texto: string } | null>(null);

  // ── Cantidad ESPERADA del día (editable solo mientras está PENDIENTE) ──
  const [espB20, setEspB20] = useState(String(parada.bot20_esperado ?? 0));
  const [espB10, setEspB10] = useState(String(parada.bot10_esperado ?? 0));
  const [espSoda, setEspSoda] = useState(String(parada.soda_esperada ?? 0));
  const [guardandoEsperado, setGuardandoEsperado] = useState(false);

  useEffect(() => {
    setEstado((parada.estado as EstadoParada) || 'PENDIENTE');
    setB20(parada.bot20_entregado || '');
    setB10(parada.bot10_entregado || '');
    setSoda(parada.soda_entregada || '');
    setObs(parada.observaciones || '');
    setConfirmado(parada.estado === 'ENTREGADO');
    setEspB20(String(parada.bot20_esperado ?? 0));
    setEspB10(String(parada.bot10_esperado ?? 0));
    setEspSoda(String(parada.soda_esperada ?? 0));
  }, [parada.estado, parada.bot20_entregado, parada.bot10_entregado, parada.soda_entregada, parada.observaciones, parada.bot20_esperado, parada.bot10_esperado, parada.soda_esperada]);

  const guardarEsperado = async () => {
    if (estado !== 'PENDIENTE') return;

    const nuevo = {
      bot20_esperado: Math.max(0, Number(espB20) || 0),
      bot10_esperado: Math.max(0, Number(espB10) || 0),
      soda_esperada: Math.max(0, Number(espSoda) || 0),
    };

    const sinCambios =
      nuevo.bot20_esperado === (parada.bot20_esperado || 0) &&
      nuevo.bot10_esperado === (parada.bot10_esperado || 0) &&
      nuevo.soda_esperada === (parada.soda_esperada || 0);
    if (sinCambios) return;

    setGuardandoEsperado(true);
    const res = await onActualizarEsperado(parada.id, nuevo);
    if (!res?.success) {
      setEspB20(String(parada.bot20_esperado ?? 0));
      setEspB10(String(parada.bot10_esperado ?? 0));
      setEspSoda(String(parada.soda_esperada ?? 0));
      setMensaje({ tipo: 'error', texto: res?.message || ' No se pudo actualizar lo esperado' });
    }
    setGuardandoEsperado(false);
  };

  const manejarCambioEstado = async (nuevoEstado: EstadoParada) => {
    setEstado(nuevoEstado);
    setMensaje(null);
    setMotivo('');
    if (nuevoEstado === 'FALLIDO' || nuevoEstado === 'POSTERGADO') {
      setExpandido(true);
    } else {
      setExpandido(false);
      if (nuevoEstado === 'ENTREGADO') {
        setConfirmado(false);
        // Pre-cargar con lo esperado: en el caso común, se entrega justo eso.
        setB20(String(parada.bot20_esperado ?? 0));
        setB10(String(parada.bot10_esperado ?? 0));
        setSoda(String(parada.soda_esperada ?? 0));
      }
      if (nuevoEstado === 'PENDIENTE') {
        setB20(''); setB10(''); setSoda('');
        await onActualizarParada(parada.id, {
          estado: 'PENDIENTE',
          cantidades: { bot20: 0, bot10: 0, soda: 0 },
        });
      }
    }
  };

  const guardarObservacion = async () => {
    if (obs === (parada.observaciones || '')) return;
    await onActualizarParada(parada.id, { estado, observaciones: obs });
  };

  const confirmarEntrega = async () => {
    setGuardando(true);
    setMensaje(null);
    const res = await onActualizarParada(parada.id, {
      estado: 'ENTREGADO',
      cantidades: { bot20: Number(b20), bot10: Number(b10), soda: Number(soda) },
      observaciones: obs,
    });
    if (res?.success) { setMensaje({ tipo: 'ok', texto: ' Guardado' }); setConfirmado(true); }
    else { setMensaje({ tipo: 'error', texto: res?.message || ' Error' }); setEstado('PENDIENTE'); }
    setGuardando(false);
  };

  const confirmarFallido = async () => {
    setMensaje(null);
    if (!motivo.trim()) { setMensaje({ tipo: 'error', texto: ' Ingresa el motivo' }); return; }
    setGuardando(true);
    const fechaHora = new Date().toLocaleString('es-CL');
    const res = await onActualizarParada(parada.id, {
      estado: 'FALLIDO',
      observacion: `${motivo.trim()} \n[Registrado: ${fechaHora}]`,
    });
    if (res?.success) { setMensaje({ tipo: 'ok', texto: ' Registrado' }); setExpandido(false); setMotivo(''); }
    else setMensaje({ tipo: 'error', texto: res?.message || ' Error' });
    setGuardando(false);
  };

  const confirmarPostergado = async () => {
    setMensaje(null);
    if (!motivo.trim()) { setMensaje({ tipo: 'error', texto: ' Ingresa el motivo' }); return; }
    setGuardando(true);
    const fechaHora = new Date().toLocaleString('es-CL');
    const res = await onActualizarParada(parada.id, {
      estado: 'POSTERGADO',
      observacion: `${motivo.trim()} \n[Registrado: ${fechaHora}]`,
    });
    if (res?.success) { setMensaje({ tipo: 'ok', texto: ' Postergado' }); setExpandido(false); setMotivo(''); }
    else setMensaje({ tipo: 'error', texto: res?.message || ' Error' });
    setGuardando(false);
  };

  const esExpandible = estado === 'FALLIDO' || estado === 'POSTERGADO';
  const editable = estado === 'PENDIENTE' || (estado === 'ENTREGADO' && !confirmado);

  const colorExpandido = estado === 'POSTERGADO'
    ? { bg: 'bg-amber-50/60', border: 'border-amber-100', label: 'text-amber-800', ring: 'focus:ring-amber-400', borderInput: 'border-amber-200', btn: 'bg-amber-500 hover:bg-amber-600' }
    : { bg: 'bg-red-50/60', border: 'border-red-100', label: 'text-red-800', ring: 'focus:ring-red-400', borderInput: 'border-red-200', btn: 'bg-red-600 hover:bg-red-700' };

  const estadoBadge = {
    ENTREGADO:  { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: ' ENTREGADO' },
    FALLIDO:    { text: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     label: ' FALLIDO'   },
    POSTERGADO: { text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   label: ' POSTERGADO'   },
    PENDIENTE:  { text: 'text-slate-600',   bg: 'bg-slate-50',   border: 'border-slate-200',   label: ' PENDIENTE'     },
  }[estado] ?? { text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', label: ' PENDIENTE' };

  // Definición única de las 3 columnas de cantidades (evita repetir 3 bloques casi iguales)
  const columnasCantidad = [
    { key: 'b20', label: 'B.20', esperado: parada.bot20_esperado, val: estado === 'PENDIENTE' ? espB20 : b20, setEsp: setEspB20, setEnt: setB20 },
    { key: 'b10', label: 'B.10', esperado: parada.bot10_esperado, val: estado === 'PENDIENTE' ? espB10 : b10, setEsp: setEspB10, setEnt: setB10 },
    { key: 'soda', label: 'Soda', esperado: parada.soda_esperada, val: estado === 'PENDIENTE' ? espSoda : soda, setEsp: setEspSoda, setEnt: setSoda },
  ] as const;

  return (
    <>
      <tr
        ref={setNodeRef}
        style={style}
        className={`border-b border-slate-100 hover:bg-slate-50/70 group transition-colors ${
          isDragging ? 'bg-blue-50 shadow-xl relative z-50' : 'bg-white'
        }`}
      >
        {/* Drag handle */}
        <td {...attributes} {...listeners}
          className="pl-2 pr-1 text-center cursor-grab active:cursor-grabbing w-8 align-middle shrink-0">
          <span className="text-[13px] leading-none text-slate-300 group-hover:text-blue-400 transition-colors">⋮⋮</span>
        </td>

        {/* Nombre */}
        <td className="py-1.5 px-2 align-middle w-48">
          <p className="font-semibold text-slate-800 text-[11px] leading-tight">{parada.cliente?.nombre}</p>
        </td>

        {/* Teléfono */}
        <td className="py-1.5 px-2 align-middle w-32">
          <p className="text-[10px] text-slate-500 leading-tight whitespace-nowrap">
            {parada.cliente?.telefono ? ` ${parada.cliente.telefono}` : '—'}
          </p>
        </td>

        {/* Dirección */}
        <td className="py-1.5 px-2 align-middle">
          <p className="text-[10px] text-slate-500 leading-tight truncate max-w-[260px]" title={parada.cliente?.direccion}>
            {parada.cliente?.direccion}
          </p>
        </td>

        {/* B.20 / B.10 / Soda: cada una su propia columna */}
        {columnasCantidad.map(c => (
          <td key={c.key} className="py-1.5 px-1 align-middle w-16 text-center">
            <input
              type="number" min={0}
              disabled={!editable || guardandoEsperado}
              value={c.val}
              onChange={e => estado === 'PENDIENTE' ? c.setEsp(e.target.value) : c.setEnt(e.target.value)}
              onBlur={estado === 'PENDIENTE' ? guardarEsperado : undefined}
              placeholder="—"
              title={
                estado === 'PENDIENTE'
                  ? `${c.label}: cantidad esperada para hoy`
                  : `${c.label}: cantidad entregada${c.esperado > 0 ? ` (esperado: ${c.esperado})` : ''}`
              }
              className="w-12 h-6 mx-auto text-center border border-slate-200 rounded text-[10px] font-bold text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none disabled:bg-slate-50 disabled:opacity-30 transition-colors"
            />
          </td>
        ))}

        {/* Observaciones */}
        <td className="py-1.5 px-2 align-middle w-56">
          {esExpandible && !expandido ? (
            <button onClick={() => setExpandido(true)}
              className={`text-[9px] font-bold flex items-center gap-1 hover:underline ${estado === 'POSTERGADO' ? 'text-amber-500' : 'text-red-500'}`}>
              <MessageSquare className="w-3 h-3"/> Editar Motivo
            </button>
          ) : !esExpandible ? (
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              onBlur={guardarObservacion}
              placeholder="Obs..."
              rows={1}
              onInput={e => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
              }}
              className="w-full text-[9px] border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white transition-colors resize-none overflow-hidden leading-tight"
            />
          ) : <span className="text-slate-200 text-[9px]">—</span>}
        </td>

        {/* Estado */}
        <td className="py-1.5 px-2 align-middle w-32">
          <select value={estado} onChange={e => manejarCambioEstado(e.target.value as EstadoParada)}
            className={`w-full text-[9px] font-extrabold px-1.5 py-1.5 rounded border cursor-pointer focus:outline-none focus:ring-1 tracking-wide transition-colors ${estadoBadge.bg} ${estadoBadge.text} ${estadoBadge.border} focus:ring-blue-200`}>
            <option value="PENDIENTE">PENDIENTE.</option>
            <option value="ENTREGADO">ENTREGADO</option>
            <option value="FALLIDO">FALLIDO</option>
            <option value="POSTERGADO">POSTERGADO</option>
          </select>
          {estado === 'ENTREGADO' && !confirmado && (
            <button onClick={confirmarEntrega} disabled={guardando}
              className="mt-1 w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white text-[9px] font-bold py-1 rounded shadow-sm uppercase tracking-wider transition-colors">
              {guardando ? '…' : 'Confirmar'}
            </button>
          )}
          {mensaje && !esExpandible && (
            <div className={`mt-0.5 text-[9px] font-bold ${mensaje.tipo === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
              {mensaje.texto}
            </div>
          )}
        </td>
      </tr>

      {/* Formulario desplegable Fallido / Postergado */}
      {esExpandible && expandido && (
        <tr className={`${colorExpandido.bg} border-b ${colorExpandido.border}`}>
          <td colSpan={NUM_COLUMNAS} className="px-3 py-2.5">
            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <div className="flex-1 w-full">
                <label className={`text-[9px] font-black uppercase tracking-wider ${colorExpandido.label}`}>
                  {estado === 'POSTERGADO' ? '¿Por qué se posterga?' : '¿Por qué falló la entrega?'}
                </label>
                <textarea value={motivo} onChange={e => { setMotivo(e.target.value); setMensaje(null); }}
                  className={`w-full text-xs p-2 border ${colorExpandido.borderInput} rounded mt-1 outline-none focus:ring-1 ${colorExpandido.ring} bg-white`}
                  rows={2}
                  placeholder={estado === 'POSTERGADO' ? 'Ej: Cliente pidió para la próxima semana...' : 'Ej: Local cerrado, no contestó el teléfono...'} />
              </div>
              <div className="flex flex-col items-end justify-end h-full mt-1 sm:mt-0 w-full sm:w-auto">
                <button onClick={estado === 'POSTERGADO' ? confirmarPostergado : confirmarFallido}
                  disabled={guardando}
                  className={`${colorExpandido.btn} disabled:opacity-50 text-white text-[10px] uppercase tracking-wider font-bold px-4 py-2 rounded h-[52px] w-full shadow-sm transition-colors mt-4`}>
                  {guardando ? '…' : estado === 'POSTERGADO' ? 'Postergar' : 'Registrar'}
                </button>
                {mensaje && (
                  <span className={`text-[10px] mt-1.5 font-bold ${mensaje.tipo === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                    {mensaje.texto}
                  </span>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// --- GRUPO DE SECTOR ARRASTRABLE ---
function SectorGroup({
  sector, sparadas, paradas, onActualizarParada, onActualizarEsperado,
}: { sector: string; sparadas: any[]; paradas: any[]; onActualizarParada: any; onActualizarEsperado: any }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `sector::${sector}` });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const itemsIds = useMemo(() => sparadas.map((p: any) => p.id), [sparadas]);

  const totalSector = sparadas.reduce((acc, p) => {
    acc.b20 += p.bot20_esperado || 0;
    acc.b10 += p.bot10_esperado || 0;
    acc.soda += p.soda_esperada || 0;
    return acc;
  }, { b20: 0, b10: 0, soda: 0 });

  return (
    <tbody ref={setNodeRef} style={style} className={isDragging ? 'relative z-40 shadow-lg' : ''}>
      <tr className="bg-slate-100 border-y border-slate-200">
        <td
          {...attributes} {...listeners}
          className="pl-2 pr-1 w-8 text-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-blue-500"
        >
          ⋮⋮
        </td>
        <td colSpan={NUM_COLUMNAS - 1} className="px-2 py-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">
               {sector}
            </span>
            <span className="text-[9px] text-slate-400">
              {sparadas.length} parada{sparadas.length !== 1 ? 's' : ''}
            </span>
          </div>
        </td>
      </tr>

      <SortableContext items={itemsIds} strategy={verticalListSortingStrategy}>
        {sparadas.map((parada: any) => (
          <SortableRow
            key={parada.id}
            parada={parada}
            index={paradas.indexOf(parada)}
            onActualizarParada={onActualizarParada}
            onActualizarEsperado={onActualizarEsperado}
          />
        ))}
      </SortableContext>
    </tbody>
  );
}

// --- COMPONENTE PRINCIPAL ---
interface TablaSortableProps {
  rutaId: string;
  ruta: any;
  paradas: any[];
  onReorder: (rutaId: string, nuevasParadas: any[]) => void;
  onActualizarParada: (paradaId: string, datos: any) => Promise<{ success: boolean; message?: string }>;
  onActualizarEsperado: (
    paradaId: string,
    cantidades: { bot20_esperado: number; bot10_esperado: number; soda_esperada: number }
  ) => Promise<{ success: boolean; message?: string }>;
}

export default function TablaSortable({ rutaId, ruta, paradas, onReorder, onActualizarParada, onActualizarEsperado }: TablaSortableProps) {
  const sectores = useMemo(() => {
    const map: Record<string, any[]> = {};
    paradas.forEach(p => {
      const sector = getSectorNombre(p);
      if (!map[sector]) map[sector] = [];
      map[sector].push(p);
    });
    return map;
  }, [paradas]);

  const sectorIds = useMemo(() => Object.keys(sectores).map(s => `sector::${s}`), [sectores]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith('sector::')) {
      if (!overId.startsWith('sector::')) return;
      const nombresSectores = Object.keys(sectores);
      const oldIndex = nombresSectores.indexOf(activeId.replace('sector::', ''));
      const newIndex = nombresSectores.indexOf(overId.replace('sector::', ''));
      if (oldIndex === -1 || newIndex === -1) return;

      const nuevoOrdenSectores = arrayMove(nombresSectores, oldIndex, newIndex);
      const nuevasParadas = nuevoOrdenSectores.flatMap(s => sectores[s]);
      onReorder(rutaId, nuevasParadas);
      return;
    }

    const paradaActiva = paradas.find(p => p.id === activeId);
    const paradaOver = paradas.find(p => p.id === overId);
    if (!paradaActiva || !paradaOver) return;
    if (getSectorNombre(paradaActiva) !== getSectorNombre(paradaOver)) return;

    const oldIndex = paradas.findIndex(p => p.id === activeId);
    const newIndex = paradas.findIndex(p => p.id === overId);
    onReorder(rutaId, arrayMove(paradas, oldIndex, newIndex));
  };

  const totales = paradas.reduce((acc, p) => {
    if (p.estado === 'ENTREGADO') {
      acc.b20 += p.bot20_entregado || 0;
      acc.b10 += p.bot10_entregado || 0;
      acc.soda += p.soda_entregada || 0;
    } else if (p.estado === 'PENDIENTE' || !p.estado) {
      acc.b20 += p.bot20_esperado || 0;
      acc.b10 += p.bot10_esperado || 0;
      acc.soda += p.soda_esperada || 0;
    }
    return acc;
  }, { b20: 0, b10: 0, soda: 0 });

  const handlePrint = () => {
    const ventana = window.open('', '_blank');
    if (!ventana) return;

    const porSector: Record<string, any[]> = {};
    paradas.forEach(p => {
      const s = getSectorNombre(p);
      if (!porSector[s]) porSector[s] = [];
      porSector[s].push(p);
    });

    const estadoInfo: Record<string, { label: string; color: string }> = {
      ENTREGADO:  { label: '✔ Entregado',  color: '#059669' },
      FALLIDO:    { label: '✘ Fallido',    color: '#dc2626' },
      POSTERGADO: { label: '↻ Postergado', color: '#d97706' },
      PENDIENTE:  { label: '… PENDIENTE',  color: '#64748b' },
    };

    const cantidadesParada = (p: any) => {
      if (p.estado === 'ENTREGADO') {
        return { b20: p.bot20_entregado || 0, b10: p.bot10_entregado || 0, soda: p.soda_entregada || 0 };
      }
      if (p.estado === 'FALLIDO' || p.estado === 'POSTERGADO') {
        return { b20: 0, b10: 0, soda: 0 };
      }
      return { b20: p.bot20_esperado || 0, b10: p.bot10_esperado || 0, soda: p.soda_esperada || 0 };
    };

    const observacionParada = (p: any) => {
      if (p.estado === 'FALLIDO') return p.motivo_fallo || p.observaciones || '—';
      if (p.estado === 'POSTERGADO') return p.motivo_postergacion || p.observaciones || '—';
      return p.observaciones || '—';
    };

    const filasSectores = Object.entries(porSector).map(([sector, sparadas]) => `
      <tr><td colspan="8" class="sector-row" style="padding-left:4px;"> ${sector} (${sparadas.length} parada${sparadas.length !== 1 ? 's' : ''})</td></tr>
      ${sparadas.map((p, i) => {
        const cant = cantidadesParada(p);
        const info = estadoInfo[p.estado] || estadoInfo.PENDIENTE;
        return `
        <tr>
          <td class="center gray">${i + 1}</td>
          <td><b>${p.cliente?.nombre || '—'}</b>${p.cliente?.telefono ? `<br><span class="gray">${p.cliente.telefono}</span>` : ''}</td>
          <td class="gray">${p.cliente?.direccion || '—'}</td>
          <td class="center">${cant.b20 || '—'}</td>
          <td class="center">${cant.b10 || '—'}</td>
          <td class="center">${cant.soda || '—'}</td>
          <td class="gray obs">${observacionParada(p)}</td>
          <td class="center" style="color:${info.color}; font-weight:bold;">${info.label}</td>
        </tr>
      `;
      }).join('')}
    `).join('');

    ventana.document.write(`
      <html>
        <head>
          <title>Ruta ${ruta?.vehiculo?.patente || ''} — ${ruta?.usuario?.nombre || ''}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 10px; color: #111; padding: 12px; }
            .header { background: #394dfe80; color: white; padding: 6px 10px; border-radius: 4px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
            .header h2 { font-size: 12px; font-weight: bold; }
            .header p { font-size: 9px; color: #94a3b8; margin-top: 2px; }
            .totales { font-size: 9px; text-align: right; }
            .sector-row { background: #f1f5f9; padding: 2px 6px; font-size: 8px; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; }
            th { font-size: 8px; padding: 3px 4px; border-bottom: 1px solid #e2e8f0; color: #64748b; text-transform: uppercase; text-align: center; }
            th.left { text-align: left; }
            td { font-size: 9px; padding: 3px 4px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
            td.center { text-align: center; font-weight: bold; }
            td.gray { color: #94a3b8; }
            td.obs { white-space: normal; max-width: 220px; word-break: break-word; }
            tfoot td { background: #394dfe80; color: white; font-weight: bold; font-size: 9px; padding: 4px; text-align: center; }
            tfoot td.left { text-align: right; padding-right: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2> ${ruta?.vehiculo?.marca || ''} ${ruta?.vehiculo?.modelo || ''} — ${ruta?.vehiculo?.patente || ''}</h2>
              <p>Repartidor: ${ruta?.usuario?.nombre || ''} ${ruta?.usuario?.apellido || ''}</p>
            </div>
            <div class="totales">
              <div>B.20: ${totales.b20} · B.10: ${totales.b10} · Soda: ${totales.soda}</div>
              <div>${paradas.length} paradas</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th class="left" style="width:24px">#</th>
                <th class="left">Cliente</th>
                <th class="left">Dirección</th>
                <th>B.20</th>
                <th>B.10</th>
                <th>Soda</th>
                <th class="left">Observaciones</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>${filasSectores}</tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="left">TOTAL</td>
                <td>${totales.b20}</td>
                <td>${totales.b10}</td>
                <td>${totales.soda}</td>
                <td colspan="2">${paradas.length} paradas</td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => { ventana.print(); ventana.close(); }, 300);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-blue-800 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-bold text-xs">
             {ruta?.vehiculo?.marca} {ruta?.vehiculo?.modelo}
          </span>
          <span className="bg-blue-800 text-white text-[10px] px-1.5 py-0.5 rounded font-mono tracking-wide">
            {ruta?.vehiculo?.patente}
          </span>
          <span className="text-slate-300 text-[10px]">
            {ruta?.usuario?.nombre} {ruta?.usuario?.apellido}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-300 hidden sm:block">
            B.20: <b className="text-white">{totales.b20}</b>
            &nbsp;· B.10: <b className="text-white">{totales.b10}</b>
            &nbsp;· Soda: <b className="text-white">{totales.soda}</b>
            &nbsp;· <b className="text-white">{paradas.length}</b> paradas
          </span>
          <button onClick={handlePrint}
            className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold px-2.5 py-1.5 rounded border border-white/20 transition-colors flex items-center gap-1.5">
             Imprimir
          </button>
        </div>
      </div>

      {/* ── Tabla: columnas reales, con <colgroup> para fijar anchos consistentes ── */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse table-fixed min-w-[900px]">
            <colgroup>
              <col className="w-8" />   {/* drag handle */}
              <col className="w-48" /> {/* nombre */}
              <col className="w-32" /> {/* telefono */}
              <col />                   {/* direccion (flexible) */}
              <col className="w-16" /> {/* b20 */}
              <col className="w-16" /> {/* b10 */}
              <col className="w-16" /> {/* soda */}
              <col className="w-56" /> {/* observaciones */}
              <col className="w-32" /> {/* estado */}
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[9px] font-black tracking-wider uppercase">
                <th className="py-1.5"></th>
                <th className="py-1.5 px-2 text-left overflow-hidden whitespace-nowrap">Nombre</th>
                <th className="py-1.5 px-2 text-left overflow-hidden whitespace-nowrap">Teléfono</th>
                <th className="py-1.5 px-2 text-left overflow-hidden whitespace-nowrap">Dirección</th>
                <th className="py-1.5 px-1 text-center text-blue-500 overflow-hidden whitespace-nowrap" colSpan={3}>B.20 · B.10 · Soda</th>
                <th className="py-1.5 px-2 text-left overflow-hidden whitespace-nowrap">Observaciones</th>
                <th className="py-1.5 px-2 text-center overflow-hidden whitespace-nowrap">Estado</th>
              </tr>
            </thead>

            <SortableContext items={sectorIds} strategy={verticalListSortingStrategy}>
              {Object.entries(sectores).map(([sector, sparadas]) => (
                <SectorGroup
                  key={sector}
                  sector={sector}
                  sparadas={sparadas}
                  paradas={paradas}
                  onActualizarParada={onActualizarParada}
                  onActualizarEsperado={onActualizarEsperado}
                />
              ))}
            </SortableContext>

            <tfoot>
              <tr className="bg-blue-800 text-white text-[9px] font-black">
                <td colSpan={NUM_COLUMNAS} className="p-2 pr-4">
                  <div className="flex items-center justify-end gap-6">
                    <span className="uppercase tracking-wider text-white-400">Total del día</span>
                    <span>B.20: <b className="text-white-300">{totales.b20}</b></span>
                    <span>B.10: <b className="text-white-300">{totales.b10}</b></span>
                    <span>Soda: <b className="text-white-300">{totales.soda}</b></span>
                    <span className="text-white-400">{paradas.length} paradas</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </DndContext>
    </div>
  );
}