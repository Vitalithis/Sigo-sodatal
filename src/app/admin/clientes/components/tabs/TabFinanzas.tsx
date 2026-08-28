'use client';
import { useState } from 'react';
import { registrarMovimientoFinancieroAction } from '../../actions';
import { useRouter } from 'next/navigation';

const inputCls = 'w-full border border-slate-200 p-2 rounded-lg text-sm text-slate-800 bg-white outline-none focus:ring-2 focus:ring-[#013299]/30 focus:border-[#013299] transition-colors placeholder:text-slate-400';
const labelCls = 'text-xs font-bold text-slate-600 uppercase tracking-wide';

interface Props {
  cliente: any;
  showSuccess: (t: string, m: string) => void;
  showError: (t: string, m: string) => void;
}

export default function TabFinanzas({ cliente, showSuccess, showError }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({ tipo: 'RECARGA', descripcion: '', monto: 0, documento_ref: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await registrarMovimientoFinancieroAction(cliente.id, { tipo: form.tipo as any, descripcion: form.descripcion, monto: form.monto, documentoRef: form.documento_ref || undefined });
    if (res.success) { setForm({ tipo: 'RECARGA', descripcion: '', monto: 0, documento_ref: '' }); router.refresh(); showSuccess('Caja Actualizada', 'La transacción se asentó correctamente.'); }
    else { showError('Error', res.message || 'Falló la operación financiera.'); }
  };

  const exportarCSV = () => {
    const historial = cliente.movimientosFinancieros || [];
    if (!historial.length) { showError('Información', 'No hay movimientos registrados.'); return; }
    let csv = 'data:text/csv;charset=utf-8,Fecha,Tipo,Descripcion,Monto,Documento Ref\n';
    historial.forEach((h: any) => { csv += `"${new Date(h.fecha).toLocaleDateString()}","${h.tipo || ''}","${h.descripcion || ''}",${h.monto || 0},"${h.documento_ref || ''}"\n`; });
    const link = document.createElement('a'); link.setAttribute('href', encodeURI(csv)); link.setAttribute('download', `Finanzas_${cliente.nombre.replace(/\s+/g, '_')}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
          <h3 className="font-bold text-xs uppercase text-slate-600 tracking-wider">Nueva Compra</h3>
          <button type="button" onClick={exportarCSV} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors">📥 Exportar CSV</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Tipo de Compra</label>
            <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} className={inputCls}>
              <option value="RECARGA">Recarga de Botellón</option>
              <option value="COMPRA_EQUIPO">Compra de Equipo</option>
              <option value="ACCESORIOS">Accesorios / Repuestos</option>
              <option value="OTRO">Otros</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Total Venta ($) *</label>
            <input type="number" required placeholder="Ej: 15000" value={form.monto || ''} onChange={e => setForm(p => ({ ...p, monto: Number(e.target.value) }))} className={inputCls} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>{cliente.tipo === 'EMPRESA' ? 'N° Guía de Despacho *' : 'N° Boleta'}</label>
          <input type="text" required={cliente.tipo === 'EMPRESA'} value={form.documento_ref} onChange={e => setForm(p => ({ ...p, documento_ref: e.target.value }))} placeholder={cliente.tipo === 'EMPRESA' ? 'Ej: Guía Nº 4520' : 'Ej: Boleta Nº 98231 (Opcional)'} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Detalle / Ítems</label>
          <input type="text" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Ej: 3 recargas de 20L + 1 dispensador" className={inputCls} />
        </div>
        <button type="submit" className="w-full text-white font-bold py-2.5 rounded-xl text-sm" style={{ backgroundColor: '#013299' }}>Registrar en Historial</button>
      </form>

      <h3 className="font-bold text-xs uppercase text-slate-500 tracking-wider">Historial de Compras</h3>
      <div className="space-y-3">
        {cliente.movimientosFinancieros?.length > 0 ? cliente.movimientosFinancieros.map((mov: any) => (
          <div key={mov.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex justify-between items-center text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded text-[10px] uppercase">{mov.tipo.replace('_', ' ')}</span>
                <span className="text-slate-400">{new Date(mov.fecha).toLocaleDateString()}</span>
              </div>
              <p className="text-slate-700 font-medium">{mov.descripcion || 'Sin descripción'}</p>
              {(mov.documentoRef || mov.documento_ref) && (
                <p className="text-[11px] text-slate-500 font-semibold">{cliente.tipo === 'EMPRESA' ? '📦 Guía: ' : '🧾 Boleta: '}{mov.documentoRef || mov.documento_ref}</p>
              )}
            </div>
            <span className="font-bold text-slate-900 text-sm bg-white px-2 py-1 rounded-lg border border-slate-200">${Number(mov.monto || 0).toLocaleString('es-CL')}</span>
          </div>
        )) : (
          <p className="text-xs text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-2xl">Sin historial de compras registrado.</p>
        )}
      </div>
    </div>
  );
}