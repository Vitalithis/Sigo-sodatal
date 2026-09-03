'use client';
import { resolverIncidenciaAction } from '../../actions';
import { useRouter } from 'next/navigation';

interface Props {
  cliente: any;
  showSuccess: (t: string, m: string) => void;
  showError: (t: string, m: string) => void;
  showConfirm: (t: string, m: string, fn: () => void) => void;
}

export default function TabIncidencias({ cliente, showSuccess, showError, showConfirm }: Props) {
  const router = useRouter();

  const handleResolver = (id: string) => {
    showConfirm('¿Resolver Incidencia?', 'Esta acción marcará la incidencia como resuelta.', async () => {
      const res = await resolverIncidenciaAction(id);
      if (res.success) { router.refresh(); showSuccess('Resuelta', 'La incidencia fue actualizada con éxito.'); }
      else { showError('Error', res.message || 'No se pudo resolver la incidencia.'); }
    });
  };

  const incidencias = cliente.incidencias || [];

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-xs uppercase text-slate-600 tracking-wider border-b border-slate-100 pb-2">Historial de Incidencias</h3>
      {incidencias.length > 0 ? incidencias.map((inc: any) => (
        <div key={inc.id} className={`p-4 border rounded-xl flex flex-col gap-3 ${inc.resuelta ? 'bg-slate-50 border-slate-200 opacity-80' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${inc.resuelta ? 'bg-slate-200 text-slate-700' : 'bg-amber-200 text-amber-900'}`}>{inc.tipo.replace('_', ' ')}</span>
                <span className="text-xs text-slate-400">{new Date(inc.created_at || inc.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm font-semibold text-slate-900 mt-1">{inc.descripcion || 'Sin observaciones.'}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${inc.resuelta ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{inc.resuelta ? 'Resuelta' : 'Pendiente'}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 text-xs text-slate-500">
            <span>Registrado por: <strong>{inc.usuario?.nombre || 'Repartidor'}</strong></span>
            {!inc.resuelta && (
              <button onClick={() => handleResolver(inc.id)} className="text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-colors" style={{ backgroundColor: '#013299' }}>✔️ Resolver</button>
            )}
          </div>
        </div>
      )) : (
        <p className="text-xs text-slate-400 text-center py-10 border border-dashed border-slate-200 rounded-2xl">Sin incidencias registradas.</p>
      )}
    </div>
  );
}
