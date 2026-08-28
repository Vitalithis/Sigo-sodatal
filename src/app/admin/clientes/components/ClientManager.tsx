'use client';
import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TipoCliente, PreferenciaFacturacion, Cliente } from '@/lib/prisma/generated';
import { crearClienteAction, editarClienteAction, eliminarClienteAction, ClienteInput } from '../actions';
import { Search, Plus, Edit2, Trash2, Settings, AlertTriangle, X } from 'lucide-react';
import { usePopup } from './hooks/usePopup';
import PopupGlobal from './PopupGlobal';
import FichaTecnica from './FichaTecnica';

const inputCls = 'w-full border border-slate-200 p-2 rounded-lg text-sm text-slate-800 bg-white outline-none focus:ring-2 focus:ring-[#013299]/30 focus:border-[#013299] transition-colors placeholder:text-slate-400';
const labelCls  = 'text-xs font-bold text-slate-600 uppercase tracking-wide';

export default function ClientManager({ initialClientes }: { initialClientes: any[] }) {
  const router = useRouter();
  const { popup, showSuccess, showError, showConfirm, close } = usePopup();

  const [clientes, setClientes] = useState<any[]>(initialClientes);
  const [busqueda, setBusqueda]       = useState('');
  const [filtroTipo, setFiltroTipo]   = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null);

  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [isPending, startTransition]          = useTransition();
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null);
  const [errorForm, setErrorForm]             = useState<string | null>(null);
  const [formData, setFormData] = useState<ClienteInput>({
    nombre: '', tipo: TipoCliente.DOMICILIO, direccion: '', telefono: '', email: '',
    rut_empresa: '', giro: '', preferencia_factura: PreferenciaFacturacion.BOLETA,
    notas: '', activo: true, botellones_prestados: 0,
  });

  // Sincronización inteligente con el servidor
  useEffect(() => {
    setClientes(prev => initialClientes.map(incoming => {
      const local = prev.find(c => c.id === incoming.id);
      if (!local) return incoming;
      const dispensadoresCombinados = (incoming.dispensadores || []).map((incDisp: any) => {
        const localDisp = local.dispensadores?.find((ld: any) => ld.id === incDisp.id);
        if (localDisp && localDisp.estado !== incDisp.estado && incDisp.estado === 'EN_CLIENTE') return { ...incDisp, estado: localDisp.estado };
        return incDisp;
      });
      return { ...incoming, dispensadores: dispensadoresCombinados, mantenciones: (incoming.mantenciones?.length || 0) >= (local.mantenciones?.length || 0) ? incoming.mantenciones : local.mantenciones, movimientosFinancieros: (incoming.movimientosFinancieros?.length || 0) >= (local.movimientosFinancieros?.length || 0) ? incoming.movimientosFinancieros : local.movimientosFinancieros, incidencias: incoming.incidencias || local.incidencias || [] };
    }));
  }, [initialClientes]);

  // Mantiene clienteSeleccionado sincronizado con cambios en clientes
  useEffect(() => {
    if (clienteSeleccionado) {
      const actualizado = clientes.find(c => c.id === clienteSeleccionado.id);
      if (actualizado) setClienteSeleccionado(actualizado);
    }
  }, [clientes]);

  const handleClienteUpdate = (updater: (prev: any[]) => any[]) => setClientes(updater);

  const clientesFiltrados = clientes.filter(c => {
    const q = busqueda.toLowerCase();
    const matchBusqueda = (c.nombre || '').toLowerCase().includes(q) || (c.rut_empresa || '').toLowerCase().includes(q) || (c.telefono || '').includes(q);
    const matchTipo   = filtroTipo   === 'TODOS' || c.tipo === filtroTipo;
    const matchEstado = filtroEstado === 'TODOS' || (filtroEstado === 'ACTIVOS' && c.activo) || (filtroEstado === 'INACTIVOS' && !c.activo);
    return matchBusqueda && matchTipo && matchEstado;
  });

  const handleOpenCreate = () => {
    setEditingClienteId(null); setErrorForm(null);
    setFormData({ nombre: '', tipo: TipoCliente.DOMICILIO, direccion: '', telefono: '', email: '', rut_empresa: '', giro: '', preferencia_factura: PreferenciaFacturacion.BOLETA, notas: '', activo: true, botellones_prestados: 0 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Cliente) => {
    setEditingClienteId(c.id); setErrorForm(null);
    setFormData({ nombre: c.nombre, tipo: c.tipo, direccion: c.direccion, telefono: c.telefono, email: c.email || '', rut_empresa: c.rut_empresa || '', giro: c.giro || '', preferencia_factura: c.preferencia_factura, notas: c.notas || '', activo: c.activo, botellones_prestados: c.botellones_prestados });
    setIsModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : name === 'botellones_prestados' ? parseInt(value, 10) || 0 : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.tipo === TipoCliente.EMPRESA && !formData.rut_empresa) { setErrorForm('El RUT de la empresa es obligatorio.'); return; }
    startTransition(async () => {
      const res = editingClienteId ? await editarClienteAction(editingClienteId, formData) : await crearClienteAction(formData);
      if (res.success) { setIsModalOpen(false); router.refresh(); showSuccess('Operación Exitosa', 'Los datos del cliente han sido guardados.'); }
      else { setErrorForm(res.message || 'Error inesperado.'); }
    });
  };

  const handleEliminar = (id: string) => {
    showConfirm('¿Eliminar Cliente?', 'Esta acción es irreversible.', async () => {
      const res = await eliminarClienteAction(id);
      if (res.success) { router.refresh(); showSuccess('Removido', 'El cliente fue eliminado.'); }
      else { showError('Error', res.message || 'No se pudo eliminar.'); }
    });
  };

  return (
    <div className="space-y-5">
      <PopupGlobal popup={popup} onClose={close} />

      {/* Barra de filtros + botón crear */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#013299]/20 focus-within:border-[#013299] transition-colors">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input type="text" placeholder="Buscar por nombre, RUT empresa o teléfono..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="text-sm text-slate-800 placeholder:text-slate-400 outline-none w-full bg-transparent" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium bg-white outline-none">
            <option value="TODOS">Todos los Tipos</option>
            <option value="DOMICILIO">Domicilio</option>
            <option value="EMPRESA">Empresa</option>
          </select>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium bg-white outline-none">
            <option value="TODOS">Todos los Estados</option>
            <option value="ACTIVOS">Solo Activos</option>
            <option value="INACTIVOS">Solo Inactivos</option>
          </select>
          <button onClick={handleOpenCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: '#013299' }}>
            <Plus className="h-4 w-4" /> Registrar Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr style={{ backgroundColor: '#013299' }}>
                {['Cliente', 'Tipo', 'Dirección y Contacto', 'Preferencia Factura', 'Envases Prestados', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="py-3 px-5 text-left text-xs font-bold text-white uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientesFiltrados.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">No se encontraron registros.</td></tr>
              ) : clientesFiltrados.map(c => (
                <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-slate-900">{c.nombre}</div>
                    {c.rut_empresa && <div className="text-xs text-slate-400 mt-0.5">RUT: {c.rut_empresa}</div>}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${c.tipo === 'EMPRESA' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>{c.tipo}</span>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="text-slate-700 max-w-xs truncate text-sm">{c.direccion}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{c.telefono}</div>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-medium">{c.preferencia_factura}</span>
                  </td>
                  <td className="py-3.5 px-5 text-center font-bold text-slate-800">{c.botellones_prestados || 0}</td>
                  <td className="py-3.5 px-5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{c.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setClienteSeleccionado(c)} className="flex items-center gap-1.5 text-white text-xs font-bold px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#013299' }}>
                        <Settings className="h-3.5 w-3.5" /> Gestionar
                      </button>
                      <button onClick={() => handleOpenEdit(c)} className="text-slate-500 hover:text-[#013299] p-1.5 rounded-lg hover:bg-blue-50 transition-colors"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => handleEliminar(c.id)} className="text-slate-500 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center" style={{ backgroundColor: '#013299' }}>
              <h2 className="text-base font-bold text-white">{editingClienteId ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              {errorForm && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />{errorForm}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className={labelCls}>Nombre / Razón Social *</label>
                  <input type="text" name="nombre" required value={formData.nombre} onChange={handleChange} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Tipo Cliente</label>
                  <select name="tipo" value={formData.tipo} onChange={handleChange} className={inputCls}>
                    <option value={TipoCliente.DOMICILIO}>Domicilio</option>
                    <option value={TipoCliente.EMPRESA}>Empresa</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Teléfono *</label>
                  <input type="text" name="telefono" required placeholder="+569..." value={formData.telefono} onChange={handleChange} className={inputCls} />
                </div>
              </div>
              {formData.tipo === TipoCliente.EMPRESA && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-purple-800 uppercase tracking-wide">RUT Empresa *</label>
                    <input type="text" name="rut_empresa" value={formData.rut_empresa || ''} onChange={handleChange} className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-purple-800 uppercase tracking-wide">Giro Comercial</label>
                    <input type="text" name="giro" value={formData.giro || ''} onChange={handleChange} className={inputCls} />
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Dirección de Despacho *</label>
                <input type="text" name="direccion" required value={formData.direccion} onChange={handleChange} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Correo Electrónico</label>
                  <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Preferencia Tributaria</label>
                  <select name="preferencia_factura" value={formData.preferencia_factura} onChange={handleChange} className={inputCls}>
                    <option value={PreferenciaFacturacion.BOLETA}>Boleta</option>
                    <option value={PreferenciaFacturacion.FACTURA}>Factura</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 font-medium">Cancelar</button>
                <button type="submit" disabled={isPending} className="text-white px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-60" style={{ backgroundColor: '#013299' }}>
                  {isPending ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ficha Técnica lateral */}
      {clienteSeleccionado && (
        <FichaTecnica
          cliente={clienteSeleccionado}
          onClose={() => setClienteSeleccionado(null)}
          onClienteUpdate={handleClienteUpdate}
          showSuccess={showSuccess}
          showError={showError}
          showConfirm={showConfirm}
        />
      )}
    </div>
  );
}