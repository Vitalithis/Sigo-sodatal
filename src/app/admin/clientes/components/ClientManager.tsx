'use client';

import React, { useState, useTransition, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TipoCliente, PreferenciaFacturacion } from '@lib/prisma/generated';
import {
  crearClienteAction, 
  editarClienteAction,
  ClienteInput, 
  obtenerComunasConSectoresAction,
} from '../actions';
import { 
  Search, 
  Plus, 
  Edit2, 
  Settings, 
  AlertTriangle, 
  X, 
  Users, 
  DollarSign, 
  MapPin, 
  Building2, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  CheckCircle2,
  FolderTree,
  List,
  Printer
} from 'lucide-react';
import { usePopup } from '@/hooks/usePopup';
import PopupGlobal from '@/components/ui/PopupGlobal';
import FichaTecnica from './FichaTecnica';
import ModalImpresion from './ModalImpresion';

const inputCls = 'w-full border border-slate-200 p-2.5 rounded-xl text-xs text-slate-800 bg-white outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] transition-colors placeholder:text-slate-400 font-medium';
const labelCls = 'text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block';

type ComunaConSectores = {
  id: string;
  nombre: string;
  sectores: { id: string; nombre: string }[];
};

export default function ClientManager({ initialClientes }: { initialClientes: any[] }) {
  const router = useRouter();
  const { popup, showSuccess, showError, showConfirm, close } = usePopup();

  const [clientes, setClientes] = useState<any[]>(initialClientes);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null);

  // Filtros
  const [busqueda, setBusqueda]                 = useState('');
  const [filtroTipo, setFiltroTipo]             = useState('TODOS');
  const [filtroEstado, setFiltroEstado]         = useState('ACTIVOS');
  const [filtroFrecuencia, setFiltroFrecuencia] = useState('TODAS');
  const [filtroDeuda, setFiltroDeuda]           = useState('TODOS');
  const [filtroComuna, setFiltroComuna]         = useState('TODAS');
  const [filtroSector, setFiltroSector]         = useState('TODOS');

  // Modo de visualización: 'PLANA' (lista) o 'SECTOR' (agrupada)
  const [modoVista, setModoVista] = useState<'PLANA' | 'SECTOR'>('PLANA');

  // Paginación para vista plana
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(25);

  // Modales y formularios
  const [isModalOpen, setIsModalOpen]           = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTitle, setPrintTitle]             = useState('Reporte General de Clientes');
  const [isPending, startTransition]            = useTransition();
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null);
  const [errorForm, setErrorForm]               = useState<string | null>(null);

  // Estado comunas/sectores
  const [comunas, setComunas]                       = useState<ComunaConSectores[]>([]);
  const [comunaSeleccionada, setComunaSeleccionada] = useState<string>('');

  const [formData, setFormData] = useState<ClienteInput>({
    nombre: '', tipo: TipoCliente.DOMICILIO, direccion: '', telefono: '',
    email: '', rut_empresa: '', giro: '',
    preferencia_factura: PreferenciaFacturacion.BOLETA,
    notas: '', activo: true, botellones_prestados: 0,
    sector_id: null,
    frecuencia: 'SEMANAL' as any,
    deuda: 0,
  });

  // Cargar comunas y sectores al iniciar
  useEffect(() => {
    obtenerComunasConSectoresAction().then(res => {
      if (res.success) setComunas(res.comunas || []);
    });
  }, []);

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
      return {
        ...incoming,
        dispensadores: dispensadoresCombinados,
        mantenciones: (incoming.mantenciones?.length || 0) >= (local.mantenciones?.length || 0) ? incoming.mantenciones : local.mantenciones,
        movimientosFinancieros: (incoming.movimientosFinancieros?.length || 0) >= (local.movimientosFinancieros?.length || 0) ? incoming.movimientosFinancieros : local.movimientosFinancieros,
        incidencias: incoming.incidencias || local.incidencias || [],
      };
    }));
  }, [initialClientes]);

  // Resetear página al cambiar filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroTipo, filtroEstado, filtroFrecuencia, filtroDeuda, filtroComuna, filtroSector, itemsPorPagina]);

  // Mantiene clienteSeleccionado sincronizado
  useEffect(() => {
    if (clienteSeleccionado) {
      const actualizado = clientes.find(c => c.id === clienteSeleccionado.id);
      if (actualizado) setClienteSeleccionado(actualizado);
    }
  }, [clientes]);

  const handleClienteUpdate = (updater: (prev: any[]) => any[]) => setClientes(updater);

  // Lista filtrada global
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(c => {
      const q = busqueda.toLowerCase().trim();
      const matchBusqueda = !q || 
        (c.nombre || '').toLowerCase().includes(q) ||
        (c.direccion || '').toLowerCase().includes(q) || 
        (c.rut_empresa || '').toLowerCase().includes(q) || 
        (c.telefono || '').includes(q);

      const matchTipo       = filtroTipo === 'TODOS' || c.tipo === filtroTipo;
      const matchEstado     = filtroEstado === 'TODOS' || (filtroEstado === 'ACTIVOS' && c.activo) || (filtroEstado === 'INACTIVOS' && !c.activo);
      const matchFrecuencia = filtroFrecuencia === 'TODAS' || c.frecuencia === filtroFrecuencia;
      
      const matchDeuda = filtroDeuda === 'TODOS' ? true :
        filtroDeuda === 'CON_DEUDA' ? (c.deuda || 0) > 0 :
        (c.deuda || 0) <= 0;

      const matchComuna = filtroComuna === 'TODAS' ? true :
        filtroComuna === 'SIN_COMUNA' ? !c.sector?.comuna?.id :
        c.sector?.comuna?.id === filtroComuna;

      const matchSector = filtroSector === 'TODOS' ? true :
        filtroSector === 'SIN_SECTOR' ? !c.sector_id :
        c.sector_id === filtroSector;

      return matchBusqueda && matchTipo && matchEstado && matchFrecuencia && matchDeuda && matchComuna && matchSector;
    });
  }, [clientes, busqueda, filtroTipo, filtroEstado, filtroFrecuencia, filtroDeuda, filtroComuna, filtroSector]);

  // Clientes paginados para vista plana
  const totalPaginas = Math.ceil(clientesFiltrados.length / itemsPorPagina) || 1;
  const clientesPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina;
    return clientesFiltrados.slice(inicio, inicio + itemsPorPagina);
  }, [clientesFiltrados, paginaActual, itemsPorPagina]);

  // Agrupación por Sector para la vista 'SECTOR'
  const clientesAgrupadosPorSector = useMemo(() => {
    const grupos: Record<string, { sectorNombre: string; comunaNombre: string; lista: any[] }> = {};
    
    clientesFiltrados.forEach(c => {
      const sectorKey = c.sector_id || 'SIN_SECTOR';
      const sectorNombre = c.sector?.nombre || 'Sin Sector Asignado';
      const comunaNombre = c.sector?.comuna?.nombre || 'Sin Comuna';

      if (!grupos[sectorKey]) {
        grupos[sectorKey] = { sectorNombre, comunaNombre, lista: [] };
      }
      grupos[sectorKey].lista.push(c);
    });

    return Object.values(grupos).sort((a, b) => a.comunaNombre.localeCompare(b.comunaNombre) || a.sectorNombre.localeCompare(b.sectorNombre));
  }, [clientesFiltrados]);

  // Métricas rápidas
  const totalClientesCount = clientes.length;
  const activosCount = useMemo(() => clientes.filter(c => c.activo).length, [clientes]);
  const clientesConDeudaCount = useMemo(() => clientes.filter(c => (c.deuda || 0) > 0).length, [clientes]);
  const montoDeudaTotal = useMemo(() => clientes.reduce((acc, c) => acc + (c.deuda || 0), 0), [clientes]);

  // Sectores disponibles según la comuna filtrada en el formulario
  const sectoresFormulario = comunas.find(c => c.id === comunaSeleccionada)?.sectores ?? [];
  
  // Sectores disponibles para el filtro superior
  const sectoresFiltroSuperior = useMemo(() => {
    if (filtroComuna === 'TODAS' || filtroComuna === 'SIN_COMUNA') {
      return comunas.flatMap(c => c.sectores);
    }
    return comunas.find(c => c.id === filtroComuna)?.sectores ?? [];
  }, [comunas, filtroComuna]);

  const handleOpenCreate = async () => {
    setEditingClienteId(null);
    setErrorForm(null);
    setFormData({
      nombre: '', tipo: TipoCliente.DOMICILIO, direccion: '', telefono: '',
      email: '', rut_empresa: '', giro: '',
      preferencia_factura: PreferenciaFacturacion.BOLETA,
      notas: '', activo: true, botellones_prestados: 0,
      sector_id: null,
      frecuencia: 'SEMANAL' as any,
      deuda: 0,
    });
    setComunaSeleccionada('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (c: any) => {
    setEditingClienteId(c.id);
    setErrorForm(null);
    setFormData({
      nombre: c.nombre, tipo: c.tipo, direccion: c.direccion,
      telefono: c.telefono, email: c.email || '',
      rut_empresa: c.rut_empresa || '', giro: c.giro || '',
      preferencia_factura: c.preferencia_factura,
      notas: c.notas || '', activo: c.activo,
      botellones_prestados: c.botellones_prestados,
      sector_id: c.sector_id || null,
      frecuencia: c.frecuencia || 'SEMANAL',
      deuda: c.deuda || 0,
    });

    if (c.sector_id) {
      const comunaDelSector = comunas.find(com => com.sectores.some(s => s.id === c.sector_id));
      setComunaSeleccionada(comunaDelSector?.id || '');
    } else {
      setComunaSeleccionada('');
    }

    setIsModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : name === 'botellones_prestados'
          ? parseInt(value, 10) || 0
          : value === ''
            ? null
            : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.tipo === TipoCliente.EMPRESA && !formData.rut_empresa) {
      setErrorForm('El RUT de la empresa es obligatorio.');
      return;
    }
    startTransition(async () => {
      const res = editingClienteId
        ? await editarClienteAction(editingClienteId, formData)
        : await crearClienteAction(formData);
      if (res.success) {
        setIsModalOpen(false);
        showSuccess('Operación Exitosa', 'Los datos del cliente han sido guardados.');
      } else {
        setErrorForm(res.message || 'Error inesperado.');
      }
    });
  };

  const handleDeshabilitar = (c: any) => {
    const nuevoEstado = !c.activo;
    const mensajeAccion = nuevoEstado ? '¿Deseas activar este cliente?' : '¿Deseas deshabilitar este cliente?';
    
    showConfirm(mensajeAccion, '', async () => {
      const payloadLimpiado = {
        nombre: c.nombre,
        tipo: c.tipo,
        direccion: c.direccion,
        telefono: c.telefono,
        email: c.email || '',
        rut_empresa: c.rut_empresa || '',
        giro: c.giro || '',
        preferencia_factura: c.preferencia_factura,
        notas: c.notas || '',
        activo: nuevoEstado,
        botellones_prestados: c.botellones_prestados || 0,
        sector_id: c.sector_id || null,
      };

      const res = await editarClienteAction(c.id, payloadLimpiado);

      if (res.success) {
        router.refresh(); 
        showSuccess('Actualizado', `El cliente fue ${nuevoEstado ? 'activado' : 'deshabilitado'} correctamente.`);
      } else {
        showError('Error', res.message || 'No se pudo actualizar el estado del cliente.');
      }
    });
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroTipo('TODOS');
    setFiltroEstado('TODOS');
    setFiltroFrecuencia('TODAS');
    setFiltroDeuda('TODOS');
    setFiltroComuna('TODAS');
    setFiltroSector('TODOS');
  };

  const hayFiltrosActivos = busqueda !== '' || filtroTipo !== 'TODOS' || filtroEstado !== 'TODOS' || filtroFrecuencia !== 'TODAS' || filtroDeuda !== 'TODOS' || filtroComuna !== 'TODAS' || filtroSector !== 'TODOS';

  const handleImprimirDeudores = () => {
    setFiltroDeuda('CON_DEUDA');
    setPrintTitle('Informe de Clientes Deudores Morosos');
    setIsPrintModalOpen(true);
  };

  const handleImprimirLista = () => {
    if (filtroDeuda === 'CON_DEUDA') {
      setPrintTitle('Informe de Clientes Deudores');
    } else if (filtroSector !== 'TODOS') {
      setPrintTitle('Reporte de Clientes por Sector');
    } else if (filtroComuna !== 'TODAS') {
      setPrintTitle('Reporte de Clientes por Comuna');
    } else {
      setPrintTitle('Reporte General de Clientes');
    }
    setIsPrintModalOpen(true);
  };

  const renderFrecuenciaBadge = (frecuencia: string) => {
    switch (frecuencia) {
      case 'QUINCENAL':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase">Quincenal</span>;
      case 'MENSUAL':
        return <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase">Mensual</span>;
      case 'A_PEDIDO':
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase">A Pedido</span>;
      default:
        return <span className="bg-blue-50 text-[#013299] border border-blue-200 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase">Semanal</span>;
    }
  };

  return (
    <div className="space-y-6">
      <PopupGlobal popup={popup} onClose={close} />

      {/* Tarjetas de Métricas de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Clientes</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalClientesCount.toLocaleString('es-CL')}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-[#013299]">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clientes Activos</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{activosCount.toLocaleString('es-CL')}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Con Deuda (#)</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{clientesConDeudaCount.toLocaleString('es-CL')}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deuda Acumulada</p>
            <p className="text-2xl font-black text-slate-900 mt-1">${montoDeudaTotal.toLocaleString('es-CL')}</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros de Multicriterio */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        
        {/* Fila 1: Búsqueda y Botones de Acción */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          <div className="flex items-center gap-2 flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#013299]/20 focus-within:border-[#013299] transition-all">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, dirección, RUT o teléfono..." 
              value={busqueda} 
              onChange={e => setBusqueda(e.target.value)} 
              className="text-xs text-slate-800 placeholder:text-slate-400 outline-none w-full bg-transparent font-medium" 
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botón para Imprimir Deudores Directo */}
            <button
              onClick={handleImprimirDeudores}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all shrink-0"
              title="Filtrar e imprimir reporte de clientes con deuda morosa"
            >
              <Printer className="w-4 h-4 text-amber-600" />
              Imprimir Deudores
            </button>

            {/* Botón para Imprimir Filtro Actual */}
            <button
              onClick={handleImprimirLista}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all shrink-0"
              title="Imprimir informe de los clientes en pantalla"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              Imprimir Lista
            </button>

            {/* Toggle de Modo de Vista */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
              <button
                onClick={() => setModoVista('PLANA')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  modoVista === 'PLANA' ? 'bg-white text-[#013299] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Vista en lista plana"
              >
                <List className="w-3.5 h-3.5" />
                Lista
              </button>
              <button
                onClick={() => setModoVista('SECTOR')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  modoVista === 'SECTOR' ? 'bg-white text-[#013299] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Agrupar por Sector Geográfico"
              >
                <FolderTree className="w-3.5 h-3.5" />
                Por Sector
              </button>
            </div>

            <button 
              onClick={handleOpenCreate} 
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md shadow-[#013299]/20 hover:bg-blue-900 transition-all shrink-0" 
              style={{ backgroundColor: '#013299' }}
            >
              <Plus className="h-4 w-4" /> Nuevo Cliente
            </button>
          </div>
        </div>

        {/* Fila 2: Selectores de Filtro por Comuna, Sector, Frecuencia, Deuda, Tipo y Estado */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider mr-1">
            <Filter className="w-3.5 h-3.5 text-[#013299]" />
            Filtros:
          </div>

          {/* Comuna */}
          <select 
            value={filtroComuna} 
            onChange={e => {
              setFiltroComuna(e.target.value);
              setFiltroSector('TODOS');
            }} 
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#013299]"
          >
            <option value="TODAS">Todas las Comunas</option>
            {comunas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            <option value="SIN_COMUNA">Sin Comuna</option>
          </select>

          {/* Sector */}
          <select 
            value={filtroSector} 
            onChange={e => setFiltroSector(e.target.value)} 
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#013299]"
          >
            <option value="TODOS">Todos los Sectores</option>
            {sectoresFiltroSuperior.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            <option value="SIN_SECTOR">Sin Sector</option>
          </select>

          {/* Frecuencia */}
          <select 
            value={filtroFrecuencia} 
            onChange={e => setFiltroFrecuencia(e.target.value)} 
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#013299]"
          >
            <option value="TODAS">Todas las Frecuencias</option>
            <option value="SEMANAL">Semanal</option>
            <option value="QUINCENAL">Quincenal</option>
            <option value="MENSUAL">Mensual</option>
            <option value="A_PEDIDO">A Pedido</option>
          </select>

          {/* Deuda */}
          <select 
            value={filtroDeuda} 
            onChange={e => setFiltroDeuda(e.target.value)} 
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#013299]"
          >
            <option value="TODOS">Todas las deudas</option>
            <option value="CON_DEUDA">Con Deuda Pendiente</option>
            <option value="AL_DIA">Al Día ($0)</option>
          </select>

          {/* Tipo */}
          <select 
            value={filtroTipo} 
            onChange={e => setFiltroTipo(e.target.value)} 
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#013299]"
          >
            <option value="TODOS">Todos los Tipos</option>
            <option value="DOMICILIO">Domicilio</option>
            <option value="EMPRESA">Empresa</option>
          </select>

          {/* Estado */}
          <select 
            value={filtroEstado} 
            onChange={e => setFiltroEstado(e.target.value)} 
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#013299]"
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="ACTIVOS">Solo Activos</option>
            <option value="INACTIVOS">Solo Inactivos</option>
          </select>

          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="px-2.5 py-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}
        </div>

      </div>

      {/* VISTA 1: LISTA PLANA (CON PAGINACIÓN) */}
      {modoVista === 'PLANA' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          
          {/* Controls bar table header */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Mostrando <strong className="text-slate-900">{clientesFiltrados.length > 0 ? (paginaActual - 1) * itemsPorPagina + 1 : 0}</strong> a <strong className="text-slate-900">{Math.min(paginaActual * itemsPorPagina, clientesFiltrados.length)}</strong> de <strong className="text-slate-900">{clientesFiltrados.length}</strong> clientes
            </span>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-400">Por página:</span>
              <select
                value={itemsPorPagina}
                onChange={e => setItemsPorPagina(Number(e.target.value))}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Dirección y Teléfono</th>
                  <th className="py-3.5 px-4">Comuna / Sector</th>
                  <th className="py-3.5 px-4">Frecuencia Visita</th>
                  <th className="py-3.5 px-4 text-right">Deuda Total</th>
                  <th className="py-3.5 px-4 text-center">Envases</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {clientesPaginados.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-sm">No se encontraron clientes</p>
                      <p className="text-xs text-slate-400 mt-0.5">Prueba ajustando los criterios de búsqueda</p>
                    </td>
                  </tr>
                ) : (
                  clientesPaginados.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{c.nombre}</div>
                        {c.rut_empresa && <div className="text-[11px] text-slate-400">RUT: {c.rut_empresa}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          c.tipo === 'EMPRESA' 
                            ? 'bg-purple-50 text-purple-700 border border-purple-100' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {c.tipo}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium max-w-xs truncate">{c.direccion}</div>
                        <div className="text-[11px] text-slate-400">{c.telefono}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {c.sector ? (
                          <div>
                            <div className="text-xs text-slate-800 font-semibold">{c.sector.comuna?.nombre}</div>
                            <div className="text-[11px] text-slate-400">{c.sector.nombre}</div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-300 italic">Sin sector</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {renderFrecuenciaBadge(c.frecuencia)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {(c.deuda || 0) > 0 ? (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md text-xs font-black">
                            ${Number(c.deuda).toLocaleString('es-CL')}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold text-xs">Al día ($0)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {c.botellones_prestados || 0}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          c.activo 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {c.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => setClienteSeleccionado(c)} 
                            className="flex items-center gap-1 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-sm" 
                            style={{ backgroundColor: '#013299' }}
                          >
                            <Settings className="h-3.5 w-3.5" /> Ficha
                          </button>
                          <button 
                            onClick={() => handleOpenEdit(c)} 
                            className="text-slate-400 hover:text-[#013299] p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Editar cliente"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeshabilitar(c)} 
                            title={c.activo ? 'Deshabilitar cliente' : 'Activar cliente'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              c.activo 
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' 
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginador */}
          {totalPaginas > 1 && (
            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Página <strong className="text-slate-800">{paginaActual}</strong> de <strong className="text-slate-800">{totalPaginas}</strong></span>
              <div className="flex items-center gap-2">
                <button
                  disabled={paginaActual === 1}
                  onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40 text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={paginaActual === totalPaginas}
                  onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40 text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* VISTA 2: AGRUPADA POR SECTOR Y COMUNA */}
      {modoVista === 'SECTOR' && (
        <div className="space-y-4">
          {clientesAgrupadosPorSector.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
              <FolderTree className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-sm">No hay clientes para agrupar por sector</p>
            </div>
          ) : (
            clientesAgrupadosPorSector.map(grupo => {
              const deudaGrupo = grupo.lista.reduce((acc, c) => acc + (c.deuda || 0), 0);
              return (
                <div key={`${grupo.comunaNombre}-${grupo.sectorNombre}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden space-y-0">
                  
                  {/* Sector Group Header */}
                  <div className="bg-slate-50/90 px-5 py-3.5 border-b border-slate-100 flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-blue-50 text-[#013299] rounded-lg">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{grupo.sectorNombre}</h3>
                        <p className="text-[11px] text-slate-400 font-medium">Comuna: {grupo.comunaNombre}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-slate-700">
                        {grupo.lista.length} clientes
                      </span>
                      {deudaGrupo > 0 && (
                        <span className="bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-1 rounded-lg font-bold">
                          Deuda total: ${deudaGrupo.toLocaleString('es-CL')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tabla del grupo */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {grupo.lista.map(c => (
                          <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900 w-1/4">
                              {c.nombre}
                              {c.rut_empresa && <div className="text-[10px] text-slate-400 font-normal">RUT: {c.rut_empresa}</div>}
                            </td>
                            <td className="py-3 px-4 text-slate-600 w-1/3">
                              <div className="truncate font-medium">{c.direccion}</div>
                              <div className="text-[10px] text-slate-400">{c.telefono}</div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {renderFrecuenciaBadge(c.frecuencia)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {(c.deuda || 0) > 0 ? (
                                <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                  ${Number(c.deuda).toLocaleString('es-CL')}
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-bold text-[10px]">Al día</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => setClienteSeleccionado(c)}
                                className="px-2.5 py-1 bg-[#013299] text-white font-bold rounded-lg text-[10px] hover:bg-blue-900 transition-colors"
                              >
                                Ficha
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal Crear/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 !m-0 !top-0 !left-0 !right-0 !bottom-0">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center text-white" style={{ backgroundColor: '#013299' }}>
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5" />
                <h2 className="text-base font-bold">{editingClienteId ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              {errorForm && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />{errorForm}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 col-span-2">
                  <label className={labelCls}>Nombre / Razón Social *</label>
                  <input type="text" name="nombre" required value={formData.nombre} onChange={handleChange} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Tipo Cliente</label>
                  <select name="tipo" value={formData.tipo} onChange={handleChange} className={inputCls}>
                    <option value={TipoCliente.DOMICILIO}>Domicilio</option>
                    <option value={TipoCliente.EMPRESA}>Empresa</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Teléfono *</label>
                  <input type="text" name="telefono" required placeholder="+569..." value={formData.telefono} onChange={handleChange} className={inputCls} />
                </div>
              </div>

              {formData.tipo === TipoCliente.EMPRESA && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50/70 rounded-xl border border-purple-100">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-purple-800 uppercase tracking-wide">RUT Empresa *</label>
                    <input type="text" name="rut_empresa" value={formData.rut_empresa || ''} onChange={handleChange} className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-purple-800 uppercase tracking-wide">Giro Comercial</label>
                    <input type="text" name="giro" value={formData.giro || ''} onChange={handleChange} className={inputCls} />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Dirección de Despacho *</label>
                <input type="text" name="direccion" required value={formData.direccion} onChange={handleChange} className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Comuna</label>
                  <select
                    value={comunaSeleccionada}
                    onChange={e => {
                      setComunaSeleccionada(e.target.value);
                      setFormData(prev => ({ ...prev, sector_id: null }));
                    }}
                    className={inputCls}
                  >
                    <option value="">— Seleccionar comuna —</option>
                    {comunas.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Sector</label>
                  <select
                    name="sector_id"
                    value={formData.sector_id || ''}
                    onChange={handleChange}
                    disabled={!comunaSeleccionada}
                    className={inputCls + (!comunaSeleccionada ? ' opacity-50 cursor-not-allowed' : '')}
                  >
                    <option value="">— Seleccionar sector —</option>
                    {sectoresFormulario.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Correo Electrónico</label>
                  <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Preferencia Tributaria</label>
                  <select name="preferencia_factura" value={formData.preferencia_factura} onChange={handleChange} className={inputCls}>
                    <option value={PreferenciaFacturacion.BOLETA}>Boleta</option>
                    <option value={PreferenciaFacturacion.FACTURA}>Factura</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Frecuencia de Visita *</label>
                  <select name="frecuencia" value={formData.frecuencia || 'SEMANAL'} onChange={handleChange} className={inputCls}>
                    <option value="SEMANAL">Semanal (7 días)</option>
                    <option value="QUINCENAL">Quincenal (14 días)</option>
                    <option value="MENSUAL">Mensual (30 días)</option>
                    <option value="A_PEDIDO">A Pedido (Bajo demanda)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Saldo / Deuda Inicial ($)</label>
                  <input type="number" name="deuda" value={formData.deuda ?? 0} onChange={handleChange} placeholder="0" className={inputCls} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors">Cancelar</button>
                <button type="submit" disabled={isPending} className="text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-[#013299]/20 hover:shadow-none transition-all disabled:opacity-60" style={{ backgroundColor: '#013299' }}>
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

      {/* Modal de Impresión / Exportación de Reporte */}
      {isPrintModalOpen && (
        <ModalImpresion
          clientes={clientesFiltrados}
          tituloReporte={printTitle}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
}