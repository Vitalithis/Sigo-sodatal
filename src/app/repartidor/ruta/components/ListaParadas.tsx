"use client";

import { useState } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { actualizarOrdenParadasAction } from '@/app/admin/rutas/actions';
import ModalEntrega from './ModalEntrega';
import ModalIncidencia from './ModalIncidencia';
import { Phone, MapPin, AlertTriangle, CheckCircle2, GripVertical, Check, ShieldAlert, Package, FileText } from 'lucide-react';

function ParadaItem({ 
  parada, 
  index, 
  onAbrirEntrega, 
  onAbrirIncidencia 
}: { 
  parada: any; 
  index: number; 
  onAbrirEntrega: () => void; 
  onAbrirIncidencia: () => void; 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: parada.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.9 : 1,
  };

  const incidenciasPendientes = parada.cliente.incidencias || [];
  const tieneDeuda = (parada.cliente.deuda || 0) > 0;
  const esEntregado = parada.estado === 'ENTREGADO';
  const esPostergado = parada.estado === 'POSTERGADO';

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`bg-white border rounded-2xl p-3.5 mb-3 shadow-sm flex flex-col gap-3 transition-all ${
        isDragging ? 'shadow-xl border-[#013299] ring-2 ring-[#013299]/20' : 
        esEntregado ? 'border-emerald-200 bg-emerald-50/20' :
        esPostergado ? 'border-rose-200 bg-rose-50/20' :
        'border-slate-200'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Grabber para reordenar la secuencia */}
        <div 
          {...attributes} 
          {...listeners}
          className="touch-none flex items-center justify-center p-2 bg-slate-100 text-slate-400 rounded-xl cursor-grab active:cursor-grabbing hover:bg-slate-200 shrink-0 self-center"
          title="Arrastrar para cambiar posición"
        >
          <GripVertical className="w-5 h-5" />
        </div>
        
        {/* Información del cliente y número de parada */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-[#013299] text-white text-xs font-black px-2 py-0.5 rounded-lg shrink-0">
              #{index + 1}
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm truncate">{parada.cliente.nombre}</h3>
          </div>

          <p className="text-xs text-slate-600 mt-1 font-medium leading-snug">{parada.cliente.direccion}</p>

          {/* Badges de Estado y Deuda */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              parada.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
              parada.estado === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
              'bg-rose-100 text-rose-900 border border-rose-200'
            }`}>
              {parada.estado === 'PENDIENTE' ? '⏳ Pendiente' : parada.estado === 'ENTREGADO' ? '✅ Entregado' : '⚠️ Postergado'}
            </span>

            {tieneDeuda && (
              <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-600" /> Deuda: ${Number(parada.cliente.deuda).toLocaleString('es-CL')}
              </span>
            )}

            {parada.cliente.botellones_prestados > 0 && (
              <span className="bg-blue-50 text-[#013299] border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                {parada.cliente.botellones_prestados} envases prestados
              </span>
            )}

            {(parada.pedido?.guia?.numero_correlativo || parada.guia_correlativo) && (
              <span className="bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1">
                <FileText className="w-3 h-3 text-purple-700" /> Guía #{parada.pedido?.guia?.numero_correlativo || parada.guia_correlativo}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Ítem del Pedido / Cantidad a Entregar */}
      {parada.pedido && (
        <div className="bg-blue-50/70 border border-blue-100 p-2.5 rounded-xl flex items-center justify-between text-xs">
          <span className="font-bold text-[#013299] flex items-center gap-1.5">
            <Package className="w-4 h-4" /> Pedido:
          </span>
          <div className="flex flex-wrap gap-1 font-semibold text-slate-800">
            {parada.pedido.items?.map((it: any) => (
              <span key={it.id} className="bg-white px-2 py-0.5 rounded border border-blue-200 text-xs font-black text-slate-900">
                {it.producto.nombre} x{it.cantidad}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Botones táctiles optimizados para celular */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100">
        
        {/* Botón de Teléfono directo */}
        <a 
          href={`tel:${parada.cliente.telefono}`}
          className="flex items-center justify-center gap-1.5 bg-slate-100 active:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-xl border border-slate-200 transition-colors"
        >
          <Phone className="w-4 h-4 text-emerald-600" /> Llamar
        </a>

        {/* Botón de Mapa GPS */}
        <a 
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parada.cliente.direccion)}`}
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 bg-blue-50 active:bg-blue-100 text-[#013299] text-xs font-bold py-2.5 rounded-xl border border-blue-200 transition-colors"
        >
          <MapPin className="w-4 h-4 text-[#013299]" /> GPS
        </a>

        {/* Botón Reportar Problema / Incidencia */}
        <button 
          onClick={onAbrirIncidencia}
          className="flex items-center justify-center gap-1.5 bg-rose-50 active:bg-rose-100 text-rose-700 text-xs font-bold py-2.5 rounded-xl border border-rose-200 transition-colors"
        >
          <AlertTriangle className="w-4 h-4 text-rose-600" /> Problema
        </button>

        {/* Botón Confirmar Entrega (Verde destacado) */}
        <button 
          onClick={onAbrirEntrega}
          className={`flex items-center justify-center gap-1.5 text-xs font-black py-2.5 rounded-xl shadow-sm transition-all active:scale-[0.98] ${
            esEntregado
              ? 'bg-slate-800 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" /> {esEntregado ? 'Revisar' : 'Entregar'}
        </button>

      </div>

      {/* Banner de Incidencias Previas Pendientes */}
      {incidenciasPendientes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs">
          <p className="font-bold text-amber-900 flex items-center gap-1 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Nota antes de entregar:
          </p>
          <ul className="text-amber-800 space-y-0.5 ml-2 list-disc list-inside font-medium">
            {incidenciasPendientes.map((inc: any) => (
              <li key={inc.id}>
                {inc.tipo === 'PRESTAMO_BOTELLON' 
                  ? `Debe ${parada.cliente.botellones_prestados} envases prestados.`
                  : inc.tipo === 'NO_ESTABA' 
                  ? 'La última vez no estaba, confirmar presencia.'
                  : `Incidencia: ${inc.tipo.replace('_', ' ')}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ListaParadas({ paradasIniciales, usuarioId }: { paradasIniciales: any[], usuarioId: string }) {
  const [paradas, setParadas] = useState(paradasIniciales);
  const [guardando, setGuardando] = useState(false);
  
  // Estado para los modales
  const [paradaSeleccionada, setParadaSeleccionada] = useState<any>(null);
  const [modalAbierto, setModalAbierto] = useState<'ENTREGA' | 'INCIDENCIA' | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setParadas((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        const nuevoArreglo = arrayMove(items, oldIndex, newIndex);
        guardarNuevoOrden(nuevoArreglo);
        return nuevoArreglo;
      });
    }
  }

  async function guardarNuevoOrden(nuevoArreglo: any[]) {
    setGuardando(true);
    const payload = nuevoArreglo.map((p, index) => ({
      id: p.id,
      orden_nuevo: index + 1
    }));
    await actualizarOrdenParadasAction(payload);
    setGuardando(false);
  }

  function manejarExitoAccion(paradaId: string, nuevoEstado: 'ENTREGADO' | 'POSTERGADO' | 'PENDIENTE') {
    setParadas(current => current.map(p => 
      p.id === paradaId ? { ...p, estado: nuevoEstado } : p
    ));
    setModalAbierto(null);
  }

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
          Secuencia de Paradas ({paradas.length})
        </h2>
        {guardando && <span className="text-xs text-[#013299] font-bold animate-pulse">Guardando orden...</span>}
      </div>
      
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={paradas.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {paradas.map((parada, idx) => (
            <ParadaItem 
              key={parada.id} 
              parada={parada} 
              index={idx}
              onAbrirEntrega={() => { setParadaSeleccionada(parada); setModalAbierto('ENTREGA'); }}
              onAbrirIncidencia={() => { setParadaSeleccionada(parada); setModalAbierto('INCIDENCIA'); }}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Modales de Entrega e Incidencia */}
      {modalAbierto === 'ENTREGA' && paradaSeleccionada && (
        <ModalEntrega 
          parada={paradaSeleccionada} 
          usuarioId={usuarioId}
          onClose={() => setModalAbierto(null)}
          onAbrirIncidencia={() => setModalAbierto('INCIDENCIA')}
          onSuccess={(cantidades, guiaInfo) => {
            setParadas(current => current.map(p => 
              p.id === paradaSeleccionada.id ? { 
                ...p, 
                estado: 'ENTREGADO',
                bot20_entregado: cantidades.bot20,
                bot10_entregado: cantidades.bot10,
                soda_entregada: cantidades.soda,
                guia_correlativo: guiaInfo?.numero_correlativo || p.guia_correlativo,
              } : p
            ));
            setModalAbierto(null);
          }}
        />
      )}

      {modalAbierto === 'INCIDENCIA' && paradaSeleccionada && (
        <ModalIncidencia 
          parada={paradaSeleccionada}
          usuarioId={usuarioId}
          onClose={() => setModalAbierto(null)}
          onSuccess={() => manejarExitoAccion(paradaSeleccionada.id, 'POSTERGADO')}
        />
      )}
    </div>
  );
}
