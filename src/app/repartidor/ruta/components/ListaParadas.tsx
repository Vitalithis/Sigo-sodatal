"use client";

import { useState, useMemo } from 'react';
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
import { actualizarOrdenParadasAction, actualizarParadaCompletaAction } from '@/app/admin/rutas/actions';
import ModalEntrega from './ModalEntrega';
import ModalIncidencia from './ModalIncidencia';
import { 
  Phone, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  GripVertical, 
  Package, 
  ChevronDown, 
  ChevronUp, 
  ChevronsUpDown,
  Navigation,
  Clock
} from 'lucide-react';

// Resumen ultra-compacto de productos
function getCantidadResumen(parada: any): string {
  if (parada.pedido?.items && parada.pedido.items.length > 0) {
    return parada.pedido.items
      .map((it: any) => `${it.cantidad}x ${it.producto?.nombre?.replace(/botellon/i, 'Bot.').replace(/recarga/i, 'Rec.').trim() || 'un.'}`)
      .join(', ');
  }

  const partes: string[] = [];
  const b20 = parada.bot20_entregado > 0 ? parada.bot20_entregado : parada.bot20_esperado;
  const b10 = parada.bot10_entregado > 0 ? parada.bot10_entregado : parada.bot10_esperado;
  const soda = parada.soda_entregada > 0 ? parada.soda_entregada : parada.soda_esperada;

  if (b20 > 0) partes.push(`${b20}x 20L`);
  if (b10 > 0) partes.push(`${b10}x 10L`);
  if (soda > 0) partes.push(`${soda}x Soda`);

  return partes.length > 0 ? partes.join(', ') : 'Sin productos';
}

function ParadaAccordionItem({ 
  parada, 
  index, 
  isExpanded,
  onToggleExpand,
  onAbrirEntrega,
  onAbrirIncidencia,
  onCambiarEstado,
}: { 
  parada: any; 
  index: number; 
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAbrirEntrega: () => void; 
  onAbrirIncidencia: () => void;
  onCambiarEstado: (paradaId: string, nuevoEstado: 'ENTREGADO' | 'POSTERGADO' | 'PENDIENTE') => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: parada.id });

  const [postergando, setPostergando] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.9 : 1,
  };

  const incidenciasPendientes = parada.cliente?.incidencias || [];
  const esEntregado = parada.estado === 'ENTREGADO';
  const esPostergado = parada.estado === 'POSTERGADO';
  const cantidadResumen = getCantidadResumen(parada);

  async function handlePostergar(e: React.MouseEvent) {
    e.stopPropagation();
    setPostergando(true);
    const nuevoEstado = esPostergado ? 'PENDIENTE' : 'POSTERGADO';
    const res = await actualizarParadaCompletaAction(parada.id, { 
      estado: nuevoEstado,
      observacion: nuevoEstado === 'POSTERGADO' ? 'Postergado desde listado' : undefined
    });
    if (res.success) {
      onCambiarEstado(parada.id, nuevoEstado);
    }
    setPostergando(false);
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`bg-white border rounded-lg shadow-2xs overflow-hidden transition-all ${
        isDragging ? 'shadow-md border-[#013299] ring-2 ring-[#013299]/20' : 
        esEntregado ? 'border-emerald-200 bg-emerald-50/10' :
        esPostergado ? 'border-amber-200 bg-amber-50/15' :
        'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* ── CABECERA COMPACTA DEL ACORDEÓN (DIRECCIÓN COMPLETA + CANTIDAD) ── */}
      <div className="px-2 py-1.5 flex items-start gap-1">
        
        {/* Grabber ultra-delgado */}
        <div 
          {...attributes} 
          {...listeners}
          className="touch-none flex items-center justify-center p-0.5 text-slate-300 hover:text-slate-500 rounded cursor-grab active:cursor-grabbing shrink-0 mt-0.5"
          title="Arrastrar secuencia"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Zona clickeable para abrir/cerrar */}
        <div 
          onClick={onToggleExpand}
          className="flex-1 min-w-0 cursor-pointer select-none"
        >
          <div className="flex items-start justify-between gap-1.5">
            {/* Orden + Dirección (Línea 1) y Cantidad debajo (Línea 2) */}
            <div className="flex items-start gap-1.5 min-w-0 flex-1">
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                esEntregado ? 'bg-emerald-600 text-white' : 'bg-[#013299] text-white'
              }`}>
                {esEntregado ? `✓ #${index + 1}` : `#${index + 1}`}
              </span>
              
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 text-xs leading-snug break-words">
                  {parada.cliente?.direccion || 'Sin dirección'}
                </p>

                {/* Badge de cantidad debajo de la dirección para no restarle ancho */}
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-[#013299] px-1.5 py-0.5 rounded text-[10px] font-black border border-blue-200/60">
                    <Package className="w-2.5 h-2.5 shrink-0" />
                    <span>{cantidadResumen}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Badge Estado + Chevron */}
            <div className="flex items-center gap-1 shrink-0 mt-0.5">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${
                parada.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-900' :
                parada.estado === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-900' :
                'bg-amber-200 text-amber-950 border border-amber-300'
              }`}>
                {parada.estado === 'PENDIENTE' ? 'Pend.' : parada.estado === 'ENTREGADO' ? 'Entr.' : 'Post.'}
              </span>

              <div className="text-slate-400">
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-[#013299]" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── CUERPO EXPANDIDO (ALINEACIÓN ESTRECHA CON BOTONES SEPARADOS) ── */}
      {isExpanded && (
        <div className="px-2 pb-1.5 pt-1 border-t border-slate-100 bg-slate-50/60 space-y-1 animate-in fade-in duration-100 text-xs">
          
          {/* Fila compacta de detalles adicionales si existen */}
          {(parada.cliente?.comentario || incidenciasPendientes.length > 0 || (parada.cliente?.botellones_prestados || 0) > 0) && (
            <div className="flex items-center gap-1 flex-wrap text-[10px] text-slate-600">
              {(parada.cliente?.botellones_prestados || 0) > 0 && (
                <span className="font-bold text-[#013299] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  {parada.cliente.botellones_prestados} envases prestados
                </span>
              )}
              {incidenciasPendientes.length > 0 && (
                <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                  Nota: {incidenciasPendientes.map((i: any) => i.tipo.replace('_', ' ')).join(', ')}
                </span>
              )}
              {parada.cliente?.comentario && (
                <span className="text-slate-500 italic">
                  "{parada.cliente.comentario}"
                </span>
              )}
            </div>
          )}

          {/* Botones de Acción al Tamaño Mínimo Visible y Alineación Estrecha */}
          <div className="flex items-center gap-1 pt-0.5 flex-wrap">
            {parada.cliente?.telefono && (
              <a 
                href={`tel:${parada.cliente.telefono}`}
                className="h-6 px-1.5 text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 transition-colors flex items-center gap-1 shrink-0"
                title={`Llamar a ${parada.cliente.telefono}`}
              >
                <Phone className="w-3 h-3 text-emerald-600" />
                <span>Llamar</span>
              </a>
            )}

            <button 
              type="button"
              disabled={postergando}
              onClick={handlePostergar}
              className={`h-6 px-1.5 text-[10px] font-bold rounded border transition-colors flex items-center gap-1 shrink-0 ${
                esPostergado 
                  ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200' 
                  : 'bg-white hover:bg-amber-50 border-slate-200 text-amber-800'
              }`}
              title={esPostergado ? 'Reactivar Parada' : 'Postergar Parada'}
            >
              <Clock className="w-3 h-3 text-amber-600" />
              <span>{postergando ? '...' : (esPostergado ? 'Reactivar' : 'Postergar')}</span>
            </button>

            {/* Botón de Reportar fuera de Entregado */}
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAbrirIncidencia();
              }}
              className="h-6 px-1.5 text-[10px] font-bold rounded border bg-white hover:bg-rose-50 border-slate-200 text-rose-700 transition-colors flex items-center gap-1 shrink-0"
              title="Reportar Problema / No estaba"
            >
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>Reportar</span>
            </button>

            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAbrirEntrega();
              }}
              className={`h-6 px-2 text-[10px] font-black rounded shadow-2xs transition-all active:scale-95 flex items-center gap-1 ml-auto shrink-0 ${
                esEntregado
                  ? 'bg-slate-800 text-white hover:bg-slate-900'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>{esEntregado ? 'Revisar' : 'Entregar'}</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
}

function ordenarParadasPendientesPrimero(lista: any[]) {
  const pendientes = lista.filter(p => p.estado !== 'ENTREGADO');
  const entregadas = lista.filter(p => p.estado === 'ENTREGADO');
  return [...pendientes, ...entregadas];
}

export default function ListaParadas({ 
  paradasIniciales, 
  usuarioId 
}: { 
  paradasIniciales: any[]; 
  usuarioId: string;
}) {
  const [paradas, setParadas] = useState(() => ordenarParadasPendientesPrimero(paradasIniciales));
  const [guardando, setGuardando] = useState(false);
  
  // Por defecto todas cerradas para no invadir la pantalla
  const [openParadas, setOpenParadas] = useState<Set<string>>(new Set());

  // Estado para colapsar/expandir sectores
  const [sectoresColapsados, setSectoresColapsados] = useState<Set<string>>(new Set());

  // Estado para los modales
  const [paradaSeleccionada, setParadaSeleccionada] = useState<any>(null);
  const [modalAbierto, setModalAbierto] = useState<'ENTREGA' | 'INCIDENCIA' | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // AGRUPACIÓN POR COMUNA Y SECTOR
  const gruposSector = useMemo(() => {
    const gruposMap = new Map<string, {
      key: string;
      comuna: string;
      sector: string;
      paradas: { parada: any; originalIndex: number }[];
    }>();

    paradas.forEach((parada, originalIndex) => {
      const comuna = parada.cliente?.sector?.comuna?.nombre || 'Comuna general';
      const sector = parada.cliente?.sector?.nombre || 'Sector general';
      const key = `${comuna}___${sector}`;

      if (!gruposMap.has(key)) {
        gruposMap.set(key, {
          key,
          comuna,
          sector,
          paradas: [],
        });
      }
      gruposMap.get(key)!.paradas.push({ parada, originalIndex });
    });

    return Array.from(gruposMap.values());
  }, [paradas]);

  const toggleParadaExpand = (id: string) => {
    setOpenParadas(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSectorCollapse = (key: string) => {
    setSectoresColapsados(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleExpandirTodas = () => {
    if (openParadas.size === paradas.length) {
      setOpenParadas(new Set());
    } else {
      setOpenParadas(new Set(paradas.map(p => p.id)));
    }
  };

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
    setParadas(current => {
      const actualizadas = current.map(p => 
        p.id === paradaId ? { ...p, estado: nuevoEstado } : p
      );
      if (nuevoEstado === 'ENTREGADO') {
        const reordenadas = ordenarParadasPendientesPrimero(actualizadas);
        guardarNuevoOrden(reordenadas);
        return reordenadas;
      }
      return actualizadas;
    });
    setModalAbierto(null);
  }

  return (
    <div className="relative space-y-2">
      
      {/* Barra de control superior ultra compacta */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-xs">
        <div className="flex items-center gap-2">
          <Navigation className="w-3.5 h-3.5 text-[#013299]" />
          <span className="font-black text-slate-800 uppercase tracking-tight text-[11px]">
            Paradas ({paradas.length})
          </span>
          {guardando && (
            <span className="text-[10px] text-[#013299] font-bold animate-pulse">
              Guardando orden...
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={toggleExpandirTodas}
          className="text-[10px] font-bold text-slate-600 hover:text-[#013299] bg-slate-100 hover:bg-blue-50 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1"
        >
          <ChevronsUpDown className="w-3 h-3" />
          <span>{openParadas.size === paradas.length ? 'Contraer todo' : 'Expandir todo'}</span>
        </button>
      </div>
      
      {/* Contenedor Drag & Drop */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={paradas.map(p => p.id)} strategy={verticalListSortingStrategy}>
          
          <div className="space-y-2">
            {gruposSector.map((grupo) => {
              const estaColapsado = sectoresColapsados.has(grupo.key);
              const totalGrupo = grupo.paradas.length;
              const entregadasGrupo = grupo.paradas.filter(p => p.parada.estado === 'ENTREGADO').length;

              return (
                <div key={grupo.key} className="space-y-1">
                  
                  {/* Encabezado de Sector Delgado y Compacto */}
                  <div 
                    onClick={() => toggleSectorCollapse(grupo.key)}
                    className="flex items-center justify-between py-0.5 px-2 bg-slate-100/90 hover:bg-slate-200/80 rounded-md cursor-pointer select-none transition-colors border border-slate-200/60"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin className="w-2.5 h-2.5 text-[#013299] shrink-0" />
                      <span className="font-black text-slate-900 uppercase text-[10.5px] truncate">
                        {grupo.comuna}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="font-bold text-slate-700 text-[10.5px] truncate">
                        Sector {grupo.sector}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9.5px] font-extrabold text-slate-500">
                        {entregadasGrupo}/{totalGrupo}
                      </span>

                      <div className="text-slate-400">
                        {estaColapsado ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronUp className="w-3 h-3" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lista de Paradas del Sector */}
                  {!estaColapsado && (
                    <div className="space-y-1 pl-0.5">
                      {grupo.paradas.map(({ parada, originalIndex }) => (
                        <ParadaAccordionItem 
                          key={parada.id} 
                          parada={parada} 
                          index={originalIndex}
                          isExpanded={openParadas.has(parada.id)}
                          onToggleExpand={() => toggleParadaExpand(parada.id)}
                          onAbrirEntrega={() => { 
                            setParadaSeleccionada(parada); 
                            setModalAbierto('ENTREGA'); 
                          }}
                          onAbrirIncidencia={() => { 
                            setParadaSeleccionada(parada); 
                            setModalAbierto('INCIDENCIA'); 
                          }}
                          onCambiarEstado={manejarExitoAccion}
                        />
                      ))}
                    </div>
                  )}

                </div>
              );
            })}
          </div>

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
            setParadas(current => {
              const actualizadas = current.map(p => 
                p.id === paradaSeleccionada.id ? { 
                  ...p, 
                  estado: 'ENTREGADO',
                  bot20_entregado: cantidades.bot20,
                  bot10_entregado: cantidades.bot10,
                  soda_entregada: cantidades.soda,
                  guia_correlativo: guiaInfo?.numero_correlativo || p.guia_correlativo,
                } : p
              );
              const reordenadas = ordenarParadasPendientesPrimero(actualizadas);
              guardarNuevoOrden(reordenadas);
              return reordenadas;
            });
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
