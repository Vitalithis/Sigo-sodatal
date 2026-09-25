'use client';
import { useState } from 'react';
import { registrarMovimientoFinancieroAction, registrarPagoOTransferenciaAction } from '@/app/admin/clientes/actions';
import { useRouter } from 'next/navigation';
import { DollarSign, ArrowDownCircle, ArrowUpCircle, FileText, Download } from 'lucide-react';

const inputCls = 'w-full border border-slate-200 p-2 rounded-lg text-sm text-slate-800 bg-white outline-none focus:ring-2 focus:ring-[#013299]/30 focus:border-[#013299] transition-colors placeholder:text-slate-400';
const labelCls = 'text-xs font-bold text-slate-600 uppercase tracking-wide';

interface Props {
  cliente: any;
  showSuccess: (t: string, m: string) => void;
  showError: (t: string, m: string) => void;
}

export default function TabFinanzas({ cliente, showSuccess, showError }: Props) {
  const router = useRouter();
  const [modo, setModo] = useState<'pago' | 'cargo'>('pago');

  // Form Pago / Transferencia
  const [pagoForm, setPagoForm] = useState({
    monto: 0,
    descripcion: '',
    documento_ref: '',
    metodo: 'TRANSFERENCIA',
  });

  // Form Cargo / Compra
  const [cargoForm, setCargoForm] = useState({
    tipo: 'COMPRA_BOTELLON',
    descripcion: '',
    monto: 0,
    documento_ref: '',
  });

  const deudaActual = cliente.deuda ?? 0;

  const handlePagoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pagoForm.monto <= 0) {
      showError('Atención', 'El monto del pago debe ser mayor a 0.');
      return;
    }

    const res = await registrarPagoOTransferenciaAction(cliente.id, {
      monto: Number(pagoForm.monto),
      descripcion: pagoForm.descripcion || `Pago abonado por ${pagoForm.metodo.toLowerCase()}`,
      documento_ref: pagoForm.documento_ref || undefined,
      esTransferencia: pagoForm.metodo === 'TRANSFERENCIA',
    });

    if (res.success) {
      router.refresh();
      showSuccess('Pago Registrado', `Se abonaron $${Number(pagoForm.monto).toLocaleString('es-CL')} a la cuenta del cliente.`);
      setPagoForm({ monto: 0, descripcion: '', documento_ref: '', metodo: 'TRANSFERENCIA' });
    } else {
      showError('Error', res.message || 'No se pudo registrar el pago.');
    }
  };

  const handleCargoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cargoForm.monto <= 0) {
      showError('Atención', 'El monto del cargo debe ser mayor a 0.');
      return;
    }

    const res = await registrarMovimientoFinancieroAction(cliente.id, {
      tipo: cargoForm.tipo as any,
      descripcion: cargoForm.descripcion || 'Cargo registrado en cuenta',
      monto: Number(cargoForm.monto),
      documento_ref: cargoForm.documento_ref || undefined,
    });

    if (res.success) {
      router.refresh();
      showSuccess('Cargo Registrado', `Se sumó un cargo de $${Number(cargoForm.monto).toLocaleString('es-CL')} al saldo del cliente.`);
      setCargoForm({ tipo: 'COMPRA_BOTELLON', descripcion: '', monto: 0, documento_ref: '' });
    } else {
      showError('Error', res.message || 'No se pudo registrar el cargo.');
    }
  };

  const historial = cliente.historial_financiero || cliente.historialFinanciero || [];

  return (
    <div className="space-y-6">
      {/* Targeta Resumen de Deuda/Saldo */}
      <div className="p-5 rounded-2xl border shadow-sm flex items-center justify-between"
        style={{
          backgroundColor: deudaActual > 0 ? '#fef2f2' : '#f0fdf4',
          borderColor: deudaActual > 0 ? '#fecaca' : '#bbf7d0',
        }}>
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl text-white font-black ${deudaActual > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}>
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Deuda / Saldo Pendiente</span>
            <span className={`text-2xl font-black ${deudaActual > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              ${deudaActual.toLocaleString('es-CL')}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className={`text-xs font-extrabold uppercase px-3 py-1 rounded-full ${deudaActual > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
            {deudaActual > 0 ? 'Con Deuda Pendiente' : 'Al Día / Sin Deuda'}
          </span>
        </div>
      </div>

      {/* Selector de Modo (Registrar Pago vs Registrar Cargo) */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          onClick={() => setModo('pago')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            modo === 'pago' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowDownCircle className="w-4 h-4" /> Registrar Pago / Transferencia
        </button>
        <button
          type="button"
          onClick={() => setModo('cargo')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            modo === 'cargo' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowUpCircle className="w-4 h-4" /> Registrar Cargo / Deuda
        </button>
      </div>

      {/* Formulario de Pago */}
      {modo === 'pago' && (
        <form onSubmit={handlePagoSubmit} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
          <h3 className="font-bold text-xs uppercase text-emerald-700 tracking-wider border-b border-slate-200 pb-2">
            Abonar a la Cuenta
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Monto a Abonar ($) *</label>
              <input
                type="number"
                required
                min={1}
                placeholder="Ej: 25000"
                value={pagoForm.monto || ''}
                onChange={e => setPagoForm(p => ({ ...p, monto: Number(e.target.value) }))}
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Método de Pago</label>
              <select
                value={pagoForm.metodo}
                onChange={e => setPagoForm(p => ({ ...p, metodo: e.target.value }))}
                className={inputCls}
              >
                <option value="TRANSFERENCIA">Transferencia bancaria</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta de débito/crédito</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>N° Comprobante / Ref</label>
              <input
                type="text"
                placeholder="Ej: TR-892341"
                value={pagoForm.documento_ref}
                onChange={e => setPagoForm(p => ({ ...p, documento_ref: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Descripción / Detalle</label>
              <input
                type="text"
                placeholder="Ej: Pago mensualidad botellones"
                value={pagoForm.descripcion}
                onChange={e => setPagoForm(p => ({ ...p, descripcion: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm shadow-sm transition-colors"
          >
            Confirmar Abono / Pago
          </button>
        </form>
      )}

      {/* Formulario de Cargo */}
      {modo === 'cargo' && (
        <form onSubmit={handleCargoSubmit} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
          <h3 className="font-bold text-xs uppercase text-rose-700 tracking-wider border-b border-slate-200 pb-2">
            Sumar Cargo a la Cuenta
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Tipo de Movimiento</label>
              <select
                value={cargoForm.tipo}
                onChange={e => setCargoForm(p => ({ ...p, tipo: e.target.value }))}
                className={inputCls}
              >
                <option value="COMPRA_BOTELLON">Compra de Botellones / Soda</option>
                <option value="ARRIENDO_DISPENSADOR">Arriendo de Dispensador</option>
                <option value="AJUSTE_CREDITO">Ajuste de Saldo / Otro Cargo</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Monto del Cargo ($) *</label>
              <input
                type="number"
                required
                min={1}
                placeholder="Ej: 15000"
                value={cargoForm.monto || ''}
                onChange={e => setCargoForm(p => ({ ...p, monto: Number(e.target.value) }))}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>N° Factura / Boleta / Guía</label>
              <input
                type="text"
                placeholder="Ej: F-1092"
                value={cargoForm.documento_ref}
                onChange={e => setCargoForm(p => ({ ...p, documento_ref: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Descripción</label>
              <input
                type="text"
                placeholder="Ej: Arriendo mensualidad dispenser"
                value={cargoForm.descripcion}
                onChange={e => setCargoForm(p => ({ ...p, descripcion: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-sm shadow-sm transition-colors"
          >
            Confirmar Registro de Cargo
          </button>
        </form>
      )}

      {/* Historial Financiero */}
      <div className="space-y-3">
        <h3 className="font-bold text-xs uppercase text-slate-500 tracking-wider">Historial de Movimientos Cuenta Corriente</h3>

        {historial.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-2xl">
            No se han registrado movimientos financieros para este cliente.
          </p>
        ) : (
          <div className="space-y-2">
            {historial.map((h: any) => {
              const esAbono = h.tipo === 'PAGO_RECIBIDO';
              return (
                <div key={h.id} className="p-3.5 border border-slate-200 rounded-xl bg-white flex items-center justify-between text-xs shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg font-bold ${esAbono ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {esAbono ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900">{h.descripcion}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{new Date(h.fecha).toLocaleDateString('es-CL')}</span>
                        {h.documento_ref && <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">Ref: {h.documento_ref}</span>}
                      </div>
                    </div>
                  </div>

                  <span className={`font-black text-sm ${esAbono ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {esAbono ? '-' : '+'}${Number(h.monto || 0).toLocaleString('es-CL')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
