'use client';

import React, { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TipoCliente, PreferenciaFacturacion, Cliente } from '@prisma/client';
import { 
  crearClienteAction, 
  editarClienteAction, 
  desactivarClienteAction, 
  eliminarClienteAction,
  asignarDispensadorAction, 
  registrarMantencionAction, 
  registrarMovimientoFinancieroAction,
  ClienteInput,
  editarDispensadorAction,
  eliminarDispensadorAction
} from '../actions';

interface ClientManagerProps {
  initialClientes: any[]; 
}

interface CustomPopup {
  show: boolean;
  type: 'success' | 'error' | 'confirm';
  title: string;
  message: string;
  onConfirm?: () => void;
}

export default function ClientManager({ initialClientes }: ClientManagerProps) {
  const router = useRouter();
  const [clientes, setClientes] = useState<any[]>(initialClientes);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  const [popup, setPopup] = useState<CustomPopup>({
    show: false, type: 'success', title: '', message: ''
  });

  // 🔄 CONTROL DE SINCRONIZACIÓN INTELIGENTE CON EL SERVIDOR
  useEffect(() => {
    setClientes(prevClientes => {
      return initialClientes.map(incoming => {
        const localCopy = prevClientes.find(c => c.id === incoming.id);
        if (localCopy) {
          const dispensadoresCombinados = (incoming.dispensadores || []).map((incDisp: any) => {
            const localDisp = localCopy.dispensadores?.find((ld: any) => ld.id === incDisp.id);
            if (localDisp && localDisp.estado !== incDisp.estado && incDisp.estado === 'EN_CLIENTE') {
              return { ...incDisp, estado: localDisp.estado, estado_dispensador: localDisp.estado };
            }
            return incDisp;
          });

          return {
            ...incoming,
            dispensadores: dispensadoresCombinados,
            mantenciones: (incoming.mantenciones?.length || 0) >= (localCopy.mantenciones?.length || 0)
              ? incoming.mantenciones
              : localCopy.mantenciones,
            movimientosFinancieros: (incoming.movimientosFinancieros?.length || 0) >= (localCopy.movimientosFinancieros?.length || 0)
              ? incoming.movimientosFinancieros
              : localCopy.movimientosFinancieros,
          };
        }
        return incoming;
      });
    });
  }, [initialClientes]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'equipos' | 'taller' | 'finanzas'>('equipos');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [dispensadorForm, setDispensadorForm] = useState({ 
    marca: 'FRIO_CALOR_COMPRESOR', 
    numero_serie: '', 
    precio_arriendo: '', 
    foto_url: '' 
  });
  
  const [tallerForm, setTallerForm] = useState({ 
    dispensador_id: '',
    tipo_trabajo: 'LIMPIEZA', 
    motivo_falla: '', 
    deja_maquina_prestamo: false, 
    serie_maquina_prestamo: '' 
  });
  
  const [finanzasForm, setFinanzasForm] = useState({ 
    tipo: 'COMPRA_BOTELLON', 
    descripcion: '', 
    monto: 0, 
    documento_ref: '' 
  });

  const [formData, setFormData] = useState<ClienteInput>({
    nombre: '', tipo: TipoCliente.DOMICILIO, direccion: '', telefono: '', email: '',
    rut_empresa: '', giro: '', preferencia_factura: PreferenciaFacturacion.BOLETA,
    notas: '', activo: true, botellones_prestados: 0,
  });

  useEffect(() => {
    if (clienteSeleccionado) {
      const actualizado = clientes.find(c => c.id === clienteSeleccionado.id);
      if (actualizado) {
        setClienteSeleccionado(actualizado);
      }
    }
  }, [clientes]);

  const showSuccessPopup = (title: string, message: string) => {
    setPopup({ show: true, type: 'success', title, message });
  };

  const showErrorPopup = (title: string, message: string) => {
    setPopup({ show: true, type: 'error', title, message });
  };

  const showConfirmPopup = (title: string, message: string, action: () => void) => {
    setPopup({
      show: true,
      type: 'confirm',
      title,
      message,
      onConfirm: () => {
        action();
        setPopup(prev => ({ ...prev, show: false }));
      }
    });
  };

  const clientesFiltrados = clientes.filter((cliente) => {
    const cumpleBusqueda = 
      (cliente.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (cliente.rut_empresa && cliente.rut_empresa.toLowerCase().includes(busqueda.toLowerCase())) ||
      (cliente.telefono || '').includes(busqueda);
    const cumpleTipo = filtroTipo === 'TODOS' || cliente.tipo === filtroTipo;
    const cumpleEstado = filtroEstado === 'TODOS' || (filtroEstado === 'ACTIVOS' && cliente.activo) || (filtroEstado === 'INACTIVOS' && !cliente.activo);
    return cumpleBusqueda && cumpleTipo && cumpleEstado;
  });

  const handleOpenCreate = () => {
    setEditingClienteId(null);
    setErrorForm(null);
    setFormData({
      nombre: '', tipo: TipoCliente.DOMICILIO, direccion: '', telefono: '', email: '',
      rut_empresa: '', giro: '', preferencia_factura: PreferenciaFacturacion.BOLETA,
      notas: '', activo: true, botellones_prestados: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cliente: Cliente) => {
    setEditingClienteId(cliente.id);
    setErrorForm(null);
    setFormData({
      nombre: cliente.nombre, tipo: cliente.tipo, direccion: cliente.direccion, telefono: cliente.telefono,
      email: cliente.email || '', rut_empresa: cliente.rut_empresa || '', giro: cliente.giro || '',
      preferencia_factura: cliente.preferencia_factura, notas: cliente.notas || '',
      activo: cliente.activo, botellones_prestados: cliente.botellones_prestados,
    });
    setIsModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : name === 'botellones_prestados' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.tipo === TipoCliente.EMPRESA && !formData.rut_empresa) {
      setErrorForm('El RUT de la empresa es obligatorio para el tipo Empresa.');
      return;
    }
    startTransition(async () => {
      let response = editingClienteId ? await editarClienteAction(editingClienteId, formData) : await crearClienteAction(formData);
      if (response.success) { 
        setIsModalOpen(false);
        router.refresh();
        showSuccessPopup("Operación Exitosa", "Los datos del cliente han sido guardados.");
      } else { 
        setErrorForm(response.message || 'Error inesperado.'); 
      }
    });
  };

  const handleEliminar = async (id: string) => {
    showConfirmPopup(
      "¿Eliminar Cliente?", 
      "Esta acción es irreversible y eliminará el registro permanente del cliente.",
      async () => {
        const res = await eliminarClienteAction(id);
        if (res.success) {
          router.refresh();
          showSuccessPopup("Removido", "El cliente fue eliminado de la base de datos.");
        } else {
          showErrorPopup("Error", res.message || "No se pudo completar el borrado.");
        }
      }
    );
  };

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      setStream(videoStream);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = videoStream;
        }
      }, 50);
    } catch (err) {
      console.error(err);
      showErrorPopup("Cámara Bloqueada", "No se pudo acceder a la cámara del dispositivo.");
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      const width = video.videoWidth || video.clientWidth;
      const height = video.videoHeight || video.clientHeight;
      
      canvas.width = width;
      canvas.height = height;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, width, height);
        const base64String = canvas.toDataURL('image/jpeg', 0.85);
        
        setPreviewFoto(base64String);
        setDispensadorForm(prev => ({ 
          ...prev, 
          foto_url: base64String 
        }));
        
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    setStream(null);
    setIsCameraActive(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPreviewFoto(base64String);
      setDispensadorForm(prev => ({
        ...prev,
        foto_url: base64String
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleGuardarDispensador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSeleccionado?.id) return;
    
    const precioNumerico = parseInt(dispensadorForm.precio_arriendo.replace(/\D/g, ''), 10) || 0;
    const clienteIdSeguro = clienteSeleccionado.id;

    const payload = {
      tipo: dispensadorForm.marca as any, 
      marca: dispensadorForm.marca,
      numeroSerie: dispensadorForm.numero_serie || undefined,
      numero_serie: dispensadorForm.numero_serie || undefined,
      precioArriendo: precioNumerico,
      precio_arriendo: precioNumerico,
      fotoUrl: dispensadorForm.foto_url || undefined,
      foto_url: dispensadorForm.foto_url || undefined
    };

    const res = await asignarDispensadorAction(clienteIdSeguro, payload);
    if (res.success) {
      const nuevoDispensador = {
        id: (res as any).data?.id || Math.random().toString(),
        tipo: dispensadorForm.marca,
        marca: dispensadorForm.marca,
        numero_serie: dispensadorForm.numero_serie || 'S/N',
        numeroSerie: dispensadorForm.numero_serie || 'S/N',
        precio_arriendo: precioNumerico,
        precioArriendo: precioNumerico,
        estado: 'EN_CLIENTE',
        foto_url: dispensadorForm.foto_url || undefined,
        fotoUrl: dispensadorForm.foto_url || undefined
      };

      setClientes(prevClientes => {
        const nuevosClientes = prevClientes.map(c => {
          if (c.id === clienteIdSeguro) {
            return { ...c, dispensadores: [...(c.dispensadores || []), nuevoDispensador] };
          }
          return c;
        });
        const actualizado = nuevosClientes.find(c => c.id === clienteIdSeguro);
        if (actualizado) setClienteSeleccionado(actualizado);
        return nuevosClientes;
      });

      setPreviewFoto(null);
      setDispensadorForm({ marca: 'FRIO_CALOR_COMPRESOR', numero_serie: '', precio_arriendo: '', foto_url: '' });
      router.refresh(); 
      showSuccessPopup("Equipo Vinculado", "El nuevo dispensador fue asignado con éxito.");
    } else {
      showErrorPopup("Atención", res.message || "No se pudo vincular el equipo.");
    }
  };

  const handleGuardarMantencion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clienteSeleccionado?.id) {
      showErrorPopup("Error", "No se ha detectado un cliente válido.");
      return;
    }

    if (!tallerForm.dispensador_id) {
      showErrorPopup("Atención", "Debe seleccionar una máquina vinculada para enviar a taller.");
      return;
    }

    const clienteIdSeguro: string = clienteSeleccionado.id as string;
    const dispensadorIdSeguro: string = tallerForm.dispensador_id;
    const equipoActual = clienteSeleccionado.dispensadores?.find((d: any) => d.id === dispensadorIdSeguro);

    if (equipoActual && equipoActual.estado !== 'EN_CLIENTE') {
      showErrorPopup("Acción Denegada", "Este equipo ya fue procesado y se encuentra en taller.");
      return;
    }

    const descripcionConTipo = `[${tallerForm.tipo_trabajo}] ${tallerForm.motivo_falla}`;
    const nuevoEstadoTaller = tallerForm.tipo_trabajo === 'LIMPIEZA' ? 'TALLER_LIMPIEZA' : 'TALLER_REPARACION';

    const payload = {
      dispensadorId: dispensadorIdSeguro, 
      motivoFalla: descripcionConTipo,
      deja_maquina_prestamo: tallerForm.deja_maquina_prestamo,
      serieMaquinaPrestamo: tallerForm.serie_maquina_prestamo || undefined
    };

    setClientes(prevClientes => {
      const nuevosClientes = prevClientes.map(c => {
        if (c.id === clienteIdSeguro) {
          const dispensadoresActualizados = (c.dispensadores || []).map((d: any) => 
            d.id === dispensadorIdSeguro ? { ...d, estado: nuevoEstadoTaller, estado_dispensador: nuevoEstadoTaller } : d
          );

          const nuevaMantencion = {
            id: Math.random().toString(), 
            fecha: new Date().toISOString(),
            motivoFalla: descripcionConTipo,
            motivo_falla: descripcionConTipo,
            dispensador: equipoActual ? { 
              id: dispensadorIdSeguro,
              numero_serie: equipoActual.numero_serie || equipoActual.numeroSerie,
              numeroSerie: equipoActual.numero_serie || equipoActual.numeroSerie 
            } : null
          };
          
          return { 
            ...c, 
            dispensadores: dispensadoresActualizados, 
            mantenciones: [nuevaMantencion, ...(c.mantenciones || [])] 
          };
        }
        return c;
      });

      const clienteActualizado = nuevosClientes.find(c => c.id === clienteIdSeguro);
      if (clienteActualizado) setClienteSeleccionado(clienteActualizado);
      return nuevosClientes;
    });

    setTallerForm({ 
      dispensador_id: '', 
      tipo_trabajo: 'LIMPIEZA', 
      motivo_falla: '', 
      deja_maquina_prestamo: false, 
      serie_maquina_prestamo: '' 
    });

    const res = await registrarMantencionAction(clienteIdSeguro, payload);
    
    if (res.success) {
      if (equipoActual) {
        await editarDispensadorAction(dispensadorIdSeguro, {
          marca: equipoActual.marca || equipoActual.tipo || 'FRIO_CALOR_COMPRESOR',
          modelo: equipoActual.modelo || '',
          numeroSerie: equipoActual.numero_serie || equipoActual.numeroSerie || 'S/N',
          estado: nuevoEstadoTaller, 
          precioArriendo: Number(equipoActual.precio_arriendo || equipoActual.precioArriendo || 0),
          fotoUrl: equipoActual.foto_url || equipoActual.fotoUrl || undefined
        });
      }
      router.refresh();
      showSuccessPopup("Taller Técnico", "El equipo ingresó a taller correctamente.");
    } else {
      showErrorPopup("Error", res.message || "Falló el registro en base de datos.");
    }
  };

  // ========================================================
  // 🚀 NUEVA FUNCIÓN: DAR DE ALTA / SALIDA DE TALLER
  // ========================================================
  const handleSalidaTaller = async (dispensador: any) => {
    if (!clienteSeleccionado?.id) return;
    const clienteIdSeguro = clienteSeleccionado.id;

    showConfirmPopup(
      "¿Dar de Alta Equipo?", 
      `Confirmar que el equipo S/N: ${dispensador.numero_serie || dispensador.numeroSerie} ha finalizado su mantenimiento y vuelve a estar operativo en el cliente.`,
      async () => {
        // Actualización optimista inmediata
        setClientes(prevClientes => {
          const nuevosClientes = prevClientes.map(c => {
            if (c.id === clienteIdSeguro) {
              const dispensadoresActualizados = (c.dispensadores || []).map((d: any) => 
                d.id === dispensador.id ? { ...d, estado: 'EN_CLIENTE', estado_dispensador: 'EN_CLIENTE' } : d
              );
              
              const notaAlta = {
                id: Math.random().toString(),
                fecha: new Date().toISOString(),
                motivoFalla: `[ALTA MEDICA] Salida exitosa de taller. Equipo operativo.`,
                motivo_falla: `[ALTA MEDICA] Salida exitosa de taller. Equipo operativo.`,
                dispensador: { id: dispensador.id, numero_serie: dispensador.numero_serie }
              };

              return { 
                ...c, 
                dispensadores: dispensadoresActualizados,
                mantenciones: [notaAlta, ...(c.mantenciones || [])]
              };
            }
            return c;
          });
          const actualizado = nuevosClientes.find(c => c.id === clienteIdSeguro);
          if (actualizado) setClienteSeleccionado(actualizado);
          return nuevosClientes;
        });

        // Llamada a la acción del servidor pasando el estado normalizado de vuelta
        const res = await editarDispensadorAction(dispensador.id, {
          marca: dispensador.marca || dispensador.tipo || 'FRIO_CALOR_COMPRESOR',
          modelo: dispensador.modelo || '',
          numeroSerie: dispensador.numero_serie || dispensador.numeroSerie || 'S/N',
          estado: 'EN_CLIENTE', 
          precioArriendo: Number(dispensador.precio_arriendo || dispensador.precioArriendo || 0),
          fotoUrl: dispensador.foto_url || dispensador.fotoUrl || undefined
        });

        if (res.success) {
          router.refresh();
          showSuccessPopup("Alta Técnica", "El dispensador ha salido de taller y quedó registrado como operativo.");
        } else {
          showErrorPopup("Error", res.message || "No se pudo cambiar el estado en el servidor.");
        }
      }
    );
  };

  const handleGuardarFinanzas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSeleccionado?.id) return;

    const payload = {
      tipo: finanzasForm.tipo as any,
      descripcion: finanzasForm.descripcion,
      monto: finanzasForm.monto,
      documentoRef: finanzasForm.documento_ref || undefined
    };
    const res = await registrarMovimientoFinancieroAction(clienteSeleccionado.id as string, payload);
    if (res.success) {
      setFinanzasForm({ tipo: 'COMPRA_BOTELLON', descripcion: '', monto: 0, documento_ref: '' });
      router.refresh();
      showSuccessPopup("Caja Actualizada", "La transacción monetaria se asentó correctamente.");
    } else showErrorPopup("Error", res.message || "Falló la operación financiera.");
  };

  const exportarFinanzasCSV = (nombreCliente: string, historial: any[]) => {
    if (!historial || historial.length === 0) return showErrorPopup("Información", "No hay movimientos contables registrados.");
    let csvContent = 'data:text/csv;charset=utf-8,Fecha,Tipo,Descripcion,Monto,Documento Ref\n';
    historial.forEach((h) => {
      csvContent += `"${new Date(h.fecha).toLocaleDateString()}","${h.tipo || ''}","${h.descripcion || ''}",${h.monto || 0},"${h.documento_ref || ''}"\n`;
    });
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Finanzas_${(nombreCliente || 'cliente').replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 relative overflow-x-hidden">
      <canvas ref={canvasRef} className="hidden" />

      {popup.show && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-xl p-5 shadow-2xl border text-center space-y-4">
            <div className="text-3xl">
              {popup.type === 'success' && '✅'}
              {popup.type === 'error' && '⚠️'}
              {popup.type === 'confirm' && '❓'}
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">{popup.title}</h4>
              <p className="text-xs text-slate-600 mt-1">{popup.message}</p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              {popup.type === 'confirm' ? (
                <>
                  <button onClick={popup.onConfirm} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors">Confirmar</button>
                  <button onClick={() => setPopup(prev => ({ ...prev, show: false }))} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors">Cancelar</button>
                </>
              ) : (
                <button onClick={() => setPopup(prev => ({ ...prev, show: false }))} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-1.5 rounded-lg text-xs font-bold transition-colors">Entendido</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="flex mb-4 text-xs text-slate-500 font-medium" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-2">
          <li className="inline-flex items-center">
            <a href="/admin" className="hover:text-blue-600 transition-colors flex items-center gap-1">🏠 Inicio</a>
          </li>
          <li>
            <div className="flex items-center">
              <span className="text-slate-300 mx-1">/</span>
              <span className="text-slate-400">Administración</span>
            </div>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <span className="text-slate-300 mx-1">/</span>
              <span className="text-slate-700 font-semibold">Clientes</span>
            </div>
          </li>
        </ol>
      </nav>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Módulo de Clientes</h1>
          <p className="text-sm text-slate-500">Gestión comercial, despacho, envases y facturación.</p>
        </div>
        <button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">+ Registrar Nuevo Cliente</button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por nombre, RUT empresa o teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-2">
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 font-medium bg-white focus:outline-none">
            <option value="TODOS">Todos los Tipos</option>
            <option value="DOMICILIO">Domicilio</option>
            <option value="EMPRESA">Empresa</option>
          </select>
          
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 font-medium bg-white focus:outline-none">
            <option value="TODOS">Todos los Estados</option>
            <option value="ACTIVOS">Solo Activos</option>
            <option value="INACTIVOS">Solo Inactivos</option>
          </select>
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-slate-600 text-sm">
            <thead className="bg-slate-100 text-slate-700 uppercase text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="p-4">Cliente</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Dirección y Contacto</th>
                <th className="p-4">Preferencia Factura</th>
                <th className="p-4 text-center">Envases Prestados</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientesFiltrados.length === 0 ? (
                <tr><td colSpan={7} className="text-center p-8 text-slate-400">No se encontraron registros.</td></tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id || ''} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{cliente.nombre || ''}</div>
                      {cliente.rut_empresa && <div className="text-xs text-slate-500">RUT: {cliente.rut_empresa}</div>}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${cliente.tipo === 'EMPRESA' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>{cliente.tipo || ''}</span>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-800 max-w-xs truncate">{cliente.direccion || ''}</div>
                      <div className="text-xs text-slate-500">{cliente.telefono || ''}</div>
                    </td>
                    <td className="p-4"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">{cliente.preferencia_factura || ''}</span></td>
                    <td className="p-4 text-center font-medium text-slate-900">{cliente.botellones_prestados || 0}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cliente.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{cliente.activo ? 'Activo' : 'Inactivo'}</span>
                    </td>
                    <td className="p-4 text-right space-x-1">
                      <button 
                        onClick={() => { setClienteSeleccionado(cliente); setActiveTab('equipos'); }}
                        className="bg-blue-600 text-white hover:bg-blue-700 px-2 py-1 rounded text-xs font-bold shadow-xs transition-colors"
                      >
                        ⚙️ Gestionar
                      </button>
                      <button onClick={() => handleOpenEdit(cliente)} className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded text-xs font-medium">Editar</button>
                      <button onClick={() => handleEliminar(cliente.id || '')} className="text-rose-600 hover:text-rose-800 px-2 py-1 rounded text-xs font-medium">Eliminar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">{editingClienteId ? '✏️ Editar Cliente' : '👤 Nuevo Cliente'}</h2>
              <button onClick={() => { setIsModalOpen(false); }} className="text-slate-400 hover:text-slate-600 text-2xl font-semibold">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              {errorForm && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg">⚠️ {errorForm}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">Nombre / Razón Social *</label>
                  <input type="text" name="nombre" required value={formData.nombre} onChange={handleChange} className="border border-slate-300 p-2 rounded-lg text-sm bg-white outline-none text-slate-900"/>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Tipo Cliente</label>
                  <select name="tipo" value={formData.tipo} onChange={handleChange} className="border border-slate-300 p-2 rounded-lg text-sm bg-white outline-none text-slate-900">
                    <option value={TipoCliente.DOMICILIO}>Domicilio</option>
                    <option value={TipoCliente.EMPRESA}>Empresa</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Teléfono Contacto *</label>
                  <input type="text" name="telefono" required placeholder="+569..." value={formData.telefono} onChange={handleChange} className="border border-slate-300 p-2 rounded-lg text-sm bg-white outline-none text-slate-900"/>
                </div>
              </div>

              {formData.tipo === TipoCliente.EMPRESA && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-purple-900 uppercase">RUT Empresa *</label>
                    <input type="text" name="rut_empresa" value={formData.rut_empresa || ''} onChange={handleChange} className="border border-purple-300 p-2 rounded-lg text-sm bg-white outline-none text-slate-900"/>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-purple-900 uppercase">Giro Comercial</label>
                    <input type="text" name="giro" value={formData.giro || ''} onChange={handleChange} className="border border-purple-300 p-2 rounded-lg text-sm bg-white outline-none text-slate-900"/>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Dirección de Despacho *</label>
                <input type="text" name="direccion" required value={formData.direccion} onChange={handleChange} className="border border-slate-300 p-2 rounded-lg text-sm bg-white outline-none text-slate-900"/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Correo Electrónico</label>
                  <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="border border-slate-300 p-2 rounded-lg text-sm bg-white outline-none text-slate-900"/>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Preferencia Tributaria</label>
                  <select name="preferencia_factura" value={formData.preferencia_factura} onChange={handleChange} className="border border-slate-300 p-2 rounded-lg text-sm bg-white outline-none text-slate-900">
                    <option value={PreferenciaFacturacion.BOLETA}>Boleta</option>
                    <option value={PreferenciaFacturacion.FACTURA}>Factura</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600">Cancelar</button>
                <button type="submit" disabled={isPending} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold">{isPending ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar de Gestión de Ficha */}
      {clienteSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 flex justify-end backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl h-screen shadow-2xl flex flex-col border-l">
            <div className="bg-blue-600 p-5 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-blue-100 tracking-wider uppercase">Ficha Técnica</span>
                <h2 className="text-xl font-bold truncate text-white">{clienteSeleccionado.nombre || ''}</h2>
              </div>
              <button onClick={() => { setClienteSeleccionado(null); stopCamera(); }} className="text-white text-3xl font-bold">&times;</button>
            </div>

            <div className="flex border-b text-sm font-semibold bg-slate-50">
              <button onClick={() => setActiveTab('equipos')} className={`flex-1 py-3.5 text-center ${activeTab === 'equipos' ? 'border-b-2 border-blue-600 text-blue-600 font-bold bg-white' : 'text-slate-600'}`}>💧 Dispensadores</button>
              <button onClick={() => setActiveTab('taller')} className={`flex-1 py-3.5 text-center ${activeTab === 'taller' ? 'border-b-2 border-blue-600 text-blue-600 font-bold bg-white' : 'text-slate-600'}`}>🔧 Taller</button>
              <button onClick={() => setActiveTab('finanzas')} className={`flex-1 py-3.5 text-center ${activeTab === 'finanzas' ? 'border-b-2 border-blue-600 text-blue-600 font-bold bg-white' : 'text-slate-600'}`}>💵 Finanzas</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* ================= CONTENIDO PESTAÑA: EQUIPOS ================= */}
              {activeTab === 'equipos' && (
                <div className="space-y-6">
                  <form onSubmit={handleGuardarDispensador} className="bg-white p-5 border rounded-xl space-y-4 shadow-xs">
                    <h3 className="font-bold text-xs uppercase text-slate-900 border-b pb-2">Asignar Equipo</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-900">Categoría</label>
                        <select value={dispensadorForm.marca} onChange={(e) => setDispensadorForm({...dispensadorForm, marca: e.target.value})} className="border p-2 rounded-lg text-sm text-slate-900 bg-white">
                          <option value="FRIO_CALOR_COMPRESOR">Frío/Calor (Compresor)</option>
                          <option value="FRIO_CALOR_VENTILADOR">Frío/Calor (Ventilador)</option>
                          <option value="SOBRE_MESON">Sobre Mesón</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-900">N° Serie / Placa</label>
                        <input type="text" value={dispensadorForm.numero_serie} onChange={(e) => setDispensadorForm({...dispensadorForm, numero_serie: e.target.value})} placeholder="Ej: SN-4040" className="border p-2 rounded-lg text-sm text-slate-900 bg-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 items-end">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-900">Precio Arriendo Mensual</label>
                        <input type="text" value={dispensadorForm.precio_arriendo} onChange={(e) => setDispensadorForm({...dispensadorForm, precio_arriendo: e.target.value})} placeholder="Ej: 12000" className="border p-2 rounded-lg text-sm text-slate-900 bg-white" />
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={startCamera} className="flex-1 py-2 border border-slate-300 text-xs rounded-lg font-medium bg-slate-50 text-slate-700 hover:bg-slate-100">📷 Cámara</button>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 py-2 border border-slate-300 text-xs rounded-lg font-medium bg-slate-50 text-slate-700 hover:bg-slate-100">📁 Archivo</button>
                        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
                      </div>
                    </div>

                    {isCameraActive && (
                      <div className="relative border rounded-xl overflow-hidden bg-black aspect-video flex flex-col justify-end">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <button type="button" onClick={capturePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white rounded-full p-3 font-bold text-xs shadow-lg">📸 Capturar Placa</button>
                      </div>
                    )}

                    {previewFoto && (
                      <div className="p-2 border rounded-xl bg-slate-50 flex items-center gap-3">
                        <img src={previewFoto} className="w-16 h-16 rounded-lg object-cover border" alt="Vista previa" />
                        <span className="text-xs text-slate-500 font-medium">Evidencia fotográfica cargada correctamente.</span>
                      </div>
                    )}

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm shadow-sm transition-all">
                      Vincular Dispensador
                    </button>
                  </form>

                  <h3 className="font-bold text-xs uppercase text-slate-500 tracking-wider">Equipos Vinculados</h3>
                  <div className="space-y-3">
                    {clienteSeleccionado.dispensadores && clienteSeleccionado.dispensadores.length > 0 ? (
                      clienteSeleccionado.dispensadores.map((disp: any) => (
                        <div key={disp.id} className="p-4 border rounded-xl flex justify-between items-center bg-white shadow-xs">
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 uppercase">{disp.marca || disp.tipo}</h4>
                            <p className="text-xs text-slate-500 font-medium">Nº Serie: {disp.numero_serie || disp.numeroSerie || 'S/N'}</p>
                            <span className={`inline-block text-[10px] px-2 py-0.5 mt-1.5 rounded-full font-bold ${
                              disp.estado === 'EN_CLIENTE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {(disp.estado || 'EN_CLIENTE').replace('_', ' ')}
                            </span>
                          </div>
                          <span className="font-bold text-blue-600 text-sm">${Number(disp.precio_arriendo || disp.precioArriendo || 0).toLocaleString('es-CL')}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-6 border border-dashed rounded-xl">Este cliente no posee dispensadores asignados.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ================= CONTENIDO PESTAÑA: TALLER (ACTUALIZADO) ================= */}
              {activeTab === 'taller' && (
                <div className="space-y-6">
                  {/* Formulario de Entrada */}
                  <form onSubmit={handleGuardarMantencion} className="bg-white p-5 border rounded-xl space-y-4 shadow-xs">
                    <h3 className="font-bold text-xs uppercase text-slate-900 border-b pb-2">Ingresar Falla / Enviar a Taller</h3>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-900">Seleccionar Máquina en Cliente *</label>
                      <select
                        value={tallerForm.dispensador_id}
                        onChange={(e) => setTallerForm({...tallerForm, dispensador_id: e.target.value})}
                        className="border p-2 rounded-lg text-sm text-slate-900 bg-white"
                      >
                        <option value="">-- Elija un equipo activo --</option>
                        {clienteSeleccionado.dispensadores?.filter((d: any) => d.estado === 'EN_CLIENTE').map((d: any) => (
                          <option key={d.id} value={d.id}>
                            {(d.marca || d.tipo || '').replace(/_/g, ' ')} - S/N: {d.numero_serie || d.numeroSerie || 'S/N'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-900">Tipo de Trabajo</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setTallerForm({...tallerForm, tipo_trabajo: 'LIMPIEZA'})} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${tallerForm.tipo_trabajo === 'LIMPIEZA' ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-600 border-slate-200'}`}>🧼 Sanitización</button>
                        <button type="button" onClick={() => setTallerForm({...tallerForm, tipo_trabajo: 'REPARACION'})} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${tallerForm.tipo_trabajo === 'REPARACION' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>🔧 Reparación</button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-900">Falla Reportada / Observaciones *</label>
                      <textarea rows={3} value={tallerForm.motivo_falla} onChange={(e) => setTallerForm({...tallerForm, motivo_falla: e.target.value})} placeholder="Describa el comportamiento errático o motivo de ingreso..." className="border p-2 rounded-lg text-sm text-slate-900 bg-white resize-none" />
                    </div>

                    <button type="submit" disabled={!tallerForm.dispensador_id || !tallerForm.motivo_falla.trim()} className={`w-full py-2.5 font-bold rounded-lg text-sm transition-all ${tallerForm.dispensador_id && tallerForm.motivo_falla.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                      Procesar Entrada a Taller
                    </button>
                  </form>

                  {/* 🛠️ SECCIÓN NUEVA: EQUIPOS ACTUALMENTE EN TALLER (SALIDA DISPONIBLE) */}
                  <h3 className="font-bold text-xs uppercase text-amber-600 tracking-wider">🛠️ Equipos en Servicio Técnico</h3>
                  <div className="space-y-3">
                    {clienteSeleccionado.dispensadores?.filter((d: any) => d.estado && d.estado.startsWith('TALLER')).length > 0 ? (
                      clienteSeleccionado.dispensadores.filter((d: any) => d.estado && d.estado.startsWith('TALLER')).map((disp: any) => (
                        <div key={disp.id} className="p-4 border border-amber-200 bg-amber-50/50 rounded-xl flex justify-between items-center shadow-xs">
                          <div>
                            <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold uppercase">{disp.estado.replace('_', ' ')}</span>
                            <h4 className="font-bold text-sm text-slate-900 uppercase mt-1">{disp.marca || disp.tipo}</h4>
                            <p className="text-xs text-slate-500 font-medium">Nº Serie: {disp.numero_serie || disp.numeroSerie || 'S/N'}</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleSalidaTaller(disp)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-xs"
                          >
                            ✅ Salida de Taller
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-dashed">No hay máquinas de este cliente en el taller actualmente.</p>
                    )}
                  </div>

                  {/* Historial Técnico */}
                  <h3 className="font-bold text-xs uppercase text-slate-500 tracking-wider">Historial de Órdenes Técnicas</h3>
                  <div className="space-y-3">
                    {clienteSeleccionado.mantenciones && clienteSeleccionado.mantenciones.length > 0 ? (
                      clienteSeleccionado.mantenciones.map((mant: any) => (
                        <div key={mant.id} className="p-4 border rounded-xl bg-slate-50 text-xs space-y-1">
                          <div className="flex justify-between font-bold text-slate-800">
                            <span>MÁQUINA S/N: {mant.dispensador?.numero_serie || mant.dispensador?.numeroSerie || 'S/N'}</span>
                            <span className="text-slate-400 font-normal">{new Date(mant.fecha).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-600 italic">"{mant.motivoFalla || mant.motivo_falla}"</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-6 border border-dashed rounded-xl">No registra historiales técnicos vinculados.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ================= CONTENIDO PESTAÑA: FINANZAS ================= */}
              {/* ================= CONTENIDO PESTAÑA: FINANZAS (HISTORIAL DE COMPRAS) ================= */}
              {activeTab === 'finanzas' && (
                <div className="space-y-6">
                  <form onSubmit={handleGuardarFinanzas} className="bg-white p-5 border rounded-xl space-y-4 shadow-xs">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h3 className="font-bold text-xs uppercase text-slate-900">Registrar Nueva Compra del Cliente</h3>
                      <button 
                        type="button" 
                        onClick={() => exportarFinanzasCSV(clienteSeleccionado.nombre, clienteSeleccionado.movimientosFinancieros || [])} 
                        className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                      >
                        📥 Exportar Historial CSV
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-700 uppercase">Tipo de Compra</label>
                        <select 
                          value={finanzasForm.tipo} 
                          onChange={(e) => setFinanzasForm({...finanzasForm, tipo: e.target.value})} 
                          className="border border-slate-300 p-2 rounded-lg text-sm text-slate-900 bg-white outline-none"
                        >
                          <option value="RECARGA">Recarga de Botellón</option>
                          <option value="COMPRA_EQUIPO">Compra de Equipo</option>
                          <option value="ACCESORIOS">Accesorios / Repuestos</option>
                          <option value="OTRO">Otros</option>
                        </select>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-700 uppercase">Total Venta ($) *</label>
                        <input 
                          type="number" 
                          required
                          placeholder="Ej: 15000"
                          value={finanzasForm.monto || ''} 
                          onChange={(e) => setFinanzasForm({...finanzasForm, monto: Number(e.target.value)})} 
                          className="border border-slate-300 p-2 rounded-lg text-sm text-slate-900 bg-white outline-none" 
                        />
                      </div>
                    </div>

                    {/* Campo Dinámico Inteligente según el Tipo de Cliente */}
                    <div className="flex flex-col gap-1">
                      {clienteSeleccionado.tipo === 'EMPRESA' ? (
                        <>
                          <label className="text-xs font-bold text-purple-900 uppercase flex items-center gap-1">
                            📋 Número de Guía de Despacho *
                          </label>
                          <input 
                            type="text" 
                            required
                            value={finanzasForm.documento_ref} 
                            onChange={(e) => setFinanzasForm({...finanzasForm, documento_ref: e.target.value})} 
                            placeholder="Ej: Guía Nº 4520" 
                            className="border border-purple-300 p-2 rounded-lg text-sm text-slate-900 bg-white outline-none focus:ring-1 focus:ring-purple-500" 
                          />
                        </>
                      ) : (
                        <>
                          <label className="text-xs font-bold text-green-900 uppercase flex items-center gap-1">
                            🧾 Número de Boleta
                          </label>
                          <input 
                            type="text" 
                            value={finanzasForm.documento_ref} 
                            onChange={(e) => setFinanzasForm({...finanzasForm, documento_ref: e.target.value})} 
                            placeholder="Ej: Boleta Nº 98231 (Opcional)" 
                            className="border border-green-300 p-2 rounded-lg text-sm text-slate-900 bg-white outline-none focus:ring-1 focus:ring-green-500" 
                          />
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-700 uppercase">Detalle / Ítems Comprados</label>
                      <input 
                        type="text" 
                        value={finanzasForm.descripcion} 
                        onChange={(e) => setFinanzasForm({...finanzasForm, descripcion: e.target.value})} 
                        placeholder="Ej: 3 recargas de 20L + 1 dispensador de sobremesón" 
                        className="border border-slate-300 p-2 rounded-lg text-sm text-slate-900 bg-white outline-none" 
                      />
                    </div>

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm shadow-sm transition-colors">
                      🛒 Registrar en Historial de Compras
                    </button>
                  </form>

                  {/* Tabla / Listado de Historial del Cliente */}
                  <h3 className="font-bold text-xs uppercase text-slate-500 tracking-wider">Historial Cronológico de Compras</h3>
                  <div className="space-y-3">
                    {clienteSeleccionado.movimientosFinancieros && clienteSeleccionado.movimientosFinancieros.length > 0 ? (
                      clienteSeleccionado.movimientosFinancieros.map((mov: any) => (
                        <div key={mov.id} className="p-4 border rounded-xl bg-slate-50 flex justify-between items-center text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 uppercase bg-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                                {mov.tipo.replace('_', ' ')}
                              </span>
                              <span className="text-slate-400 font-normal">{new Date(mov.fecha).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-700 font-medium">{mov.descripcion || 'Sin descripción del detalle'}</p>
                            {mov.documentoRef || mov.documento_ref ? (
                              <p className="text-[11px] text-slate-500 font-semibold">
                                {clienteSeleccionado.tipo === 'EMPRESA' ? '📦 Guía: ' : '🧾 Boleta: '} 
                                {mov.documentoRef || mov.documento_ref}
                              </p>
                            ) : null}
                          </div>
                          <span className="font-bold text-slate-900 text-sm bg-white px-2 py-1 rounded-lg border">
                            ${Number(mov.monto || 0).toLocaleString('es-CL')}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-6 border border-dashed rounded-xl">
                        Este cliente aún no registra historial de compras cargado.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}