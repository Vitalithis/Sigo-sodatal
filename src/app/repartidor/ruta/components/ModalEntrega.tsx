"use client";

import { useState } from 'react';
import { actualizarParadaCompletaAction } from '@/app/admin/rutas/actions';
import { Minus, Plus, CheckCircle2, AlertTriangle, Package, RefreshCw, Banknote, CreditCard, Smartphone, FileText } from 'lucide-react';
import NuevaGuiaModal from '@/app/admin/guias/components/NuevaGuiaModal';

interface ModalEntregaProps {
  parada: any;
  usuarioId?: string;
  onClose: () => void;
  onAbrirIncidencia: () => void;
  onSuccess?: (cantidades: { bot20: number; bot10: number; soda: number }, guiaInfo?: any) => void;
}

export default function ModalEntrega({ parada, usuarioId, onClose, onAbrirIncidencia, onSuccess }: ModalEntregaProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pedido = parada.pedido;
  const cliente = parada.cliente;

  // Cantidades iniciales estimadas
  const initBot20 = () => {
    if (parada.bot20_entregado > 0) return parada.bot20_entregado;
    if (parada.bot20_esperado > 0) return parada.bot20_esperado;
    const it = pedido?.items?.find((i: any) => 
      i.producto?.categoria === 'BOTELLON20' || i.producto_id?.includes('20')
    );
    return it?.cantidad || 0;
  };

  const initBot10 = () => {
    if (parada.bot10_entregado > 0) return parada.bot10_entregado;
    if (parada.bot10_esperado > 0) return parada.bot10_esperado;
    const it = pedido?.items?.find((i: any) => 
      i.producto?.categoria === 'BOTELLON10' || i.producto_id?.includes('10')
    );
    return it?.cantidad || 0;
  };

  const initSoda = () => {
    if (parada.soda_entregada > 0) return parada.soda_entregada;
    if (parada.soda_esperada > 0) return parada.soda_esperada;
    const it = pedido?.items?.find((i: any) => 
      i.producto?.categoria === 'SODA' || i.producto_id?.includes('soda')
    );
    return it?.cantidad || 0;
  };

  const [cant20, setCant20] = useState<number>(initBot20);
  const [cant10, setCant10] = useState<number>(initBot10);
  const [cantSoda, setCantSoda] = useState<number>(initSoda);

  // Método de pago inicial con detección inteligente
  const initMetodoPago = () => {
    if (pedido?.metodo_pago_web) return pedido.metodo_pago_web;
    if (cliente?.modalidad_pago === 'MENSUAL') return 'GUIA_MENSUAL';
    return 'EFECTIVO';
  };
  const [metodoPago, setMetodoPago] = useState<string>(initMetodoPago);
  const [modalGuiaAbierto, setModalGuiaAbierto] = useState(false);
  const [guiaRegistrada, setGuiaRegistrada] = useState<any>(parada.pedido?.guia || null);

  async function handleConfirmarEntrega() {
    if (metodoPago === 'GUIA_MENSUAL' && !guiaRegistrada) {
      setModalGuiaAbierto(true);
      return;
    }

    setLoading(true);
    setError('');

    const cantidades = {
      bot20: Math.max(0, Number(cant20) || 0),
      bot10: Math.max(0, Number(cant10) || 0),
      soda: Math.max(0, Number(cantSoda) || 0),
    };

    const res = await actualizarParadaCompletaAction(parada.id, {
      estado: 'ENTREGADO',
      cantidades,
      metodo_pago: metodoPago,
    });
    
    if (res.success) {
      if (onSuccess) onSuccess(cantidades, guiaRegistrada);
      onClose();
    } else {
      setError(res.message || 'Ocurrió un error al confirmar la entrega.');
      setLoading(false);
    }
  }

  const totalUnidades = cant20 + cant10 + cantSoda;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-[#013299] to-blue-800 text-white p-4 flex justify-between items-start">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Confirmar Parada</span>
            <h2 className="text-base font-extrabold">{cliente?.nombre}</h2>
            <p className="text-xs text-blue-100/90 truncate max-w-xs">{cliente?.direccion}</p>
          </div>
          <button 
            onClick={onClose}
            className="bg-white/20 text-white hover:bg-white/30 rounded-full p-1.5 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Si tiene un pedido explícito */}
          {pedido && pedido.items?.length > 0 && (
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3">
              <p className="text-[11px] font-bold text-[#013299] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Pedido Registrado del Cliente
              </p>
              <div className="space-y-1.5">
                {pedido.items.map((it: any) => (
                  <div key={it.id} className="flex justify-between items-center text-xs font-semibold text-slate-800">
                    <span>{it.producto?.nombre}</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-blue-200 font-bold text-[#013299]">
                      x{it.cantidad} ({it.tipo_transaccion === 'RECARGA' ? 'Recarga' : 'Nuevo'})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ajuste de Cantidades Físicas Entregadas */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Cantidades Entregadas
              </label>
              <span className="text-[11px] text-slate-500 font-bold">Total: {totalUnidades} un.</span>
            </div>

            <div className="space-y-2">
              {/* Botellón 20L */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                <div>
                  <p className="text-xs font-bold text-slate-800">Botellón 20L</p>
                  <p className="text-[10px] text-slate-400">Esperado: {parada.bot20_esperado || 0}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCant20(prev => Math.max(0, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 flex items-center justify-center font-bold active:scale-95"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={cant20}
                    onChange={e => setCant20(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 h-8 text-center text-sm font-black bg-white border border-slate-300 rounded-lg outline-none focus:border-[#013299]"
                  />
                  <button
                    type="button"
                    onClick={() => setCant20(prev => prev + 1)}
                    className="w-8 h-8 rounded-lg bg-[#013299] text-white flex items-center justify-center font-bold active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Botellón 10L */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                <div>
                  <p className="text-xs font-bold text-slate-800">Botellón 10L</p>
                  <p className="text-[10px] text-slate-400">Esperado: {parada.bot10_esperado || 0}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCant10(prev => Math.max(0, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 flex items-center justify-center font-bold active:scale-95"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={cant10}
                    onChange={e => setCant10(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 h-8 text-center text-sm font-black bg-white border border-slate-300 rounded-lg outline-none focus:border-[#013299]"
                  />
                  <button
                    type="button"
                    onClick={() => setCant10(prev => prev + 1)}
                    className="w-8 h-8 rounded-lg bg-[#013299] text-white flex items-center justify-center font-bold active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Soda */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                <div>
                  <p className="text-xs font-bold text-slate-800">Soda</p>
                  <p className="text-[10px] text-slate-400">Esperado: {parada.soda_esperada || 0}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCantSoda(prev => Math.max(0, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 flex items-center justify-center font-bold active:scale-95"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={cantSoda}
                    onChange={e => setCantSoda(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 h-8 text-center text-sm font-black bg-white border border-slate-300 rounded-lg outline-none focus:border-[#013299]"
                  />
                  <button
                    type="button"
                    onClick={() => setCantSoda(prev => prev + 1)}
                    className="w-8 h-8 rounded-lg bg-[#013299] text-white flex items-center justify-center font-bold active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recordatorio de Envases Vacíos */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-emerald-600 shrink-0" />
              Retorno de envases vacíos:
            </span>
            <span className="font-black text-emerald-800 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300">
              {cant20 + cant10} vacíos esperados
            </span>
          </div>

          {/* Método de Pago Recibido */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600" /> Método de Pago *
              </label>
              <span className="text-[10px] text-slate-500 font-bold">
                {metodoPago === 'GUIA_MENSUAL' ? '📄 Crédito Empresa' : '💰 Cobro en Mano'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMetodoPago('EFECTIVO')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                  metodoPago === 'EFECTIVO'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  metodoPago === 'EFECTIVO' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <span className="block leading-tight">Efectivo</span>
                  <span className="text-[10px] font-normal text-slate-400 block">En mano</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMetodoPago('TARJETA')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                  metodoPago === 'TARJETA'
                    ? 'bg-blue-50 border-blue-500 text-blue-950 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  metodoPago === 'TARJETA' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="block leading-tight">Tarjeta</span>
                  <span className="text-[10px] font-normal text-slate-400 block">POS Transbank</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMetodoPago('TRANSFERENCIA')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                  metodoPago === 'TRANSFERENCIA'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  metodoPago === 'TRANSFERENCIA' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <span className="block leading-tight">Transferencia</span>
                  <span className="text-[10px] font-normal text-slate-400 block">Bancaria</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMetodoPago('GUIA_MENSUAL');
                  setModalGuiaAbierto(true);
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                  metodoPago === 'GUIA_MENSUAL'
                    ? 'bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  metodoPago === 'GUIA_MENSUAL' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="block leading-tight">Guía / Crédito</span>
                  <span className="text-[10px] font-normal text-slate-400 block">Mensual</span>
                </div>
              </button>
            </div>

            {metodoPago === 'GUIA_MENSUAL' ? (
              <div className="bg-purple-50/90 p-3 rounded-xl border border-purple-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-purple-700" />
                    {guiaRegistrada ? `Guía #${guiaRegistrada.numero_correlativo} Registrada` : 'Módulo de Guía de Despacho'}
                  </span>
                  {guiaRegistrada ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
                      ✔ Lista
                    </span>
                  ) : (
                    <span className="bg-purple-200 text-purple-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-purple-300">
                      Requerida
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-purple-700 leading-snug">
                  {guiaRegistrada 
                    ? `Se emitió la guía correlativa #${guiaRegistrada.numero_correlativo} para ${cliente?.nombre}. No cobras dinero en mano.`
                    : '📄 Crédito Empresa: No cobras dinero en mano. Haz clic abajo para ingresar los datos del receptor y registrar la guía oficial.'}
                </p>
                <button
                  type="button"
                  onClick={() => setModalGuiaAbierto(true)}
                  className="w-full py-2.5 px-3 bg-purple-700 hover:bg-purple-800 active:scale-[0.98] text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-purple-700/20"
                >
                  <FileText className="w-4 h-4" />
                  {guiaRegistrada ? `Ver / Modificar Guía #${guiaRegistrada.numero_correlativo}` : 'Abrir Módulo de Guía de Despacho'}
                </button>
              </div>
            ) : metodoPago === 'TARJETA' ? (
              <p className="text-[11px] text-blue-700 bg-blue-50 p-2.5 rounded-xl border border-blue-200 leading-snug">
                💳 <strong>Cobro con Tarjeta:</strong> Recuerda guardar el voucher del POS Transbank para rendirlo en el cierre.
              </p>
            ) : metodoPago === 'TRANSFERENCIA' ? (
              <p className="text-[11px] text-indigo-700 bg-indigo-50 p-2.5 rounded-xl border border-indigo-200 leading-snug">
                📱 <strong>Transferencia:</strong> Asegúrate de verificar el comprobante de transferencia bancaria antes de entregar.
              </p>
            ) : (
              <p className="text-[11px] text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 leading-snug">
                💵 <strong>Efectivo:</strong> Debes cobrar el dinero en efectivo para cuadrar tu caja personal al final del día.
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="p-4 border-t bg-gray-50 space-y-2.5">
          <button
            onClick={handleConfirmarEntrega}
            disabled={loading}
            className={`w-full active:scale-[0.98] text-white font-extrabold text-base py-3.5 rounded-xl shadow-md transition-all disabled:opacity-70 flex justify-center items-center gap-2 ${
              metodoPago === 'GUIA_MENSUAL' && !guiaRegistrada
                ? 'bg-purple-700 hover:bg-purple-800 shadow-purple-700/20'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
            }`}
          >
            {loading ? (
              <span className="animate-pulse">Guardando en Ruta...</span>
            ) : metodoPago === 'GUIA_MENSUAL' && !guiaRegistrada ? (
              <>
                <FileText className="w-5 h-5" />
                Hacer Guía de Despacho ({totalUnidades} un.)
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Confirmar Entrega ({totalUnidades} un. • {
                  metodoPago === 'EFECTIVO' ? 'Efectivo' :
                  metodoPago === 'TARJETA' ? 'Tarjeta' :
                  metodoPago === 'TRANSFERENCIA' ? 'Transfer.' : (guiaRegistrada ? `Guía #${guiaRegistrada.numero_correlativo}` : 'Guía Crédito')
                })
              </>
            )}
          </button>
          
          <button
            onClick={() => {
              onClose();
              onAbrirIncidencia();
            }}
            disabled={loading}
            className="w-full bg-white text-slate-700 border border-slate-200 font-bold text-xs py-2.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Reportar Problema / No Estaba
          </button>
        </div>

      </div>

      {/* Módulo de Guía de Despacho para el Repartidor */}
      {modalGuiaAbierto && (
        <NuevaGuiaModal
          isOpen={modalGuiaAbierto}
          onClose={() => setModalGuiaAbierto(false)}
          onSuccess={(resGuia) => {
            setModalGuiaAbierto(false);
            setGuiaRegistrada(resGuia);
            const cantidades = {
              bot20: Math.max(0, Number(cant20) || 0),
              bot10: Math.max(0, Number(cant10) || 0),
              soda: Math.max(0, Number(cantSoda) || 0),
            };
            if (onSuccess) onSuccess(cantidades, resGuia);
            onClose();
          }}
          initialData={{
            cliente: cliente,
            direccion_entrega: cliente?.direccion || '',
            usuario_repartidor_id: usuarioId || parada.ruta_dia?.usuario_id,
            metodo_pago: 'GUIA_MENSUAL',
            cantidades: {
              bot20: cant20,
              bot10: cant10,
              soda: cantSoda,
            },
            parada_id: parada.id,
            pedido_id: parada.pedido_id || undefined,
          }}
        />
      )}
    </div>
  );
}
