'use client';
import { useRef, useState, useTransition } from 'react';
import { asignarDispensadorAction } from '@/app/admin/clientes/actions';
import { useRouter } from 'next/navigation';
import { Camera, FolderOpen, Trash2, X, AlertCircle } from 'lucide-react';

const inputCls = 'w-full border border-slate-200 p-2 rounded-lg text-sm text-slate-800 bg-white outline-none focus:ring-2 focus:ring-[#013299]/30 focus:border-[#013299] transition-colors placeholder:text-slate-400';
const labelCls = 'text-xs font-bold text-slate-600 uppercase tracking-wide';

interface Props {
  cliente: any;
  onClienteUpdate: (updater: (prev: any[]) => any[]) => void;
  showSuccess: (t: string, m: string) => void;
  showError: (t: string, m: string) => void;
}

export default function TabDispensadores({ cliente, onClienteUpdate, showSuccess, showError }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);

  const [isPending, startTransition]         = useTransition();
  const [previewFoto, setPreviewFoto]         = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive]   = useState(false);
  const [stream, setStream]                   = useState<MediaStream | null>(null);
  const [form, setForm]                       = useState({
    marca: 'FRIO_CALOR_COMPRESOR',
    numero_serie: '',
    precio_arriendo: '',
    foto_url: '',
  });

  // Comprimir imágenes para mantenerlo liviano
  const redimensionarYComprimir = (imgSrc: string, callback: (b64: string) => void) => {
    const img = new Image();
    img.src = imgSrc;
    img.onload = () => {
      const maxDim = 800;
      let width = img.width;
      let height = img.height;

      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      const optimizada = canvas.toDataURL('image/jpeg', 0.7);
      callback(optimizada);
    };
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError('Cámara no disponible', 'Tu navegador o entorno no permite acceso a la cámara.');
      return;
    }

    try {
      setIsCameraActive(true);
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(s);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = s;
      }, 50);
    } catch (err: any) {
      setIsCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        showError('Permiso Denegado', 'Debes conceder acceso a la cámara en el navegador.');
      } else {
        showError('Cámara Bloqueada', 'No se pudo iniciar la cámara. Verifica que ninguna otra app la esté usando.');
      }
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth || v.clientWidth;
    c.height = v.videoHeight || v.clientHeight;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const b64 = c.toDataURL('image/jpeg', 0.85);
      redimensionarYComprimir(b64, (optimizada) => {
        setPreviewFoto(optimizada);
        setForm((p) => ({ ...p, foto_url: optimizada }));
      });
      stopCamera();
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const r = new FileReader();
    r.onloadend = () => {
      const b64 = r.result as string;
      redimensionarYComprimir(b64, (optimizada) => {
        setPreviewFoto(optimizada);
        setForm((p) => ({ ...p, foto_url: optimizada }));
      });
    };
    r.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPreviewFoto(null);
    setForm((p) => ({ ...p, foto_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const precio = parseInt(form.precio_arriendo.replace(/\D/g, ''), 10) || 0;
    const payload = {
      marca: form.marca,
      numeroSerie: form.numero_serie.trim() || undefined,
      precioArriendo: precio,
      fotoUrl: form.foto_url || undefined,
    };

    startTransition(async () => {
      try {
        const res = await asignarDispensadorAction(cliente.id, payload);
        if (res.success) {
          const nuevo = {
            id: (res as any).data?.id || Math.random().toString(),
            marca: form.marca,
            tipo: form.marca,
            numero_serie: form.numero_serie.trim() || 'S/N',
            precio_arriendo: precio,
            estado: 'EN_CLIENTE',
            foto_url: form.foto_url || undefined,
          };
          onClienteUpdate((prev) =>
            prev.map((c) => (c.id === cliente.id ? { ...c, dispensadores: [...(c.dispensadores || []), nuevo] } : c))
          );
          handleRemovePhoto();
          setForm({ marca: 'FRIO_CALOR_COMPRESOR', numero_serie: '', precio_arriendo: '', foto_url: '' });
          router.refresh();
          showSuccess('Equipo Vinculado', 'El dispensador fue asignado con éxito.');
        } else {
          showError('Atención', res.message || 'Error interno al guardar el dispensador.');
        }
      } catch (err: any) {
        showError('Error de Conexión', err.message || 'Ocurrió un error inesperado en el servidor.');
      }
    });
  };

  return (
    <div className="space-y-5">
      <canvas ref={canvasRef} className="hidden" />

      <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
        <h3 className="font-bold text-xs uppercase text-slate-600 tracking-wider border-b border-slate-200 pb-2">
          Asignar Equipo
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Categoría</label>
            <select
              value={form.marca}
              onChange={(e) => setForm((p) => ({ ...p, marca: e.target.value }))}
              className={inputCls}
            >
              <option value="FRIO_CALOR_COMPRESOR">Frío/Calor (Compresor)</option>
              <option value="FRIO_CALOR_VENTILADOR">Frío/Calor (Ventilador)</option>
              <option value="SOBRE_MESON">Sobre Mesón</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>N° Serie / Placa</label>
            <input
              type="text"
              value={form.numero_serie}
              onChange={(e) => setForm((p) => ({ ...p, numero_serie: e.target.value }))}
              placeholder="Ej: SN-4040"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Precio Arriendo Mensual</label>
            <input
              type="text"
              value={form.precio_arriendo}
              onChange={(e) => setForm((p) => ({ ...p, precio_arriendo: e.target.value }))}
              placeholder="Ej: 12000"
              className={inputCls}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={startCamera}
              disabled={isCameraActive}
              className="flex-1 py-2 border border-slate-200 text-xs rounded-xl font-semibold bg-white text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" /> Cámara
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2 border border-slate-200 text-xs rounded-xl font-semibold bg-white text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" /> Archivo
            </button>
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFile} />
          </div>
        </div>

        {/* Visor de Cámara */}
        {isCameraActive && (
          <div className="relative border rounded-2xl overflow-hidden bg-black aspect-video flex flex-col justify-center items-center">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute top-3 right-3">
              <button
                type="button"
                onClick={stopCamera}
                className="p-1.5 bg-black/60 text-white rounded-full hover:bg-black/90 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={capturePhoto}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white rounded-full px-5 py-2 font-bold text-xs shadow-lg flex items-center gap-2"
              style={{ backgroundColor: '#013299' }}
            >
              <Camera className="w-4 h-4" /> Capturar Foto
            </button>
          </div>
        )}

        {/* Vista previa con botón para eliminar foto */}
        {previewFoto && (
          <div className="p-3 border border-slate-200 rounded-xl bg-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <img src={previewFoto} className="w-14 h-14 rounded-lg object-cover border" alt="Vista previa" />
              <div>
                <p className="text-xs font-bold text-slate-700">Evidencia cargada</p>
                <span className="text-[11px] text-emerald-600 font-medium">Lista para enviar</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
              title="Eliminar foto"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full text-white font-bold py-2.5 rounded-xl text-sm transition-opacity disabled:opacity-60"
          style={{ backgroundColor: '#013299' }}
        >
          {isPending ? 'Guardando dispensador...' : 'Vincular Dispensador'}
        </button>
      </form>

      <h3 className="font-bold text-xs uppercase text-slate-500 tracking-wider">Equipos Vinculados</h3>
      <div className="space-y-3">
        {cliente.dispensadores?.length > 0 ? (
          cliente.dispensadores.map((disp: any) => (
            <div key={disp.id} className="p-4 border border-slate-200 rounded-xl flex justify-between items-center bg-white shadow-sm">
              <div className="flex items-center gap-3">
                {disp.foto_url && (
                  <img src={disp.foto_url} alt="Dispensador" className="w-12 h-12 rounded-lg object-cover border border-slate-100" />
                )}
                <div>
                  <h4 className="font-bold text-sm text-slate-900 uppercase">{disp.marca || disp.tipo}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Nº Serie: {disp.numero_serie || disp.numeroSerie || 'S/N'}</p>
                  <span className={`inline-block text-[10px] px-2 py-0.5 mt-1.5 rounded-full font-bold ${disp.estado === 'EN_CLIENTE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {(disp.estado || 'EN_CLIENTE').replace('_', ' ')}
                  </span>
                </div>
              </div>
              <span className="font-bold text-sm" style={{ color: '#013299' }}>
                ${Number(disp.precio_arriendo || disp.precioArriendo || 0).toLocaleString('es-CL')}
              </span>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-2xl">
            Este cliente no posee dispensadores asignados.
          </p>
        )}
      </div>
    </div>
  );
}
