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

// Modifica la interfaz de ParadaItem para recibir las funciones de apertura de modales
function ParadaItem({ parada, onAbrirEntrega, onAbrirIncidencia }: { parada: any, onAbrirEntrega: () => void, onAbrirIncidencia: () => void }) {
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

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`bg-white border rounded-xl p-3 mb-3 shadow-sm flex flex-col gap-2 ${isDragging ? 'shadow-lg border-blue-400' : 'border-gray-200'}`}
    >
      <div className="flex gap-3">
        <div 
          {...attributes} 
          {...listeners}
          className="touch-none flex items-center justify-center p-2 bg-gray-50 rounded-lg cursor-grab active:cursor-grabbing text-gray-400 hover:bg-gray-100"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="5" r="1" />
            <circle cx="9" cy="12" r="1" />
            <circle cx="9" cy="19" r="1" />
            <circle cx="15" cy="5" r="1" />
            <circle cx="15" cy="12" r="1" />
            <circle cx="15" cy="19" r="1" />
          </svg>
        </div>
        
        <div className="flex-1 min-w-0 py-1">
          <h3 className="font-bold text-gray-900 truncate">{parada.cliente.nombre}</h3>
          <p className="text-xs text-gray-500 truncate mt-0.5">{parada.cliente.direccion}</p>
          
          <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] font-medium tracking-wide uppercase">
            <span className={`px-2 py-0.5 rounded-md ${
              parada.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' :
              parada.estado === 'ENTREGADO' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {parada.estado}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 justify-center">
          <button 
            onClick={onAbrirEntrega}
            className="bg-black text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Entrega
          </button>
          <button 
            onClick={onAbrirIncidencia}
            className="bg-gray-100 text-gray-600 border border-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Incidencia
          </button>
        </div>
      </div>

      {/* BLOQUE 3.2 - BANNER DE INCIDENCIAS PENDIENTES */}
      {incidenciasPendientes.length > 0 && (
        <div className="mt-1 bg-amber-50 border border-amber-200 rounded-lg p-2">
          <p className="text-xs font-bold text-amber-800 mb-1">⚠️ Atención antes de llegar:</p>
          <ul className="text-xs text-amber-700 space-y-1 ml-1">
            {incidenciasPendientes.map((inc: any) => (
              <li key={inc.id} className="flex items-start gap-1">
                <span className="mt-0.5">•</span>
                <span>
                  {inc.tipo === 'PRESTAMO_BOTELLON' 
                    ? `Debe ${parada.cliente.botellones_prestados} envases prestados.`
                    : inc.tipo === 'NO_ESTABA' 
                    ? 'La última vez no estaba, coordinar.'
                    : `Incidencia previa: ${inc.tipo.replace('_', ' ')}`}
                </span>
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

  // Refrescar el estado local tras una acción exitosa para que la UI cambie sin recargar
  function manejarExitoAccion(paradaId: string, nuevoEstado: 'ENTREGADO' | 'POSTERGADO' | 'PENDIENTE') {
    setParadas(current => current.map(p => 
      p.id === paradaId ? { ...p, estado: nuevoEstado } : p
    ));
    setModalAbierto(null);
  }

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-semibold text-gray-600">Paradas asignadas ({paradas.length})</h2>
        {guardando && <span className="text-xs text-blue-600 font-medium">Actualizando orden...</span>}
      </div>
      
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={paradas.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {paradas.map(parada => (
            <ParadaItem 
              key={parada.id} 
              parada={parada} 
              onAbrirEntrega={() => { setParadaSeleccionada(parada); setModalAbierto('ENTREGA'); }}
              onAbrirIncidencia={() => { setParadaSeleccionada(parada); setModalAbierto('INCIDENCIA'); }}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Renderizado Condicional de Modales */}
      {modalAbierto === 'ENTREGA' && paradaSeleccionada && (
        <ModalEntrega 
          parada={paradaSeleccionada} 
          onClose={() => setModalAbierto(null)}
          onAbrirIncidencia={() => setModalAbierto('INCIDENCIA')}
        />
      )}

      {modalAbierto === 'INCIDENCIA' && paradaSeleccionada && (
        <ModalIncidencia 
          parada={paradaSeleccionada}
          usuarioId={usuarioId}
          onClose={() => setModalAbierto(null)}
          onSuccess={() => manejarExitoAccion(paradaSeleccionada.id, 'POSTERGADO')} // Asumimos postergado tras incidencia no resuelta en terreno
        />
      )}
    </div>
  );
}