'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  obtenerDispensadoresDisponiblesAction, 
  asignarDispensadorAClienteAction, 
  retirarDispensadorDeClienteAction 
} from '@/app/admin/dispensadores/actions';
import { Plus, Trash2, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2, Building2 } from 'lucide-react';

const inputCls = 'w-full border border-slate-200 p-2.5 rounded-xl text-xs text-slate-800 bg-white outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] transition-colors placeholder:text-slate-400 font-medium';
const labelCls = 'text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block';

interface Props {
  cliente: any;
  onClienteUpdate: (updater: (prev: any[]) => any[]) => void;
  showSuccess: (t: string, m: string) => void;
  showError: (t: string, m: string) => void;
}

export default function TabDispensadores({ cliente, onClienteUpdate, showSuccess, showError }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [dispensadoresDisponibles, setDispensadoresDisponibles] = useState<any[]>([]);
  const [loadingDisponibles, setLoadingDisponibles]             = useState(true);

  // Formulario de asignación
  const [dispensadorSeleccionadoId, setDispensadorSeleccionadoId] = useState('');
  const [precioArriendoInput, setPrecioArriendoInput]             = useState('');

  // Cargar dispensadores disponibles en bodega al montar
  const cargarDisponibles = async () => {
    setLoadingDisponibles(true);
    const res = await obtenerDispensadoresDisponiblesAction();
    if (res.success) {
      setDispensadoresDisponibles(res.disponibles || []);
    }
    setLoadingDisponibles(false);
  };

  useEffect(() => {
    cargarDisponibles();
  }, []);

  // Al seleccionar un dispensador, autocompletar su precio por defecto si existe
  const handleSelectDispensador = (id: string) => {
    setDispensadorSeleccionadoId(id);
    const item = dispensadoresDisponibles.find(d => d.id === id);
    if (item && item.precio_arriendo) {
      setPrecioArriendoInput(String(item.precio_arriendo));
    }
  };

  // Asignar dispensador ya registrado al cliente
  const handleAsignar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispensadorSeleccionadoId) {
      showError('Atención', 'Debes seleccionar un dispensador de la lista.');
      return;
    }

    const precio = parseInt(precioArriendoInput.replace(/\D/g, ''), 10) || 0;

    startTransition(async () => {
      const res = await asignarDispensadorAClienteAction(dispensadorSeleccionadoId, cliente.id, precio);
      if (res.success && res.data) {
        showSuccess('Dispensador Vinculado', 'El dispensador fue asignado exitosamente al cliente.');
        setDispensadorSeleccionadoId('');
        setPrecioArriendoInput('');
        cargarDisponibles();
        router.refresh();
      } else {
        showError('Error', res.message || 'No se pudo asignar el dispensador.');
      }
    });
  };

  // Desvincular / Devolver dispensador a bodega
  const handleDesvincular = async (dispensadorId: string, serieStr: string) => {
    if (!confirm(`¿Deseas desvincular el dispensador N° Serie "${serieStr}" de este cliente y devolverlo a bodega?`)) {
      return;
    }

    startTransition(async () => {
      const res = await retirarDispensadorDeClienteAction(dispensadorId);
      if (res.success) {
        showSuccess('Dispensador Desvinculado', 'El equipo ha retornado a la bodega.');
        cargarDisponibles();
        router.refresh();
      } else {
        showError('Error', res.message || 'No se pudo retirar el dispensador.');
      }
    });
  };

  const dispensadoresCliente = cliente.dispensadores || [];

  return (
    <div className="space-y-6">

      {/* BLOQUE 1: ASIGNAR DISPENSADOR EXISTENTE DE BODEGA */}
      <form onSubmit={handleAsignar} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <h3 className="font-extrabold text-xs uppercase text-[#013299] tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#013299]" />
            Asignar Dispensador Registrado en Bodega
          </h3>
          <button 
            type="button" 
            onClick={cargarDisponibles} 
            className="text-slate-400 hover:text-[#013299] p-1 transition-colors"
            title="Actualizar disponibilidad"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDisponibles ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Selector de Dispensador */}
          <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
            <label className={labelCls}>Seleccionar Equipo en Bodega *</label>
            <select
              value={dispensadorSeleccionadoId}
              onChange={e => handleSelectDispensador(e.target.value)}
              disabled={loadingDisponibles || dispensadoresDisponibles.length === 0}
              className={inputCls}
            >
              <option value="">
                {loadingDisponibles 
                  ? 'Cargando disponibilidad...' 
                  : dispensadoresDisponibles.length === 0 
                  ? '— No hay equipos disponibles en bodega —' 
                  : '— Seleccionar dispensador —'}
              </option>
              {dispensadoresDisponibles.map(d => (
                <option key={d.id} value={d.id}>
                  {d.marca} {d.modelo ? `(${d.modelo})` : ''} - N° Serie: {d.numero_serie || 'S/N'}
                </option>
              ))}
            </select>
          </div>

          {/* Precio de Arriendo */}
          <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
            <label className={labelCls}>Precio Arriendo Mensual ($)</label>
            <input
              type="number"
              value={precioArriendoInput}
              onChange={e => setPrecioArriendoInput(e.target.value)}
              placeholder="Ej: 15000"
              className={inputCls}
            />
          </div>

        </div>

        {dispensadoresDisponibles.length === 0 && !loadingDisponibles && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              Para registrar nuevos dispensadores al inventario, ve al módulo principal de <strong>Dispensadores</strong>.
            </span>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isPending || !dispensadorSeleccionadoId}
            className="flex items-center gap-2 bg-[#013299] hover:bg-blue-900 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-[#013299]/20 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isPending ? 'Asignando...' : 'Asignar a Cliente'}
          </button>
        </div>
      </form>

      {/* BLOQUE 2: EQUIPOS ACTUALMENTE VINCULADOS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-xs uppercase text-slate-500 tracking-wider">
            Equipos Asignados actualmente ({dispensadoresCliente.length})
          </h3>
        </div>

        {dispensadoresCliente.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl bg-white p-6">
            <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-xs text-slate-600">Este cliente no posee dispensadores asignados.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Selecciona un equipo arriba para asignárselo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {dispensadoresCliente.map((disp: any) => (
              <div 
                key={disp.id} 
                className="p-4 border border-slate-200 rounded-2xl bg-white shadow-sm flex items-center justify-between flex-wrap gap-3 hover:border-blue-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 text-[#013299] rounded-xl border border-blue-100">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-900 uppercase">
                      {disp.marca} {disp.modelo ? `(${disp.modelo})` : ''}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      N° Serie: <strong className="text-slate-800">{disp.numero_serie || 'S/N'}</strong>
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                        En Cliente
                      </span>
                      <span className="text-xs font-black text-[#013299]">
                        ${Number(disp.precio_arriendo || 0).toLocaleString('es-CL')} / mes
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDesvincular(disp.id, disp.numero_serie || 'S/N')}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all"
                  title="Desvincular dispensador de este cliente"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  Desvincular
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
