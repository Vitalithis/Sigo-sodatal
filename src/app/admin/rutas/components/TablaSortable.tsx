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
import { 
  MessageSquare, Trash2, RefreshCw, ChevronDown, ChevronRight, 
  Building2, MapPin, Truck, User, Printer 
} from 'lucide-react';
import ModalReasignarRuta from './ModalReasignarRuta';

type EstadoParada = 'PENDIENTE' | 'ENTREGADO' | 'FALLIDO' | 'POSTERGADO';

const NUM_COLUMNAS = 11; // drag | sector | nombre | telefono | direccion | b20 | b10 | soda | observaciones | estado | accion

const METODOS_PAGO_LABELS: Record<string, string> = {
  EFECTIVO: '💵 Efectivo',
  TARJETA: '💳 Tarjeta',
  TRANSFERENCIA: '📱 Transfer.',
  GUIA_MENSUAL: '📄 Guía/Créd.',
};

// comuna puede llegar en cliente?.sector?.comuna
export function getComunaNombre(p: any): string {
  const c = p?.cliente?.sector?.comuna;
  if (!c) return 'Sin Comuna';
  if (typeof c === 'string') return c;
  return c.nombre || 'Sin Comuna';
}

// sector puede llegar como string, objeto {nombre}, o null
export function getSectorNombre(p: any): string {
  const s = p?.cliente?.sector;
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
  const [editandoPago, setEditandoPago] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error', texto: string } | null>(null);
  const [metodoPago, setMetodoPago] = useState<string>(() => {
    return parada.pedido?.metodo_pago_web || (parada.cliente?.modalidad_pago === 'MENSUAL' ? 'GUIA_MENSUAL' : 'EFECTIVO');
  });

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
    setEditandoPago(false);
    setMetodoPago(parada.pedido?.metodo_pago_web || (parada.cliente?.modalidad_pago === 'MENSUAL' ? 'GUIA_MENSUAL' : 'EFECTIVO'));

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
        setEditandoPago(false);
        const pB20 = parsearCantidadInput(espB20);
        const pB10 = parsearCantidadInput(espB10);
        const pSoda = parsearCantidadInput(espSoda);
        setB20(formatearCantidadDiferenciada(pB20.recargas, pB20.nuevos));
        setB10(formatearCantidadDiferenciada(pB10.recargas, pB10.nuevos));
        setSoda(formatearCantidadDiferenciada(pSoda.recargas, pSoda.nuevos));
      }
      if (nuevoEstado === 'PENDIENTE') {
        setConfirmado(false);
        setEditandoPago(false);
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
      metodo_pago: metodoPago,
    });
    if (res?.success) { 
      setConfirmado(true);
      setEditandoPago(false);
      setMensaje({ tipo: 'ok', texto: 'Guardado' }); 
      setTimeout(() => setMensaje(null), 2000);
    }
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
    ENTREGADO: 'bg-emerald-50/30 hover:bg-emerald-50/60 border-l-4 border-l-emerald-500',
    FALLIDO: 'bg-rose-50/30 hover:bg-rose-50/60 border-l-4 border-l-rose-500',
    POSTERGADO: 'bg-amber-50/30 hover:bg-amber-50/60 border-l-4 border-l-amber-500',
    PENDIENTE: 'bg-white hover:bg-slate-50/80 border-l-4 border-l-blue-400',
  }[estado] || 'bg-white border-l-4 border-l-slate-300';

  return (
    <>
      <tr
        ref={setNodeRef}
        style={style}
        className={`border-b border-slate-100 group transition-all duration-200 ${
          isDragging ? 'bg-blue-50 shadow-xl relative z-50' : rowStyleByEstado
        }`}
      >
        <td {...attributes} {...listeners}
          onPointerDownCapture={() => {
            if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }}
          className="pl-2 pr-1 text-center cursor-grab active:cursor-grabbing w-8 align-middle shrink-0">
          <span className="text-[13px] leading-none text-slate-300 group-hover:text-[#013299] transition-colors">⋮⋮</span>
        </td>

        {/* Columna Sector: texto limpio a la izquierda */}
        <td className="py-2 px-2 align-middle w-24 overflow-hidden">
          <span 
            className="text-[10px] font-extrabold text-slate-500 uppercase tracking-tight block truncate" 
            title={`Sector: ${getSectorNombre(parada)}`}
          >
            {getSectorNombre(parada)}
          </span>
        </td>

        <td className="py-2 px-2 align-middle w-48">
          <p className="font-bold text-slate-900 text-xs leading-tight line-clamp-2 break-words" title={parada.cliente?.nombre}>
            {parada.cliente?.nombre}
          </p>
        </td>

        <td className="py-2 px-2 align-middle w-28 whitespace-nowrap">
          <p className="text-[11px] text-slate-500 font-medium">
            {parada.cliente?.telefono ? `📞 ${parada.cliente.telefono}` : '—'}
          </p>
        </td>

        <td className="py-2 px-2 align-middle w-56 min-w-[200px]">
          <p className="text-[11px] text-slate-600 leading-snug line-clamp-2 break-words font-medium" title={parada.cliente?.direccion}>
            {parada.cliente?.direccion || '—'}
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
            <td key={c.key} className="py-2 px-0.5 align-middle w-14 text-center">
              <input
                type="text"
                id={`cant_${c.key}_${parada.id}`}
                name={`cant_${c.key}_${parada.id}`}
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
                className={`w-12 h-7.5 mx-auto text-center rounded-xl text-xs font-black outline-none transition-all disabled:opacity-50 ${
                  tieneNuevos
                    ? 'bg-blue-50 border-2 border-[#013299] text-[#013299] shadow-xs'
                    : esCero
                    ? 'bg-slate-50/80 border border-slate-200 text-slate-400 focus:border-[#013299] focus:text-slate-800 focus:bg-white'
                    : 'bg-white border border-slate-300 text-slate-800 font-black focus:border-[#013299] focus:ring-2 focus:ring-[#013299]/20'
                }`}
              />
            </td>
          );
        })}

        <td className="py-2 px-2 align-middle w-36">
          {esExpandible && !expandido ? (
            <button onClick={() => setExpandido(true)}
              className={`text-[10px] font-bold flex items-center gap-1 hover:underline ${estado === 'POSTERGADO' ? 'text-amber-600' : 'text-rose-600'}`}>
              <MessageSquare className="w-3.5 h-3.5"/> Editar Motivo
            </button>
          ) : !esExpandible ? (
            <textarea
              id={`obs_${parada.id}`}
              name={`obs_${parada.id}`}
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
              className="w-full text-xs border border-slate-200 rounded-xl px-2 py-1 outline-none focus:border-[#013299] focus:ring-1 focus:ring-[#013299]/20 bg-white transition-colors resize-none overflow-hidden leading-tight placeholder:text-slate-400"
            />
          ) : <span className="text-slate-300 text-xs">—</span>}
        </td>

        <td className="py-2 px-2 align-middle w-32">
          <select
            id={`estado_${parada.id}`}
            name={`estado_${parada.id}`}
            value={estado}
            onChange={e => manejarCambioEstado(e.target.value as EstadoParada)}
            className={`w-full text-[10px] font-black px-2 py-1.5 rounded-xl border cursor-pointer focus:outline-none tracking-wide transition-colors ${estadoBadge.bg} ${estadoBadge.text} ${estadoBadge.border}`}
          >
            <option value="PENDIENTE">PENDIENTE</option>
            <option value="ENTREGADO">ENTREGADO</option>
            <option value="FALLIDO">FALLIDO</option>
            <option value="POSTERGADO">POSTERGADO</option>
          </select>

          {estado === 'ENTREGADO' && (
            confirmado && !editandoPago ? (
              /* Estado confirmado: Chip compacto de método de pago (altura idéntica a filas normales) */
              <button
                type="button"
                onClick={() => setEditandoPago(true)}
                title="Clic para cambiar método de pago"
                className="mt-1 w-full text-[9px] font-bold py-0.5 px-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 flex items-center justify-between transition-colors shadow-2xs group cursor-pointer"
              >
                <span className="truncate">{METODOS_PAGO_LABELS[metodoPago] || metodoPago}</span>
                <span className="text-[8px] text-emerald-600 opacity-60 group-hover:opacity-100 ml-0.5">✏️</span>
              </button>
            ) : (
              /* Seleccionando o editando método de pago */
              <div className="mt-1 space-y-1">
                <select
                  id={`pago_${parada.id}`}
                  name={`pago_${parada.id}`}
                  value={metodoPago}
                  onChange={async (e) => {
                    const nuevoMetodo = e.target.value;
                    setMetodoPago(nuevoMetodo);
                    if (confirmado) {
                      await onActualizarParada(parada.id, { estado: 'ENTREGADO', metodo_pago: nuevoMetodo });
                      setEditandoPago(false);
                    }
                  }}
                  title="Método de Pago"
                  className="w-full text-[10px] font-bold px-1.5 py-1 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none cursor-pointer"
                >
                  <option value="EFECTIVO">💵 Efectivo</option>
                  <option value="TARJETA">💳 Tarjeta</option>
                  <option value="TRANSFERENCIA">📱 Transfer.</option>
                  <option value="GUIA_MENSUAL">📄 Guía/Créd.</option>
                </select>
                {!confirmado ? (
                  <button onClick={confirmarEntrega} disabled={guardando}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white text-[10px] font-bold py-1 rounded-lg shadow-xs uppercase tracking-wider transition-colors cursor-pointer">
                    {guardando ? '…' : 'Confirmar'}
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => setEditandoPago(false)}
                    className="w-full text-[9px] font-bold text-slate-500 hover:text-slate-700 py-0.5 rounded cursor-pointer text-center"
                  >
                    Cerrar
                  </button>
                )}
              </div>
            )
          )}

          {mensaje && !esExpandible && (
            <div className={`mt-0.5 text-[9px] font-bold text-center ${mensaje.tipo === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {mensaje.texto}
            </div>
          )}
        </td>

        <td className="py-2 px-1 align-middle w-10 text-center">
          <button
            type="button"
            onClick={() => onEliminarParada(parada.id, parada.cliente?.nombre)}
            title="Quitar pedido de la hoja de ruta"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
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
                <textarea
                  id={`motivo_${parada.id}`}
                  name={`motivo_${parada.id}`}
                  value={motivo}
                  onChange={e => { setMotivo(e.target.value); setMensaje(null); }}
                  className={`w-full text-xs p-2 border ${colorExpandido.borderInput} rounded mt-1 outline-none focus:ring-1 ${colorExpandido.ring} bg-white`}
                  rows={2}
                  placeholder={estado === 'POSTERGADO' ? 'Ej: Cliente pidió para la próxima semana...' : 'Ej: Local cerrado, no contestó el teléfono...'}
                />
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

// --- COMPONENTE PRINCIPAL ---
interface TablaSortableProps {
  rutaId: string;
  ruta: any;
  paradas: any[];
  todasLasRutas?: any[];
  choferes?: any[];
  vehiculos?: any[];
  onReorder: (rutaId: string, nuevasParadas: any[]) => void;
  onActualizarParada: (paradaId: string, datos: any) => Promise<{ success: boolean; message?: string }>;
  onActualizarEsperado: (
    paradaId: string,
    cantidades: any
  ) => Promise<{ success: boolean; message?: string }>;
  onEliminarRuta: (rutaDiaId: string) => void;
  onEliminarParada: (paradaId: string, nombreCliente?: string) => void;
  onRutaActualizada?: () => void;
}

export default function TablaSortable({ 
  rutaId, 
  ruta, 
  paradas, 
  todasLasRutas = [], 
  choferes = [], 
  vehiculos = [], 
  onReorder, 
  onActualizarParada, 
  onActualizarEsperado, 
  onEliminarRuta, 
  onEliminarParada,
  onRutaActualizada 
}: TablaSortableProps) {
  const [modalReasignarAbierto, setModalReasignarAbierto] = useState(false);
  const [comunasColapsadas, setComunasColapsadas] = useState<Record<string, boolean>>({});

  // Agrupación jerárquica: Comuna -> Paradas (Sector como columna izquierda)
  const estructuraComunas = useMemo(() => {
    const map: Record<string, {
      paradas: any[];
      sectoresSet: Set<string>;
    }> = {};

    paradas.forEach(p => {
      const comuna = getComunaNombre(p);
      const sector = getSectorNombre(p);
      if (!map[comuna]) {
        map[comuna] = { paradas: [], sectoresSet: new Set() };
      }
      map[comuna].paradas.push(p);
      map[comuna].sectoresSet.add(sector);
    });

    return Object.entries(map).map(([comunaNombre, data]) => {
      let comunaB20 = 0;
      let comunaB10 = 0;
      let comunaSoda = 0;

      data.paradas.forEach(p => {
        if (p.estado === 'ENTREGADO') {
          const p20 = parsearCantidadInput(p.bot20_entregado);
          const p10 = parsearCantidadInput(p.bot10_entregado);
          const pSoda = parsearCantidadInput(p.soda_entregada);
          comunaB20 += p20.total || p.bot20_entregado || 0;
          comunaB10 += p10.total || p.bot10_entregado || 0;
          comunaSoda += pSoda.total || p.soda_entregada || 0;
        } else {
          const d20 = getDesgloseParada(p, 'BOTELLON20');
          const d10 = getDesgloseParada(p, 'BOTELLON10');
          const dSoda = getDesgloseParada(p, 'SODA');
          comunaB20 += (p.bot20_esperado || d20.totalCalculado || 0);
          comunaB10 += (p.bot10_esperado || d10.totalCalculado || 0);
          comunaSoda += (p.soda_esperada || dSoda.totalCalculado || 0);
        }
      });

      return {
        comunaNombre,
        paradas: data.paradas,
        sectoresCount: data.sectoresSet.size,
        totalParadas: data.paradas.length,
        totales: { b20: comunaB20, b10: comunaB10, soda: comunaSoda }
      };
    });
  }, [paradas]);

  const paradaIds = useMemo(() => paradas.map(p => p.id), [paradas]);

  const toggleComuna = (comuna: string) => {
    setComunasColapsadas(prev => ({ ...prev, [comuna]: !prev[comuna] }));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = paradas.findIndex(p => p.id === active.id);
    const newIndex = paradas.findIndex(p => p.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(rutaId, arrayMove(paradas, oldIndex, newIndex));
    }
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

    const porComuna: Record<string, any[]> = {};
    paradas.forEach(p => {
      const c = getComunaNombre(p);
      if (!porComuna[c]) porComuna[c] = [];
      porComuna[c].push(p);
    });

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
      if (p.estado === 'FALLIDO') return p.motivo_fallo || p.observaciones || '';
      if (p.estado === 'POSTERGADO') return p.motivo_postergacion || p.observaciones || '';
      return p.observaciones || '';
    };

    const fechaHoy = new Date().toLocaleDateString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    const filasAgrupadas = Object.entries(porComuna).map(([comuna, sparadas]) => `
      <tr>
        <td colspan="10" class="comuna-row">
          COMUNA: ${comuna.toUpperCase()} &nbsp;(${sparadas.length} ${sparadas.length === 1 ? 'parada' : 'paradas'})
        </td>
      </tr>
      ${sparadas.map((p, i) => {
        const cant = cantidadesParada(p);
        const obs = observacionParada(p);
        return `
        <tr>
          <td class="center font-mono gray">${i + 1}</td>
          <td class="sector-cell">${getSectorNombre(p)}</td>
          <td class="cli-name">${p.cliente?.nombre || '—'}</td>
          <td class="center tel-cell">${p.cliente?.telefono || '—'}</td>
          <td class="dir-cell">${p.cliente?.direccion || '—'}</td>
          <td class="center cant-cell ${cant.b20 === '—' ? 'empty' : ''}">${cant.b20}</td>
          <td class="center cant-cell ${cant.b10 === '—' ? 'empty' : ''}">${cant.b10}</td>
          <td class="center cant-cell ${cant.soda === '—' ? 'empty' : ''}">${cant.soda}</td>
          <td class="obs-cell">${obs || ''}</td>
          <td class="center chk-cell">□</td>
        </tr>
      `;
      }).join('')}
    `).join('');

    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Ruta ${ruta?.vehiculo?.patente || ''} — ${ruta?.usuario?.nombre || ''}</title>
          <style>
            @page {
              size: portrait;
              margin: 10mm;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              width: 100%;
              max-width: 100%;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              font-size: 8px;
              line-height: 1.15;
              color: #0f172a;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header-bar {
              border-bottom: 2px solid #013299;
              padding-bottom: 4px;
              margin-bottom: 5px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              gap: 8px;
              width: 100%;
            }
            .brand-title {
              font-size: 12px;
              font-weight: 900;
              color: #013299;
              letter-spacing: -0.2px;
            }
            .brand-sub {
              font-size: 9px;
              font-weight: 700;
              color: #475569;
              margin-left: 4px;
            }
            .meta-info {
              font-size: 7.5px;
              color: #334155;
              margin-top: 2px;
              display: flex;
              gap: 8px;
              flex-wrap: wrap;
            }
            .meta-info b { color: #0f172a; }
            .summary-box {
              display: flex;
              align-items: center;
              gap: 3px;
              font-size: 7.5px;
            }
            .pill {
              border: 1px solid #cbd5e1;
              background: #f8fafc;
              padding: 2px 4px;
              border-radius: 4px;
              white-space: nowrap;
            }
            .pill.highlight {
              border-color: #93c5fd;
              background: #eff6ff;
              color: #013299;
              font-weight: 800;
            }
            table {
              width: 100%;
              max-width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            col.num { width: 20px; }
            col.sector { width: 62px; }
            col.cliente { width: 120px; }
            col.telefono { width: 65px; }
            col.direccion { width: auto; }
            col.cant { width: 26px; }
            col.obs { width: 80px; }
            col.chk { width: 20px; }

            th {
              background: #f1f5f9;
              color: #475569;
              font-size: 7px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.2px;
              padding: 3px 2px;
              border: 1px solid #cbd5e1;
              text-align: left;
            }
            th.center, td.center { text-align: center; }
            td {
              padding: 2.5px 3px;
              border: 1px solid #e2e8f0;
              vertical-align: middle;
              font-size: 7.5px;
              word-wrap: break-word;
            }
            .comuna-row {
              background: #e2e8f0;
              color: #0f172a;
              font-weight: 800;
              font-size: 7.5px;
              letter-spacing: 0.3px;
              padding: 2px 4px;
              border: 1px solid #cbd5e1;
              text-transform: uppercase;
            }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 7.5px; }
            .gray { color: #64748b; }
            .sector-cell {
              font-weight: 800;
              font-size: 7px;
              text-transform: uppercase;
              color: #334155;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .cli-name {
              font-weight: 700;
              color: #0f172a;
              font-size: 7.5px;
              line-height: 1.15;
            }
            .tel-cell {
              font-size: 7.5px;
              color: #334155;
              font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
              white-space: nowrap;
              letter-spacing: -0.2px;
            }
            .dir-cell {
              color: #1e293b;
              font-size: 7.5px;
              line-height: 1.15;
            }
            .cant-cell {
              font-weight: 800;
              font-size: 8.5px;
              color: #0f172a;
            }
            .cant-cell.empty {
              color: #cbd5e1;
              font-weight: normal;
            }
            .obs-cell {
              font-size: 7px;
              color: #475569;
              font-style: italic;
              line-height: 1.1;
            }
            .chk-cell {
              font-size: 10px;
              color: #94a3b8;
              line-height: 1;
              user-select: none;
            }
            tfoot td {
              background: #f8fafc;
              font-weight: 800;
              border-top: 1.5px solid #013299;
              border-bottom: 1.5px solid #013299;
              color: #0f172a;
              padding: 3px 4px;
              font-size: 7.5px;
            }
            @media print {
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
              tr { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div>
              <div>
                <span class="brand-title">SODATAL</span>
                <span class="brand-sub">· Hoja de Ruta [${ruta?.vehiculo?.patente || 'S/P'}]</span>
              </div>
              <div class="meta-info">
                <span><b>Vehículo:</b> ${ruta?.vehiculo?.marca || ''} ${ruta?.vehiculo?.modelo || ''}</span>
                <span><b>Conductor:</b> ${ruta?.usuario?.nombre || ''} ${ruta?.usuario?.apellido || ''}</span>
                <span><b>Fecha:</b> ${fechaHoy}</span>
              </div>
            </div>
            <div class="summary-box">
              <span class="pill">B.20: <b>${formatTotalCol(totales.b20_recargas, totales.b20_nuevos, totales.b20_total)}</b></span>
              <span class="pill">B.10: <b>${formatTotalCol(totales.b10_recargas, totales.b10_nuevos, totales.b10_total)}</b></span>
              <span class="pill">Soda: <b>${formatTotalCol(totales.soda_recargas, totales.soda_nuevos, totales.soda_total)}</b></span>
              <span class="pill highlight"><b>${paradas.length} paradas</b></span>
            </div>
          </div>

          <table>
            <colgroup>
              <col class="num" />
              <col class="sector" />
              <col class="cliente" />
              <col class="telefono" />
              <col class="direccion" />
              <col class="cant" />
              <col class="cant" />
              <col class="cant" />
              <col class="obs" />
              <col class="chk" />
            </colgroup>
            <thead>
              <tr>
                <th class="center">#</th>
                <th>Sector</th>
                <th>Cliente</th>
                <th class="center">Teléfono</th>
                <th>Dirección</th>
                <th class="center" title="Botellón 20L">B.20</th>
                <th class="center" title="Botellón 10L">B.10</th>
                <th class="center" title="Sifón Soda">Soda</th>
                <th>Observaciones / Pago</th>
                <th class="center" title="Entregado">✓</th>
              </tr>
            </thead>
            <tbody>${filasAgrupadas}</tbody>
            <tfoot>
              <tr>
                <td colspan="5" style="font-weight:800; text-transform:uppercase; font-size:7px; letter-spacing:0.3px; color:#475569;">
                  TOTAL ESPERADO DE LA RUTA
                </td>
                <td class="center font-bold">${formatTotalCol(totales.b20_recargas, totales.b20_nuevos, totales.b20_total)}</td>
                <td class="center font-bold">${formatTotalCol(totales.b10_recargas, totales.b10_nuevos, totales.b10_total)}</td>
                <td class="center font-bold">${formatTotalCol(totales.soda_recargas, totales.soda_nuevos, totales.soda_total)}</td>
                <td colspan="2" class="center font-bold" style="color:#013299;">${paradas.length} paradas planificadas</td>
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

      {/* ── Header de Ruta ── */}
      <div className="bg-slate-50/90 px-4 sm:px-5 py-3.5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="bg-[#013299] text-white text-[11px] font-black px-2.5 py-1 rounded-lg tracking-wider uppercase flex items-center gap-1.5 shadow-2xs">
            <Truck className="w-3.5 h-3.5" />
            <span>{ruta?.vehiculo?.marca} {ruta?.vehiculo?.modelo}</span>
          </span>
          <span className="bg-slate-200/80 text-slate-800 text-[11px] px-2 py-0.5 rounded-md font-mono font-bold tracking-wider">
            [{ruta?.vehiculo?.patente}]
          </span>
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1 ml-1">
            <User className="w-3.5 h-3.5 text-[#013299]" />
            <span>{ruta?.usuario?.nombre} {ruta?.usuario?.apellido}</span>
          </span>
          <span className="bg-blue-50 text-[#013299] border border-blue-100 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
            {paradas.length} {paradas.length === 1 ? 'parada' : 'paradas'}
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="text-xs text-slate-500 hidden sm:flex items-center gap-2 font-medium mr-2">
            <span>B.20: <b className="text-slate-900 font-bold">{formatTotalCol(totales.b20_recargas, totales.b20_nuevos, totales.b20_total)}</b></span>
            <span className="text-slate-300">·</span>
            <span>B.10: <b className="text-slate-900 font-bold">{formatTotalCol(totales.b10_recargas, totales.b10_nuevos, totales.b10_total)}</b></span>
            <span className="text-slate-300">·</span>
            <span>Soda: <b className="text-slate-900 font-bold">{formatTotalCol(totales.soda_recargas, totales.soda_nuevos, totales.soda_total)}</b></span>
          </div>
          <button 
            type="button"
            onClick={() => setModalReasignarAbierto(true)}
            title="Cambiar conductor o vehículo de esta ruta hoy"
            className="bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#013299]" />
            <span>Reasignar</span>
          </button>
          <button 
            type="button"
            onClick={handlePrint}
            className="bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Imprimir</span>
          </button>
          <button 
            type="button"
            onClick={() => onEliminarRuta(rutaId)}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-rose-200 transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Eliminar</span>
          </button>
        </div>
      </div>

      {/* ── Tabla: columnas reales, con <colgroup> para fijar anchos consistentes ── */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse table-fixed min-w-[1150px]">
            <colgroup>
              <col className="w-8" />
              <col className="w-24" />
              <col className="w-48" />
              <col className="w-28" />
              <col className="w-56 min-w-[200px]" />
              <col className="w-14" />
              <col className="w-14" />
              <col className="w-14" />
              <col className="w-36" />
              <col className="w-32" />
              <col className="w-10" />
            </colgroup>
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-[10px] font-bold tracking-wider uppercase">
                <th className="py-2.5 px-1 text-center w-8"></th>
                <th className="py-2.5 px-2 text-left w-24">Sector</th>
                <th className="py-2.5 px-2 text-left w-48">Cliente</th>
                <th className="py-2.5 px-2 text-left w-28">Teléfono</th>
                <th className="py-2.5 px-2 text-left w-56 min-w-[200px]">Dirección</th>
                <th className="py-2.5 px-1 text-center w-14 text-[#013299] font-black" title="Botellón 20L (Recargas + Nuevos)">
                  B.20
                </th>
                <th className="py-2.5 px-1 text-center w-14 text-[#013299] font-black" title="Botellón 10L (Recargas + Nuevos)">
                  B.10
                </th>
                <th className="py-2.5 px-1 text-center w-14 text-[#013299] font-black" title="Sifón Soda (Recargas + Nuevos)">
                  Soda
                </th>
                <th className="py-2.5 px-2 text-left w-36">Observaciones</th>
                <th className="py-2.5 px-2 text-center w-32">Estado</th>
                <th className="py-2.5 px-1 text-center w-10"></th>
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
              <SortableContext items={paradaIds} strategy={verticalListSortingStrategy}>
                {estructuraComunas.map(comuna => {
                  const isComunaColapsada = !!comunasColapsadas[comuna.comunaNombre];

                  return (
                    <tbody key={comuna.comunaNombre}>
                      {/* Cabecera de Comuna */}
                      <tr 
                        className="bg-slate-100/80 hover:bg-slate-200/70 border-y border-slate-200/90 text-slate-800 cursor-pointer select-none transition-colors"
                        onClick={() => toggleComuna(comuna.comunaNombre)}
                        title={isComunaColapsada ? `Expandir comuna ${comuna.comunaNombre}` : `Colapsar comuna ${comuna.comunaNombre}`}
                      >
                        <td className="w-8 text-center py-2.5 text-slate-400">
                          {isComunaColapsada ? (
                            <ChevronRight className="w-4 h-4 mx-auto text-[#013299]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 mx-auto text-[#013299]" />
                          )}
                        </td>
                        <td colSpan={NUM_COLUMNAS - 1} className="px-3 py-2.5">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2.5">
                              <Building2 className="w-4 h-4 text-[#013299]" />
                              <span className="font-black text-xs uppercase tracking-wider text-slate-900">
                                {comuna.comunaNombre}
                              </span>
                              <span className="bg-white text-slate-600 border border-slate-200 text-[10px] px-2 py-0.5 rounded-full font-bold shadow-2xs">
                                {comuna.totalParadas} {comuna.totalParadas === 1 ? 'parada' : 'paradas'} · {comuna.sectoresCount} {comuna.sectoresCount === 1 ? 'sector' : 'sectores'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                              <span>B.20: <b className="text-slate-900 font-bold">{comuna.totales.b20}</b></span>
                              <span className="text-slate-300">·</span>
                              <span>B.10: <b className="text-slate-900 font-bold">{comuna.totales.b10}</b></span>
                              <span className="text-slate-300">·</span>
                              <span>Soda: <b className="text-slate-900 font-bold">{comuna.totales.soda}</b></span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Paradas de esta comuna (Sector en columna izquierda, sin filas intermedias) */}
                      {!isComunaColapsada && comuna.paradas.map(parada => (
                        <SortableRow
                          key={parada.id}
                          parada={parada}
                          index={paradas.indexOf(parada)}
                          onActualizarParada={onActualizarParada}
                          onActualizarEsperado={onActualizarEsperado}
                          onEliminarParada={onEliminarParada}
                        />
                      ))}
                    </tbody>
                  );
                })}
              </SortableContext>
            )}

            <tfoot>
              <tr className="bg-slate-50/90 border-t border-slate-200 text-slate-700 text-xs font-bold">
                <td colSpan={NUM_COLUMNAS} className="p-3 pr-4">
                  <div className="flex items-center justify-end gap-5 flex-wrap">
                    <span className="uppercase tracking-wider text-[10px] font-black text-slate-400">Total del día:</span>
                    <span>B.20: <b className="text-slate-900 font-black">{formatTotalCol(totales.b20_recargas, totales.b20_nuevos, totales.b20_total)}</b></span>
                    <span className="text-slate-300">·</span>
                    <span>B.10: <b className="text-slate-900 font-black">{formatTotalCol(totales.b10_recargas, totales.b10_nuevos, totales.b10_total)}</b></span>
                    <span className="text-slate-300">·</span>
                    <span>Soda: <b className="text-slate-900 font-black">{formatTotalCol(totales.soda_recargas, totales.soda_nuevos, totales.soda_total)}</b></span>
                    <span className="bg-blue-50 text-[#013299] border border-blue-100 px-2.5 py-0.5 rounded-full text-[11px] font-bold ml-1">
                      {paradas.length} {paradas.length === 1 ? 'parada' : 'paradas'}
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </DndContext>

      {/* Modal para reasignar chofer o camión de la jornada */}
      <ModalReasignarRuta
        isOpen={modalReasignarAbierto}
        onClose={() => setModalReasignarAbierto(false)}
        ruta={ruta}
        todasLasRutas={todasLasRutas}
        choferes={choferes}
        vehiculos={vehiculos}
        onSuccess={() => {
          if (onRutaActualizada) onRutaActualizada();
        }}
      />
    </div>
  );
}