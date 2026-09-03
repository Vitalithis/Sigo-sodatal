'use client';
import { useState } from 'react';
import { registrarMantencionAction, editarDispensadorAction } from '../../actions';
import { useRouter } from 'next/navigation';

const inputCls = 'w-full border border-slate-200 p-2 rounded-lg text-sm text-slate-800 bg-white outline-none focus:ring-2 focus:ring-[#013299]/30 focus:border-[#013299] transition-colors placeholder:text-slate-400';
const labelCls = 'text-xs font-bold text-slate-600 uppercase tracking-wide';

interface Props {
  cliente: any;
  onClienteUpdate: (updater: (prev: any[]) => any[]) => void;
  showSuccess: (t: string, m: string) => void;
  showError: (t: string, m: string) => void;
  showConfirm: (t: string, m: string, fn: () => void) => void;
}

export default function TabTaller({ cliente, onClienteUpdate, showSuccess, showError, showConfirm }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({ dispensador_id: '', tipo_trabajo: 'LIMPIEZA', motivo_falla: '', deja_maquina_prestamo: false, serie_maquina_prestamo: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dispensador_id) { showError('Atención', 'Debe seleccionar una máquina vinculada.'); return; }
    const equipoActual = cliente.dispensadores?.find((d: any) => d.id === form.dispensador_id);
    if (equipoActual?.estado !== 'EN_CLIENTE') { showError('Acción Denegada', 'Este equipo ya se encuentra en taller.'); return; }
    const descripcion = `[${form.tipo_trabajo}] ${form.motivo_falla}`;
    const nuevoEstado = form.tipo_trabajo === 'LIMPIEZA' ? 'TALLER_LIMPIEZA' : 'TALLER_REPARACION';
    onClienteUpdate(prev => prev.map(c => {
      if (c.id !== cliente.id) return c;
      const disps = (c.dispensadores || []).map((d: any) => d.id === form.dispensador_id ? { ...d, estado: nuevoEstado } : d);
      const nuevaMant = { id: Math.random().toString(), fecha: new Date().toISOString(), motivoFalla: descripcion, motivo_falla: descripcion, dispensador: equipoActual ? { id: form.dispensador_id, numero_serie: equipoActual.numero_serie || equipoActual.numeroSerie } : null };
      return { ...c, dispensadores: disps, mantenciones: [nuevaMant, ...(c.mantenciones || [])] };
    }));
    setForm({ dispensador_id: '', tipo_trabajo: 'LIMPIEZA', motivo_falla: '', deja_maquina_prestamo: false, serie_maquina_prestamo: '' });
    const res = await registrarMantencionAction(cliente.id, { dispensadorId: form.dispensador_id, motivoFalla: descripcion, deja_maquina_prestamo: form.deja_maquina_prestamo, serieMaquinaPrestamo: form.serie_maquina_prestamo || undefined });
    if (res.success) {
      if (equipoActual) await editarDispensadorAction(form.dispensador_id, { marca: equipoActual.marca || 'FRIO_CALOR_COMPRESOR', modelo: equipoActual.modelo || '', numeroSerie: equipoActual.numero_serie || 'S/N', estado: nuevoEstado, precioArriendo: Number(equipoActual.precio_arriendo || 0), fotoUrl: equipoActual.foto_url || undefined });
      router.refresh(); showSuccess('Taller Técnico', 'El equipo ingresó a taller correctamente.');
    } else { showError('Error', res.message || 'Falló el registro.'); }
  };

  const handleSalida = (dispensador: any) => {
    showConfirm('¿Dar de Alta Equipo?', `Confirmar salida del equipo S/N: ${dispensador.numero_serie || dispensador.numeroSerie}.`, async () => {
      onClienteUpdate(prev => prev.map(c => {
        if (c.id !== cliente.id) return c;
        const disps = (c.dispensadores || []).map((d: any) => d.id === dispensador.id ? { ...d, estado: 'EN_CLIENTE' } : d);
        const nota = { id: Math.random().toString(), fecha: new Date().toISOString(), motivoFalla: '[ALTA MEDICA] Salida exitosa de taller.', motivo_falla: '[ALTA MEDICA] Salida exitosa de taller.', dispensador: { id: dispensador.id, numero_serie: dispensador.numero_serie } };
        return { ...c, dispensadores: disps, mantenciones: [nota, ...(c.mantenciones || [])] };
      }));
      const res = await editarDispensadorAction(dispensador.id, { marca: dispensador.marca || 'FRIO_CALOR_COMPRESOR', modelo: dispensador.modelo || '', numeroSerie: dispensador.numero_serie || 'S/N', estado: 'EN_CLIENTE', precioArriendo: Number(dispensador.precio_arriendo || 0), fotoUrl: dispensador.foto_url || undefined });
      if (res.success) { router.refresh(); showSuccess('Alta Técnica', 'El dispensador quedó registrado como operativo.'); }
      else { showError('Error', res.message || 'No se pudo cambiar el estado.'); }
    });
  };

  const enTaller = cliente.dispensadores?.filter((d: any) => d.estado?.startsWith('TALLER')) || [];

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
        <h3 className="font-bold text-xs uppercase text-slate-600 tracking-wider border-b border-slate-200 pb-2">Ingresar a Taller</h3>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Seleccionar Máquina *</label>
          <select value={form.dispensador_id} onChange={e => setForm(p => ({ ...p, dispensador_id: e.target.value }))} className={inputCls}>
            <option value="">-- Elija un equipo activo --</option>
            {cliente.dispensadores?.filter((d: any) => d.estado === 'EN_CLIENTE').map((d: any) => (
              <option key={d.id} value={d.id}>{(d.marca || d.tipo || '').replace(/_/g, ' ')} — S/N: {d.numero_serie || 'S/N'}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Tipo de Trabajo</label>
          <div className="flex gap-2">
            {['LIMPIEZA', 'REPARACION'].map(tipo => (
              <button key={tipo} type="button" onClick={() => setForm(p => ({ ...p, tipo_trabajo: tipo }))}
                className="flex-1 py-2 text-xs font-bold rounded-xl border transition-colors"
                style={form.tipo_trabajo === tipo ? { backgroundColor: '#013299', color: 'white', borderColor: '#013299' } : { backgroundColor: 'white', color: '#475569', borderColor: '#e2e8f0' }}>
                {tipo === 'LIMPIEZA' ? '🧼 Sanitización' : '🔧 Reparación'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Falla Reportada *</label>
          <textarea rows={3} value={form.motivo_falla} onChange={e => setForm(p => ({ ...p, motivo_falla: e.target.value }))} placeholder="Describa el motivo de ingreso..." className={inputCls + ' resize-none'} />
        </div>
        <button type="submit" disabled={!form.dispensador_id || !form.motivo_falla.trim()} className="w-full py-2.5 font-bold rounded-xl text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors" style={{ backgroundColor: '#013299' }}>
          Procesar Entrada a Taller
        </button>
      </form>

      <h3 className="font-bold text-xs uppercase text-amber-600 tracking-wider">Equipos en Servicio Técnico</h3>
      <div className="space-y-3">
        {enTaller.length > 0 ? enTaller.map((disp: any) => (
          <div key={disp.id} className="p-4 border border-amber-200 bg-amber-50 rounded-xl flex justify-between items-center">
            <div>
              <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold uppercase">{disp.estado.replace('_', ' ')}</span>
              <h4 className="font-bold text-sm text-slate-900 uppercase mt-1">{disp.marca || disp.tipo}</h4>
              <p className="text-xs text-slate-500">Nº Serie: {disp.numero_serie || 'S/N'}</p>
            </div>
            <button onClick={() => handleSalida(disp)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">✅ Salida de Taller</button>
          </div>
        )) : (
          <p className="text-xs text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-2xl">No hay máquinas en taller actualmente.</p>
        )}
      </div>

      <h3 className="font-bold text-xs uppercase text-slate-500 tracking-wider">Historial Técnico</h3>
      <div className="space-y-3">
        {cliente.mantenciones?.length > 0 ? cliente.mantenciones.map((m: any) => (
          <div key={m.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 text-xs space-y-1">
            <div className="flex justify-between font-bold text-slate-800">
              <span>S/N: {m.dispensador?.numero_serie || m.dispensador?.numeroSerie || 'S/N'}</span>
              <span className="text-slate-400 font-normal">{new Date(m.fecha).toLocaleDateString()}</span>
            </div>
            <p className="text-slate-600 italic">"{m.motivoFalla || m.motivo_falla}"</p>
          </div>
        )) : (
          <p className="text-xs text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-2xl">Sin historial técnico registrado.</p>
        )}
      </div>
    </div>
  );
}
