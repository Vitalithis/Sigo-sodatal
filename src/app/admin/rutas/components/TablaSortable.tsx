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
import { MessageSquare, Trash2 } from 'lucide-react';

type EstadoParada = 'PENDIENTE' | 'ENTREGADO' | 'FALLIDO' | 'POSTERGADO';

const NUM_COLUMNAS = 10; // drag | nombre | telefono | direccion | b20 | b10 | soda | observaciones | estado | accion

// sector puede llegar como string, objeto {nombre}, o null
function getSectorNombre(p: any): string {
  const s = p.cliente?.sector;
  if (!s) return 'Sin Sector';
  if (typeof s === 'string') return s;
  return s.nombre || 'Sin Sector';
}

// ── Helpers para Diferenciación 2+1 (Recarga + Nuevo) ──────────────────────────
export function getDesgloseParada(parada: any, cat: 'BOTELLON20' | 'BOTELLON10' | 'SODA') {
  if (parada?._desglose?.[cat]) {
    const d = parada._desglose[cat];
    const esperadoNum = cat === 'BOTELLON20' 
      ? (parada.bot20_esperado ?? d.total) 
      : cat === 'BOTELLON10' 
      ? (parada.bot10_esperado ?? d.total) 
      : (parada.soda_esperada ?? d.total);
    const entregadoNum = cat === 'BOTELLON20' 
      ? (parada.bot20_entregado || 0) 
      : cat === 'BOTELLON10' 
      ? (parada.bot10_entregado || 0) 
      : (parada.soda_entregada || 0);

    return {
      recargas: d.recargas,
      nuevos: d.nuevos,
      totalEsperado: esperadoNum,
      totalCalculado: d.recargas + d.nuevos,
      entregado: entregadoNum,
    };
  }

  let recargas = 0;
  let nuevos = 0;
  let tieneItems = false;

  if (parada?.pedido?.items && Array.isArray(parada.pedido.items) && parada.pedido.items.length > 0) {
    for (const it of parada.pedido.items) {
      const itemCat = it.producto?.categoria ||
        (it.producto_id?.includes('20') ? 'BOTELLON20' :
         it.producto_id?.includes('10') ? 'BOTELLON10' :
         it.producto_id?.includes('soda') ? 'SODA' : null);

      if (itemCat === cat) {
        tieneItems = true;
        const nombre = (it.producto?.nombre || '').toLowerCase();
        const esNuevo = it.tipo_transaccion === 'VENTA' ||
          nombre.includes('nuevo') ||
          nombre.includes('nueva') ||
          nombre.includes('con envase') ||
          nombre.includes('c/envase');

        if (esNuevo) {
          nuevos += (it.cantidad || 0);
        } else {
          recargas += (it.cantidad || 0);
        }
      }
    }
  }

  const esperadoNum = cat === 'BOTELLON20' 
    ? (parada.bot20_esperado || 0) 
    : cat === 'BOTELLON10' 
    ? (parada.bot10_esperado || 0) 
    : (parada.soda_esperada || 0);

  const entregadoNum = cat === 'BOTELLON20' 
    ? (parada.bot20_entregado || 0) 
    : cat === 'BOTELLON10' 
    ? (parada.bot10_entregado || 0) 
    : (parada.soda_entregada || 0);

  if (!tieneItems) {
    recargas = esperadoNum;
    nuevos = 0;
  }

  if (parada) {
    if (!parada._desglose) parada._desglose = {};
    parada._desglose[cat] = { recargas, nuevos, total: esperadoNum };
  }

  return {
    recargas,
    nuevos,
    totalEsperado: esperadoNum,
    totalCalculado: recargas + nuevos,
    entregado: entregadoNum,
  };
}

export function parsearCantidadInput(val: string | number): { recargas: number; nuevos: number; total: number } {
  const str = String(val ?? '').trim();
  if (!str) return { recargas: 0, nuevos: 0, total: 0 };
  if (str.includes('+')) {
    const [r, n] = str.split('+').map(x => parseInt(x.trim()) || 0);
    return { recargas: r, nuevos: n, total: r + n };
  }
  const n = parseInt(str) || 0;
  return { recargas: n, nuevos: 0, total: n };
}

export function formatearCantidadDiferenciada(recargas: number, nuevos: number): string {
  if (nuevos > 0) return `${recargas}+${nuevos}`;
  if (recargas > 0) return `${recargas}`;
  return '0';
}

// --- FILA ARRASTRABLE ---
function SortableRow({ parada, index, onActualizarParada, onActualizarEsperado, onEliminarParada }: { parada: any, index: number, onActualizarParada: any, onActualizarEsperado: any, onEliminarParada: any }) {
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

  const initB20 = getDesgloseParada(parada, 'BOTELLON20');
  const initB10 = getDesgloseParada(parada, 'BOTELLON10');
  const initSoda = getDesgloseParada(parada, 'SODA');

  const [espB20, setEspB20] = useState(
    formatearCantidadDiferenciada(initB20.recargas, initB20.nuevos)
  );
  const [espB10, setEspB10] = useState(
    formatearCantidadDiferenciada(initB10.recargas, initB10.nuevos)
  );
  const [espSoda, setEspSoda] = useState(
    formatearCantidadDiferenciada(initSoda.recargas, initSoda.nuevos)
  );
  const [guardandoEsperado, setGuardandoEsperado] = useState(false);

  useEffect(() => {
    setEstado((parada.estado as EstadoParada) || 'PENDIENTE');
    setB20(String(parada.bot20_entregado ?? ''));
    setB10(String(parada.bot10_entregado ?? ''));
    setSoda(String(parada.soda_entregada ?? ''));
    setObs(parada.observaciones || '');
    setConfirmado(parada.estado === 'ENTREGADO');

    const dB20 = getDesgloseParada(parada, 'BOTELLON20');
    const dB10 = getDesgloseParada(parada, 'BOTELLON10');
    const dSoda = getDesgloseParada(parada, 'SODA');

    setEspB20(formatearCantidadDiferenciada(dB20.recargas, dB20.nuevos));
    setEspB10(formatearCantidadDiferenciada(dB10.recargas, dB10.nuevos));
    setEspSoda(formatearCantidadDiferenciada(dSoda.recargas, dSoda.nuevos));
  }, [
    parada.estado,
    parada.bot20_entregado,
    parada.bot10_entregado,
    parada.soda_entregada,
    parada.observaciones,
    parada.bot20_esperado,
    parada.bot10_esperado,
    parada.soda_esperada,
    parada.pedido,
    parada._desglose
  ]);

  const guardarEsperado = async () => {
    if (estado !== 'PENDIENTE') return;

    const pB20 = parsearCantidadInput(espB20);
    const pB10 = parsearCantidadInput(espB10);
    const pSoda = parsearCantidadInput(espSoda);

    const prevB20 = getDesgloseParada(parada, 'BOTELLON20');
    const prevB10 = getDesgloseParada(parada, 'BOTELLON10');
    const prevSoda = getDesgloseParada(parada, 'SODA');

    const sinCambios =
      pB20.recargas === prevB20.recargas &&
      pB20.nuevos === prevB20.nuevos &&
      pB10.recargas === prevB10.recargas &&
      pB10.nuevos === prevB10.nuevos &&
      pSoda.recargas === prevSoda.recargas &&
      pSoda.nuevos === prevSoda.nuevos;
    if (sinCambios) return;

    // Actualización inmediata en memoria para que no se pierda durante drag o reordenamiento
    if (!parada._desglose) parada._desglose = {};
    parada._desglose.BOTELLON20 = { recargas: pB20.recargas, nuevos: pB20.nuevos, total: pB20.total };
    parada._desglose.BOTELLON10 = { recargas: pB10.recargas, nuevos: pB10.nuevos, total: pB10.total };
    parada._desglose.SODA = { recargas: pSoda.recargas, nuevos: pSoda.nuevos, total: pSoda.total };
    parada.bot20_esperado = pB20.total;
    parada.bot10_esperado = pB10.total;
    parada.soda_esperada = pSoda.total;

    setGuardandoEsperado(true);
    const payload = {
      bot20: { recargas: pB20.recargas, nuevos: pB20.nuevos },
      bot10: { recargas: pB10.recargas, nuevos: pB10.nuevos },
      soda: { recargas: pSoda.recargas, nuevos: pSoda.nuevos }
    };

    const res = await onActualizarEsperado(parada.id, payload);
    if (!res?.success) {
      parada._desglose.BOTELLON20 = { recargas: prevB20.recargas, nuevos: prevB20.nuevos, total: prevB20.totalEsperado };
      parada._desglose.BOTELLON10 = { recargas: prevB10.recargas, nuevos: prevB10.nuevos, total: prevB10.totalEsperado };
      parada._desglose.SODA = { recargas: prevSoda.recargas, nuevos: prevSoda.nuevos, total: prevSoda.totalEsperado };
      parada.bot20_esperado = prevB20.totalEsperado;
      parada.bot10_esperado = prevB10.totalEsperado;
      parada.soda_esperada = prevSoda.totalEsperado;
      setEspB20(formatearCantidadDiferenciada(prevB20.recargas, prevB20.nuevos));
      setEspB10(formatearCantidadDiferenciada(prevB10.recargas, prevB10.nuevos));
      setEspSoda(formatearCantidadDiferenciada(prevSoda.recargas, prevSoda.nuevos));
      setMensaje({ tipo: 'error', texto: res?.message || 'No se pudo actualizar lo esperado' });
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
        const pB20 = parsearCantidadInput(espB20);
        const pB10 = parsearCantidadInput(espB10);
        const pSoda = parsearCantidadInput(espSoda);
        setB20(formatearCantidadDiferenciada(pB20.recargas, pB20.nuevos));
        setB10(formatearCantidadDiferenciada(pB10.recargas, pB10.nuevos));
        setSoda(formatearCantidadDiferenciada(pSoda.recargas, pSoda.nuevos));
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
    const pB20 = parsearCantidadInput(b20);
    const pB10 = parsearCantidadInput(b10);
    const pSoda = parsearCantidadInput(soda);
    const res = await onActualizarParada(parada.id, {
      estado: 'ENTREGADO',
      cantidades: { bot20: pB20.total, bot10: pB10.total, soda: pSoda.total },
      observaciones: obs,
    });
    if (res?.success) { setMensaje({ tipo: 'ok', texto: 'Guardado' }); setConfirmado(true); }
    else { setMensaje({ tipo: 'error', texto: res?.message || 'Error' }); setEstado('PENDIENTE'); }
    setGuardando(false);
  };

  const confirmarFallido = async () => {
    setMensaje(null);
    if (!motivo.trim()) { setMensaje({ tipo: 'error', texto: 'Ingresa el motivo' }); return; }
    setGuardando(true);
    const fechaHora = new Date().toLocaleString('es-CL');
    const res = await onActualizarParada(parada.id, {
      estado: 'FALLIDO',
      observacion: `${motivo.trim()} \n[Registrado: ${fechaHora}]`,
    });
    if (res?.success) { setMensaje({ tipo: 'ok', texto: 'Registrado' }); setExpandido(false); setMotivo(''); }
    else setMensaje({ tipo: 'error', texto: res?.message || 'Error' });
    setGuardando(false);
  };

  const confirmarPostergado = async () => {
    setMensaje(null);
    if (!motivo.trim()) { setMensaje({ tipo: 'error', texto: 'Ingresa el motivo' }); return; }
    setGuardando(true);
    const fechaHora = new Date().toLocaleString('es-CL');
    const res = await onActualizarParada(parada.id, {
      estado: 'POSTERGADO',
      observacion: `${motivo.trim()} \n[Registrado: ${fechaHora}]`,
    });
    if (res?.success) { setMensaje({ tipo: 'ok', texto: 'Postergado' }); setExpandido(false); setMotivo(''); }
    else setMensaje({ tipo: 'error', texto: res?.message || 'Error' });
    setGuardando(false);
  };

  const esExpandible = estado === 'FALLIDO' || estado === 'POSTERGADO';
  const editable = estado === 'PENDIENTE' || (estado === 'ENTREGADO' && !confirmado);

  const colorExpandido = estado === 'POSTERGADO'
    ? { bg: 'bg-amber-50/60', border: 'border-amber-100', label: 'text-amber-800', ring: 'focus:ring-amber-400', borderInput: 'border-amber-200', btn: 'bg-amber-500 hover:bg-amber-600' }
    : { bg: 'bg-red-50/60', border: 'border-red-100', label: 'text-red-800', ring: 'focus:ring-red-400', borderInput: 'border-red-200', btn: 'bg-red-600 hover:bg-red-700' };

  const estadoBadge = {
    ENTREGADO:  { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'ENTREGADO' },
    FALLIDO:    { text: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     label: 'FALLIDO'   },
    POSTERGADO: { text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   label: 'POSTERGADO'   },
    PENDIENTE:  { text: 'text-slate-600',   bg: 'bg-slate-50',   border: 'border-slate-200',   label: 'PENDIENTE'     },
  }[estado] ?? { text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', label: 'PENDIENTE' };

  const columnasCantidad = [
    {
      key: 'b20',
      label: 'B.20',
      esperado: parada.bot20_esperado,
      val: estado === 'PENDIENTE' ? espB20 : b20,
      setEsp: setEspB20,
      setEnt: setB20,
    },
    {
      key: 'b10',
      label: 'B.10',
      esperado: parada.bot10_esperado,
      val: estado === 'PENDIENTE' ? espB10 : b10,
      setEsp: setEspB10,
      setEnt: setB10,
    },
    {
      key: 'soda',
      label: 'Soda',
      esperado: parada.soda_esperada,
      val: estado === 'PENDIENTE' ? espSoda : soda,
      setEsp: setEspSoda,
      setEnt: setSoda,
    },
  ];

  const rowStyleByEstado = {
    ENTREGADO: 'bg-emerald-50/90 hover:bg-emerald-100/90 border-l-4 border-l-emerald-500',
    FALLIDO: 'bg-rose-50/90 hover:bg-rose-100/90 border-l-4 border-l-rose-500',
    POSTERGADO: 'bg-amber-50/90 hover:bg-amber-100/90 border-l-4 border-l-amber-500',
    PENDIENTE: 'bg-white hover:bg-blue-50/40 border-l-4 border-l-blue-400',
  }[estado] || 'bg-white border-l-4 border-l-slate-300';

  return (
    <>
      <tr
        ref={setNodeRef}
        style={style}
        className={`border-b border-slate-200 group transition-all duration-300 ${
          isDragging ? 'bg-blue-100 shadow-xl relative z-50' : rowStyleByEstado
        }`}
      >
        <td {...attributes} {...listeners}
          onPointerDownCapture={() => {
            if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }}
          className="pl-2 pr-1 text-center cursor-grab active:cursor-grabbing w-8 align-middle shrink-0">
          <span className="text-[13px] leading-none text-slate-300 group-hover:text-blue-400 transition-colors">⋮⋮</span>
        </td>

        <td className="py-1.5 px-2 align-middle w-48">
          <p className="font-semibold text-slate-800 text-[11px] leading-tight">{parada.cliente?.nombre}</p>
        </td>

        <td className="py-1.5 px-2 align-middle w-32">
          <p className="text-[10px] text-slate-500 leading-tight whitespace-nowrap">
            {parada.cliente?.telefono ? `📞 ${parada.cliente.telefono}` : '—'}
          </p>
        </td>

        <td className="py-1.5 px-2 align-middle">
          <p className="text-[10px] text-slate-500 leading-tight truncate max-w-[260px]" title={parada.cliente?.direccion}>
            {parada.cliente?.direccion}
          </p>
        </td>

        {columnasCantidad.map(c => {
          const parsed = parsearCantidadInput(c.val);
          const tieneNuevos = parsed.nuevos > 0 || String(c.val).includes('+');
          const esCero = parsed.total === 0 && !String(c.val).includes('+');
          const tooltip = parsed.nuevos > 0
            ? `${c.label}: ${parsed.recargas} Recarga(s) + ${parsed.nuevos} Nuevo(s) (Total: ${parsed.total})`
            : `${c.label}: ${parsed.total} unidades`;

          return (
            <td key={c.key} className="py-1.5 px-1 align-middle w-16 text-center">
              <input
                type="text"
                disabled={!editable || guardandoEsperado}
                value={c.val}
                onChange={e => estado === 'PENDIENTE' ? c.setEsp(e.target.value) : c.setEnt(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                onBlur={estado === 'PENDIENTE' ? () => {
                  if (c.val === '') c.setEsp('0');
                  guardarEsperado();
                } : undefined}
                placeholder="0"
                title={tooltip}
                className={`w-14 h-7 mx-auto text-center rounded-lg text-xs font-black outline-none transition-all disabled:opacity-50 ${
                  tieneNuevos
                    ? 'bg-blue-50 border-2 border-[#013299] text-[#013299] shadow-xs'
                    : esCero
                    ? 'bg-slate-50 border border-slate-200 text-slate-400 focus:border-[#013299] focus:text-slate-800 focus:bg-white'
                    : 'bg-white border border-slate-300 text-slate-800 font-bold focus:border-[#013299] focus:ring-1 focus:ring-[#013299]/20'
                }`}
              />
            </td>
          );
        })}

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

        <td className="py-1.5 px-2 align-middle w-32">
          <select value={estado} onChange={e => manejarCambioEstado(e.target.value as EstadoParada)}
            className={`w-full text-[9px] font-extrabold px-1.5 py-1.5 rounded border cursor-pointer focus:outline-none focus:ring-1 tracking-wide transition-colors ${estadoBadge.bg} ${estadoBadge.text} ${estadoBadge.border} focus:ring-blue-200`}>
            <option value="PENDIENTE">PENDIENTE</option>
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

        <td className="py-1.5 px-1 align-middle w-10 text-center">
          <button
            type="button"
            onClick={() => onEliminarParada(parada.id, parada.cliente?.nombre)}
            title="Quitar pedido de la hoja de ruta"
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      </tr>

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
  sector, sparadas, paradas, onActualizarParada, onActualizarEsperado, onEliminarParada
}: { sector: string; sparadas: any[]; paradas: any[]; onActualizarParada: any; onActualizarEsperado: any; onEliminarParada: any }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `sector::${sector}` });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const itemsIds = useMemo(() => sparadas.map((p: any) => p.id), [sparadas]);

  return (
    <tbody ref={setNodeRef} style={style} className={isDragging ? 'relative z-40 shadow-lg' : ''}>
      <tr className="bg-slate-100 border-y border-slate-200">
        <td
          {...attributes} {...listeners}
          onPointerDownCapture={() => {
            if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }}
          className="pl-2 pr-1 w-8 text-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-blue-500"
        >
          ⋮⋮
        </td>
        <td colSpan={NUM_COLUMNAS - 1} className="px-2 py-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">
              📍 {sector}
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
            onEliminarParada={onEliminarParada}
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
    cantidades: any
  ) => Promise<{ success: boolean; message?: string }>;
  onEliminarRuta: (rutaDiaId: string) => void;
  onEliminarParada: (paradaId: string, nombreCliente?: string) => void;
}

export default function TablaSortable({ rutaId, ruta, paradas, onReorder, onActualizarParada, onActualizarEsperado, onEliminarRuta, onEliminarParada }: TablaSortableProps) {
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
    const d20 = getDesgloseParada(p, 'BOTELLON20');
    const d10 = getDesgloseParada(p, 'BOTELLON10');
    const dSoda = getDesgloseParada(p, 'SODA');

    if (p.estado === 'ENTREGADO') {
      const p20 = parsearCantidadInput(p.bot20_entregado);
      const p10 = parsearCantidadInput(p.bot10_entregado);
      const pSoda = parsearCantidadInput(p.soda_entregada);
      acc.b20_total += p20.total || p.bot20_entregado || 0;
      acc.b10_total += p10.total || p.bot10_entregado || 0;
      acc.soda_total += pSoda.total || p.soda_entregada || 0;
    } else if (p.estado === 'PENDIENTE' || !p.estado) {
      acc.b20_recargas += d20.recargas;
      acc.b20_nuevos += d20.nuevos;
      acc.b20_total += (p.bot20_esperado || d20.totalCalculado || 0);

      acc.b10_recargas += d10.recargas;
      acc.b10_nuevos += d10.nuevos;
      acc.b10_total += (p.bot10_esperado || d10.totalCalculado || 0);

      acc.soda_recargas += dSoda.recargas;
      acc.soda_nuevos += dSoda.nuevos;
      acc.soda_total += (p.soda_esperada || dSoda.totalCalculado || 0);
    }
    return acc;
  }, {
    b20_recargas: 0, b20_nuevos: 0, b20_total: 0,
    b10_recargas: 0, b10_nuevos: 0, b10_total: 0,
    soda_recargas: 0, soda_nuevos: 0, soda_total: 0,
  });

  const formatTotalCol = (rec: number, nue: number, tot: number) => {
    if (nue > 0) return `${rec}+${nue} (${tot})`;
    return String(tot);
  };

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
      PENDIENTE:  { label: '… Pendiente',  color: '#64748b' },
    };

    const cantidadesParada = (p: any) => {
      const d20 = getDesgloseParada(p, 'BOTELLON20');
      const d10 = getDesgloseParada(p, 'BOTELLON10');
      const dSoda = getDesgloseParada(p, 'SODA');

      const formatP = (d: any, entregado: any) => {
        if (p.estado === 'ENTREGADO') return entregado ?? '—';
        if (d.nuevos > 0) return `${d.recargas}+${d.nuevos}`;
        if (d.recargas > 0) return `${d.recargas}`;
        return '—';
      };

      return {
        b20: formatP(d20, p.bot20_entregado),
        b10: formatP(d10, p.bot10_entregado),
        soda: formatP(dSoda, p.soda_entregada),
      };
    };

    const observacionParada = (p: any) => {
      if (p.estado === 'FALLIDO') return p.motivo_fallo || p.observaciones || '—';
      if (p.estado === 'POSTERGADO') return p.motivo_postergacion || p.observaciones || '—';
      return p.observaciones || '—';
    };

    const filasSectores = Object.entries(porSector).map(([sector, sparadas]) => `
      <tr><td colspan="8" class="sector-row" style="padding-left:4px;">📍 ${sector} (${sparadas.length} parada${sparadas.length !== 1 ? 's' : ''})</td></tr>
      ${sparadas.map((p, i) => {
        const cant = cantidadesParada(p);
        const info = estadoInfo[p.estado] || estadoInfo.PENDIENTE;
        return `
        <tr>
          <td class="center gray">${i + 1}</td>
          <td><b>${p.cliente?.nombre || '—'}</b>${p.cliente?.telefono ? `<br><span class="gray">${p.cliente.telefono}</span>` : ''}</td>
          <td class="gray">${p.cliente?.direccion || '—'}</td>
          <td class="center font-bold">${cant.b20 || '—'}</td>
          <td class="center font-bold">${cant.b10 || '—'}</td>
          <td class="center font-bold">${cant.soda || '—'}</td>
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
            .header { background: #013299; color: white; padding: 8px 12px; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
            .header h2 { font-size: 13px; font-weight: bold; }
            .header p { font-size: 9px; color: #cbd5e1; margin-top: 2px; }
            .totales { font-size: 9px; text-align: right; }
            .totales b { font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; }
            th { background: #f1f5f9; color: #475569; font-size: 8px; text-transform: uppercase; padding: 4px 6px; border: 1px solid #cbd5e1; }
            td { padding: 4px 6px; border: 1px solid #e2e8f0; vertical-align: top; }
            .sector-row { background: #e2e8f0; font-weight: bold; font-size: 9px; color: #334155; }
            .center { text-align: center; }
            .left { text-align: left; }
            .font-bold { font-weight: bold; }
            .gray { color: #64748b; }
            .obs { font-style: italic; max-width: 140px; }
            tfoot td { background: #013299; color: white; font-weight: bold; border-color: #013299; padding: 6px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2>SODATAL — Hoja de Ruta [${ruta?.vehiculo?.patente || 'S/P'}]</h2>
              <p>Vehículo: ${ruta?.vehiculo?.marca || ''} ${ruta?.vehiculo?.modelo || ''} · Conductor: ${ruta?.usuario?.nombre || ''} ${ruta?.usuario?.apellido || ''}</p>
            </div>
            <div class="totales">
              B.20: <b>${formatTotalCol(totales.b20_recargas, totales.b20_nuevos, totales.b20_total)}</b> &nbsp;·&nbsp;
              B.10: <b>${formatTotalCol(totales.b10_recargas, totales.b10_nuevos, totales.b10_total)}</b> &nbsp;·&nbsp;
              Soda: <b>${formatTotalCol(totales.soda_recargas, totales.soda_nuevos, totales.soda_total)}</b> &nbsp;·&nbsp;
              Total Paradas: <b>${paradas.length}</b>
              <div style="font-size:7.5px; opacity:0.85; margin-top:2px;">(Formato: Recargas + Nuevos)</div>
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
                <td colspan="3" class="left">TOTAL ESPERADO DEL DÍA</td>
                <td class="center">${formatTotalCol(totales.b20_recargas, totales.b20_nuevos, totales.b20_total)}</td>
                <td class="center">${formatTotalCol(totales.b10_recargas, totales.b10_nuevos, totales.b10_total)}</td>
                <td class="center">${formatTotalCol(totales.soda_recargas, totales.soda_nuevos, totales.soda_total)}</td>
                <td colspan="2">${paradas.length} paradas planificadas</td>
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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-[#013299] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-bold text-xs">
            🚚 {ruta?.vehiculo?.marca} {ruta?.vehiculo?.modelo}
          </span>
          <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded font-mono font-bold tracking-wide">
            {ruta?.vehiculo?.patente}
          </span>
          <span className="text-blue-100 text-[11px] font-medium">
            {ruta?.usuario?.nombre} {ruta?.usuario?.apellido}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-blue-100 hidden sm:block font-medium">
            B.20: <b className="text-white">{formatTotalCol(totales.b20_recargas, totales.b20_nuevos, totales.b20_total)}</b>
            &nbsp;· B.10: <b className="text-white">{formatTotalCol(totales.b10_recargas, totales.b10_nuevos, totales.b10_total)}</b>
            &nbsp;· Soda: <b className="text-white">{formatTotalCol(totales.soda_recargas, totales.soda_nuevos, totales.soda_total)}</b>
            &nbsp;· <b className="text-white">{paradas.length}</b> paradas
          </span>
          <button onClick={handlePrint}
            className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl border border-white/20 transition-all flex items-center gap-1.5 shadow-xs">
            🖨️ Imprimir
          </button>
          <button onClick={() => onEliminarRuta(rutaId)}
            className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 text-[10px] font-bold px-2.5 py-1.5 rounded-xl border border-rose-400/30 transition-all flex items-center gap-1.5 shadow-xs">
            🗑️ Eliminar
          </button>
        </div>
      </div>

      {/* ── Tabla: columnas reales, con <colgroup> para fijar anchos consistentes ── */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse table-fixed min-w-[900px]">
            <colgroup>
              <col className="w-8" />
              <col className="w-48" />
              <col className="w-32" />
              <col />
              <col className="w-16" />
              <col className="w-16" />
              <col className="w-16" />
              <col className="w-56" />
              <col className="w-32" />
              <col className="w-10" />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[9px] font-black tracking-wider uppercase">
                <th className="py-2.5"></th>
                <th className="py-2.5 px-2 text-left overflow-hidden whitespace-nowrap">Nombre</th>
                <th className="py-2.5 px-2 text-left overflow-hidden whitespace-nowrap">Teléfono</th>
                <th className="py-2.5 px-2 text-left overflow-hidden whitespace-nowrap">Dirección</th>
                <th className="py-2.5 px-1 text-center text-[#013299] font-black overflow-hidden whitespace-nowrap" title="Botellón 20L (Recargas + Nuevos)">
                  B.20
                </th>
                <th className="py-2.5 px-1 text-center text-[#013299] font-black overflow-hidden whitespace-nowrap" title="Botellón 10L (Recargas + Nuevos)">
                  B.10
                </th>
                <th className="py-2.5 px-1 text-center text-[#013299] font-black overflow-hidden whitespace-nowrap" title="Sifón Soda (Recargas + Nuevos)">
                  Soda
                </th>
                <th className="py-2.5 px-2 text-left overflow-hidden whitespace-nowrap">Observaciones</th>
                <th className="py-2.5 px-2 text-center overflow-hidden whitespace-nowrap">Estado</th>
                <th className="py-2.5 px-1 text-center w-10 overflow-hidden whitespace-nowrap"></th>
              </tr>
            </thead>

            {paradas.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={NUM_COLUMNAS} className="text-center py-10 text-slate-400 font-medium text-xs bg-slate-50/50">
                    🚚 Esta hoja de ruta no tiene paradas asignadas todavía. Puedes agendar pedidos para este vehículo con el botón superior.
                  </td>
                </tr>
              </tbody>
            ) : (
              <SortableContext items={sectorIds} strategy={verticalListSortingStrategy}>
                {Object.entries(sectores).map(([sector, sparadas]) => (
                  <SectorGroup
                    key={sector}
                    sector={sector}
                    sparadas={sparadas}
                    paradas={paradas}
                    onActualizarParada={onActualizarParada}
                    onActualizarEsperado={onActualizarEsperado}
                    onEliminarParada={onEliminarParada}
                  />
                ))}
              </SortableContext>
            )}

            <tfoot>
              <tr className="bg-[#013299] text-white text-[9px] font-black">
                <td colSpan={NUM_COLUMNAS} className="p-2.5 pr-4">
                  <div className="flex items-center justify-end gap-6 flex-wrap">
                    <span className="uppercase tracking-wider text-blue-200">Total del día:</span>
                    <span>B.20: <b className="text-white">{formatTotalCol(totales.b20_recargas, totales.b20_nuevos, totales.b20_total)}</b></span>
                    <span>B.10: <b className="text-white">{formatTotalCol(totales.b10_recargas, totales.b10_nuevos, totales.b10_total)}</b></span>
                    <span>Soda: <b className="text-white">{formatTotalCol(totales.soda_recargas, totales.soda_nuevos, totales.soda_total)}</b></span>
                    <span className="text-blue-200">{paradas.length} paradas</span>
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