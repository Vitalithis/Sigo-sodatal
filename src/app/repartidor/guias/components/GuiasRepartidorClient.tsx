'use client';

import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Calendar, 
  MapPin, 
  Eye, 
  X, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Banknote, 
  CreditCard, 
  Smartphone, 
  FileCheck, 
  User, 
  Clock,
  ShieldCheck,
  Package
} from 'lucide-react';

interface GuiaItem {
  id: string;
  producto_id: string;
  tipo_transaccion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto: {
    nombre: string;
    categoria: string;
  };
}

interface Guia {
  id: string;
  numero_correlativo: number;
  fecha_emision: string | Date;
  cliente_id: string;
  direccion_entrega: string;
  estado: string;
  estado_documento: string | null;
  forma_pago: string | null;
  nombre_receptor: string | null;
  rut_receptor: string | null;
  hora_entrega: string | Date | null;
  observaciones: string | null;
  total: number;
  firma_digital: string | null;
  botellones_prestados_entrega: number;
  cliente: {
    nombre: string;
    rut_empresa?: string | null;
    telefono?: string | null;
    giro?: string | null;
    direccion: string;
  };
  items: GuiaItem[];
}

interface Props {
  guias: Guia[];
  nombreRepartidor: string;
}

export default function GuiasRepartidorClient({ guias, nombreRepartidor }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState<'TODAS' | 'HOY' | 'SEMANA' | 'MES'>('TODAS');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'VIGENTE' | 'ANULADA'>('TODOS');
  const [guiaSeleccionada, setGuiaSeleccionada] = useState<Guia | null>(null);

  // Fecha de referencia hoy
  const hoyStr = new Date().toISOString().split('T')[0];

  // Métricas
  const totalGuias = guias.length;
  const guiasHoy = guias.filter(g => new Date(g.fecha_emision).toISOString().split('T')[0] === hoyStr);
  const totalMontoVigente = guias
    .filter(g => g.estado_documento !== 'ANULADA')
    .reduce((acc, g) => acc + (g.total || 0), 0);
  const totalMontoHoy = guiasHoy
    .filter(g => g.estado_documento !== 'ANULADA')
    .reduce((acc, g) => acc + (g.total || 0), 0);

  // Filtrado
  const guiasFiltradas = useMemo(() => {
    return guias.filter((g) => {
      // Búsqueda por folio, cliente o dirección
      const folioStr = `#${g.numero_correlativo}`;
      const clienteStr = g.cliente?.nombre?.toLowerCase() || '';
      const dirStr = g.direccion_entrega?.toLowerCase() || '';
      const rutStr = g.cliente?.rut_empresa?.toLowerCase() || '';
      const q = busqueda.toLowerCase().trim();

      const matchesQuery = !q || folioStr.includes(q) || clienteStr.includes(q) || dirStr.includes(q) || rutStr.includes(q);

      // Filtro por Estado
      const esAnulada = g.estado_documento === 'ANULADA' || g.estado === 'ANULADA';
      if (filtroEstado === 'VIGENTE' && esAnulada) return false;
      if (filtroEstado === 'ANULADA' && !esAnulada) return false;

      // Filtro por Rango de Fecha
      const fechaGuia = new Date(g.fecha_emision);
      const diffDias = Math.floor((new Date().getTime() - fechaGuia.getTime()) / (1000 * 3600 * 24));

      if (filtroFecha === 'HOY') {
        const fechaGuiaStr = fechaGuia.toISOString().split('T')[0];
        if (fechaGuiaStr !== hoyStr) return false;
      } else if (filtroFecha === 'SEMANA') {
        if (diffDias > 7) return false;
      } else if (filtroFecha === 'MES') {
        if (diffDias > 30) return false;
      }

      return matchesQuery;
    });
  }, [guias, busqueda, filtroFecha, filtroEstado, hoyStr]);

  const imprimirComprobante = () => {
    window.print();
  };

  const getFormaPagoBadge = (forma: string | null) => {
    switch (forma) {
      case 'EFECTIVO':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-200">
            <Banknote className="w-3 h-3" /> Efectivo
          </span>
        );
      case 'TRANSFERENCIA':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-[#013299] text-[10px] font-black px-2 py-0.5 rounded-md border border-blue-200">
            <Smartphone className="w-3 h-3" /> Transferencia
          </span>
        );
      case 'TARJETA':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-purple-200">
            <CreditCard className="w-3 h-3" /> Tarjeta POS
          </span>
        );
      case 'GUIA_MENSUAL':
      case 'MENSUAL':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-200">
            <FileCheck className="w-3 h-3" /> Mensual / Crédito
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
            {forma || 'Efectivo'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Cabecera de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#013299]" />
            <span>Guías de Despacho</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Registro, comprobantes y consulta de guías emitidas por {nombreRepartidor}.
          </p>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Total Guías</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{totalGuias}</span>
          <span className="text-[11px] text-slate-500 font-medium">Registradas en sistema</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-black uppercase text-emerald-600 block tracking-wider">Emitidas Hoy</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{guiasHoy.length}</span>
          <span className="text-[11px] text-emerald-700 font-semibold">Jornada actual</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-black uppercase text-[#013299] block tracking-wider">Total Hoy ($)</span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block truncate">
            ${totalMontoHoy.toLocaleString('es-CL')}
          </span>
          <span className="text-[11px] text-blue-700 font-semibold">Despachado hoy</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-black uppercase text-amber-600 block tracking-wider">Total Histórico</span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block truncate">
            ${totalMontoVigente.toLocaleString('es-CL')}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">Vigente total</span>
        </div>
      </div>

      {/* Filtros y Buscador */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Input de Búsqueda */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por folio (#00123), cliente, RUT o dirección..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299]"
            />
          </div>

          {/* Filtros de Rango de Fecha */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['HOY', 'SEMANA', 'MES', 'TODAS'] as const).map((rango) => (
              <button
                key={rango}
                onClick={() => setFiltroFecha(rango)}
                className={`text-xs font-bold px-3 py-2 rounded-xl transition-all ${
                  filtroFecha === rango
                    ? 'bg-[#013299] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {rango === 'HOY' ? 'Hoy' : rango === 'SEMANA' ? '7 Días' : rango === 'MES' ? '30 Días' : 'Todas'}
              </button>
            ))}

            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

            {/* Filtros de Estado */}
            {(['TODOS', 'VIGENTE', 'ANULADA'] as const).map((est) => (
              <button
                key={est}
                onClick={() => setFiltroEstado(est)}
                className={`text-xs font-bold px-3 py-2 rounded-xl transition-all ${
                  filtroEstado === est
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {est === 'TODOS' ? 'Todos' : est === 'VIGENTE' ? 'Vigentes' : 'Anuladas'}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Contenido: Cards en móvil, Tabla/Cards en PC */}
      {guiasFiltradas.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-sm">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-black text-slate-800 text-base">No se encontraron guías de despacho</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No hay guías que coincidan con los criterios de búsqueda o filtros seleccionados.
          </p>
        </div>
      ) : (
        <>
          {/* Vista móvil: Cards táctiles */}
          <div className="space-y-3 md:hidden">
            {guiasFiltradas.map((guia) => {
              const esAnulada = guia.estado_documento === 'ANULADA' || guia.estado === 'ANULADA';
              const fechaStr = new Date(guia.fecha_emision).toLocaleDateString('es-CL', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={guia.id}
                  onClick={() => setGuiaSeleccionada(guia)}
                  className={`bg-white p-4 rounded-2xl border shadow-sm active:scale-[0.99] transition-all cursor-pointer ${
                    esAnulada ? 'border-rose-200 bg-rose-50/20 opacity-80' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#013299] text-white text-xs font-black px-2.5 py-0.5 rounded-lg">
                        GD-#{guia.numero_correlativo}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {fechaStr}
                      </span>
                    </div>

                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      esAnulada ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {esAnulada ? 'Anulada' : 'Vigente'}
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-1">
                    <h3 className="font-extrabold text-slate-900 text-sm">{guia.cliente?.nombre}</h3>
                    <p className="text-xs text-slate-600 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{guia.direccion_entrega}</span>
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      {getFormaPagoBadge(guia.forma_pago)}
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-slate-900 block">
                        ${(guia.total || 0).toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vista escritorio: Tabla moderna */}
          <div className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Folio</th>
                    <th className="py-3.5 px-4">Fecha y Hora</th>
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">Dirección</th>
                    <th className="py-3.5 px-4">Items</th>
                    <th className="py-3.5 px-4">Forma Pago</th>
                    <th className="py-3.5 px-4 text-right">Total ($)</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {guiasFiltradas.map((guia) => {
                    const esAnulada = guia.estado_documento === 'ANULADA' || guia.estado === 'ANULADA';
                    const fechaStr = new Date(guia.fecha_emision).toLocaleDateString('es-CL', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    const totalItems = guia.items?.reduce((acc, it) => acc + it.cantidad, 0) || 0;

                    return (
                      <tr 
                        key={guia.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          esAnulada ? 'bg-rose-50/20 text-slate-400' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-black text-[#013299]">
                          #{guia.numero_correlativo}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                          {fechaStr}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 max-w-[200px] truncate">
                          {guia.cliente?.nombre}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-[220px] truncate">
                          {guia.direccion_entrega}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {totalItems} un.
                        </td>
                        <td className="py-3 px-4">
                          {getFormaPagoBadge(guia.forma_pago)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          ${(guia.total || 0).toLocaleString('es-CL')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            esAnulada ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {esAnulada ? 'Anulada' : 'Vigente'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setGuiaSeleccionada(guia)}
                            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-[#013299] hover:text-white text-slate-800 font-bold px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Comprobante Completo de la Guía */}
      {guiaSeleccionada && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header Modal */}
            <div className="p-4 sm:p-5 bg-[#013299] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider">
                  Documento Tributario / Despacho
                </span>
                <h3 className="text-lg font-black mt-0.5">
                  Guía de Despacho N° {guiaSeleccionada.numero_correlativo}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={imprimirComprobante}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  title="Imprimir Comprobante"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setGuiaSeleccionada(null)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body: Comprobante Imprimible */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-slate-800" id="comprobante-guia">
              
              {/* Encabezado SODATAL */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-base font-black text-[#013299] tracking-tight">SODATAL LTDA.</h2>
                  <p className="text-[11px] text-slate-500 font-medium">Distribución de Agua Purificada y Bebidas</p>
                  <p className="text-[11px] text-slate-500 font-medium">Talagante, Región Metropolitana</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-slate-900 block">
                    GD-#{guiaSeleccionada.numero_correlativo}
                  </span>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    {new Date(guiaSeleccionada.fecha_emision).toLocaleDateString('es-CL', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Datos del Cliente y Despacho */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Cliente:</span>
                  <span className="font-extrabold text-slate-900">{guiaSeleccionada.cliente?.nombre}</span>
                </div>
                {guiaSeleccionada.cliente?.rut_empresa && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">RUT:</span>
                    <span className="font-bold text-slate-800">{guiaSeleccionada.cliente.rut_empresa}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Dirección de Entrega:</span>
                  <span className="font-medium text-slate-800 text-right max-w-[240px]">
                    {guiaSeleccionada.direccion_entrega}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Repartidor:</span>
                  <span className="font-bold text-slate-800">{nombreRepartidor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Forma de Pago:</span>
                  <span>{getFormaPagoBadge(guiaSeleccionada.forma_pago)}</span>
                </div>
              </div>

              {/* Tabla de Productos / Items */}
              <div>
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                  Detalle de Productos Entregados
                </h4>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2 px-3">Producto</th>
                        <th className="py-2 px-2 text-center">Tipo</th>
                        <th className="py-2 px-2 text-center">Cant.</th>
                        <th className="py-2 px-3 text-right">P. Unit</th>
                        <th className="py-2 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {guiaSeleccionada.items?.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">Sin items especificados</td>
                        </tr>
                      ) : (
                        guiaSeleccionada.items?.map((it) => (
                          <tr key={it.id}>
                            <td className="py-2 px-3 font-bold text-slate-900">{it.producto?.nombre}</td>
                            <td className="py-2 px-2 text-center text-[10px] uppercase font-bold text-slate-500">
                              {it.tipo_transaccion}
                            </td>
                            <td className="py-2 px-2 text-center font-black text-slate-900">{it.cantidad}</td>
                            <td className="py-2 px-3 text-right font-medium text-slate-600">
                              ${it.precio_unitario.toLocaleString('es-CL')}
                            </td>
                            <td className="py-2 px-3 text-right font-black text-slate-900">
                              ${it.subtotal.toLocaleString('es-CL')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botellones prestados / Envases */}
              {guiaSeleccionada.botellones_prestados_entrega > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs flex justify-between items-center text-blue-900">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-[#013299]" /> Envases Retornables Prestados:
                  </span>
                  <span className="font-black text-sm">
                    {guiaSeleccionada.botellones_prestados_entrega} unidades
                  </span>
                </div>
              )}

              {/* Total y Resumen Financiero */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                    Total a Cobrar / Despachado
                  </span>
                  <span className="text-xs text-blue-200">IVA incluido</span>
                </div>
                <span className="text-2xl font-black text-amber-400">
                  ${(guiaSeleccionada.total || 0).toLocaleString('es-CL')}
                </span>
              </div>

              {/* Receptor y Firma */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Constancia de Recepción
                </span>
                
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Receptor:</span>
                    <span className="font-bold">{guiaSeleccionada.nombre_receptor || 'No especificado'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">RUT Receptor:</span>
                    <span className="font-bold">{guiaSeleccionada.rut_receptor || 'No especificado'}</span>
                  </div>
                </div>

                {guiaSeleccionada.firma_digital ? (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-400 block text-[11px] mb-1">Firma Digital del Receptor:</span>
                    <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 flex items-center justify-center">
                      <img 
                        src={guiaSeleccionada.firma_digital} 
                        alt="Firma del receptor" 
                        className="max-h-24 max-w-full object-contain"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic pt-1">Sin firma digital registrada.</p>
                )}
              </div>

              {/* Observaciones */}
              {guiaSeleccionada.observaciones && (
                <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600">
                  <span className="font-bold text-slate-800 block mb-0.5">Observaciones:</span>
                  <p>{guiaSeleccionada.observaciones}</p>
                </div>
              )}

            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <button
                onClick={imprimirComprobante}
                className="flex items-center gap-1.5 bg-[#013299] text-white hover:bg-blue-800 text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / PDF</span>
              </button>

              <button
                onClick={() => setGuiaSeleccionada(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
