'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  Hash,
  Calendar,
  DollarSign,
  User,
  CreditCard,
  FileCheck
} from 'lucide-react';

interface ComprobanteFormProps {
  comprobante: any;
  clientes: Array<{ id: string; nombre: string; rut_empresa?: string | null }>;
  onConciliar: (datos: any) => Promise<void>;
  onRechazar: (motivo: string) => Promise<void>;
}

export default function ComprobanteForm({
  comprobante,
  clientes,
  onConciliar,
  onRechazar
}: ComprobanteFormProps) {
  const [monto, setMonto] = useState<number>(comprobante?.monto || 0);
  const [numOperacion, setNumOperacion] = useState<string>(comprobante?.num_operacion || '');
  const [bancoOrigen, setBancoOrigen] = useState<string>(comprobante?.banco_origen || '');
  const [rutEmisor, setRutEmisor] = useState<string>(comprobante?.rut_emisor || '');
  const [origenDoc, setOrigenDoc] = useState<string>(comprobante?.origen_documento || 'TRANSFERENCIA_BANCARIA');
  const [metodoPago, setMetodoPago] = useState<string>(comprobante?.metodo_pago || 'TRANSFERENCIA');
  const [fecha, setFecha] = useState<string>(
    comprobante?.fecha_transaccion ? new Date(comprobante.fecha_transaccion).toISOString().slice(0, 16) : ''
  );
  const [clienteId, setClienteId] = useState<string>(comprobante?.cliente_id || '');
  const [motivoRechazo, setMotivoRechazo] = useState<string>('');
  const [mostrarModalRechazo, setMostrarModalRechazo] = useState<boolean>(false);
  const [procesando, setProcesando] = useState<boolean>(false);

  useEffect(() => {
    if (comprobante) {
      setMonto(comprobante.monto || 0);
      setNumOperacion(comprobante.num_operacion || '');
      setBancoOrigen(comprobante.banco_origen || '');
      setRutEmisor(comprobante.rut_emisor || '');
      setOrigenDoc(comprobante.origen_documento || 'TRANSFERENCIA_BANCARIA');
      setMetodoPago(comprobante.metodo_pago || 'TRANSFERENCIA');
      setFecha(
        comprobante.fecha_transaccion
          ? new Date(comprobante.fecha_transaccion).toISOString().slice(0, 16)
          : ''
      );
      setClienteId(comprobante.cliente_id || '');
    }
  }, [comprobante]);

  if (!comprobante) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[480px] p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
        <FileCheck className="w-14 h-14 mb-3 text-slate-300 stroke-[1.2]" />
        <h3 className="font-semibold text-slate-700">Esperando comprobante</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Sube un archivo o selecciona uno de la lista para ver los datos extraídos automáticamente por la IA.
        </p>
      </div>
    );
  }

  const confianza = comprobante.confianza_ia ?? 1.0;
  const esConfianzaBaja = confianza < 0.7;
  const advertencias = comprobante.observaciones_ia ? comprobante.observaciones_ia.split(',') : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcesando(true);
    try {
      await onConciliar({
        monto,
        num_operacion: numOperacion,
        banco_origen: bancoOrigen,
        rut_emisor: rutEmisor,
        origen_documento: origenDoc,
        metodo_pago: metodoPago,
        fecha_transaccion: fecha ? new Date(fecha).toISOString() : null,
        cliente_id: clienteId || null
      });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full overflow-y-auto">
      {/* Alerta de Confianza de IA */}
      {esConfianzaBaja ? (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800 text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900">Bajo nivel de confianza ({Math.round(confianza * 100)}%)</span>
              <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-full uppercase">Revisión requerida</span>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              La imagen presenta sombras, ángulos difíciles o baja nitidez. Revisa detenidamente el monto y el número de operación antes de conciliar.
            </p>
            {advertencias.length > 0 && (
              <ul className="mt-2 list-disc list-inside text-xs text-amber-700 space-y-0.5">
                {advertencias.map((adv: string, idx: number) => (
                  <li key={idx}>{adv.trim()}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-4 px-3 py-2 bg-emerald-50 border border-emerald-200/70 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Extracción automática completada con alta nitidez
          </span>
          <span className="font-bold font-mono text-emerald-700">{Math.round(confianza * 100)}% certeza</span>
        </div>
      )}

      {/* Header del formulario */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
        <div>
          <span className="text-[11px] font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md uppercase tracking-wider">
            {origenDoc.replace('_', ' ')}
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1.5">Datos Extraídos del Comprobante</h2>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-400 font-medium block">Estado Actual</span>
          <span
            className={`font-bold text-xs px-2.5 py-1 rounded-full ${
              comprobante.estado === 'PENDIENTE'
                ? 'bg-amber-100 text-amber-800'
                : comprobante.estado === 'CONCILIADO'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {comprobante.estado}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-3.5">
          {/* Monto CLP */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Monto Transferido (CLP) *
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="number"
                required
                min={1}
                value={monto}
                onChange={(e) => setMonto(Number(e.target.value))}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Valor formateado: <span className="font-semibold text-slate-700">${monto.toLocaleString('es-CL')}</span>
            </p>
          </div>

          {/* N° Operación & Banco */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                N° Operación / Transacción *
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={numOperacion}
                  onChange={(e) => setNumOperacion(e.target.value)}
                  placeholder="Ej. 184920412"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Banco o Emisor
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={bancoOrigen}
                  onChange={(e) => setBancoOrigen(e.target.value)}
                  placeholder="Ej. BancoEstado"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* RUT Emisor & Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                RUT Emisor
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={rutEmisor}
                  onChange={(e) => setRutEmisor(e.target.value)}
                  placeholder="Ej. 12.345.678-9"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Fecha Transacción
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="datetime-local"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Método de Pago y Tipo de Origen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Método de Pago
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="TRANSFERENCIA">Transferencia Electrónica</option>
                  <option value="TARJETA">Tarjeta (POS Débito/Crédito)</option>
                  <option value="EFECTIVO">Depósito en Efectivo</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tipo de Comprobante
              </label>
              <select
                value={origenDoc}
                onChange={(e) => setOrigenDoc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="TRANSFERENCIA_BANCARIA">Transferencia Bancaria</option>
                <option value="VOUCHER_POS">Voucher POS / Transbank</option>
                <option value="DEPOSITO_VENTANILLA">Depósito Ventanilla</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
          </div>

          {/* Cliente Asociado */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Asociar a Cliente en Sistema
            </label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">-- No asociar aún (Revisar luego) --</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.rut_empresa ? `• RUT: ${c.rut_empresa}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="pt-4 border-t border-slate-100 flex items-center gap-3 mt-6">
          <button
            type="button"
            onClick={() => setMostrarModalRechazo(true)}
            disabled={procesando || comprobante.estado === 'RECHAZADO'}
            className="flex-1 py-3 px-4 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
          >
            <XCircle className="w-4 h-4" />
            Rechazar
          </button>

          <button
            type="submit"
            disabled={procesando || comprobante.estado === 'CONCILIADO'}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-40"
          >
            <CheckCircle2 className="w-4 h-4" />
            {procesando ? 'Procesando...' : comprobante.estado === 'CONCILIADO' ? 'Ya Conciliado' : 'Aprobar y Conciliar'}
          </button>
        </div>
      </form>

      {/* Modal de Rechazo */}
      {mostrarModalRechazo && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-base mb-1">Rechazar Comprobante</h3>
            <p className="text-xs text-slate-500 mb-4">
              Indica la razón por la cual este comprobante es rechazado (ej: monto incorrecto, transferencia no acreditada, voucher borroso).
            </p>
            <textarea
              required
              rows={3}
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Escribe el motivo del rechazo aquí..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setMostrarModalRechazo(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setProcesando(true);
                  try {
                    await onRechazar(motivoRechazo);
                    setMostrarModalRechazo(false);
                  } finally {
                    setProcesando(false);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
