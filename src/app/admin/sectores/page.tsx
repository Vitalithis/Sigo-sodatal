import { listComunas } from './actions';
import ComunaPanel from './components/ComunaPanel';
import { MapPin } from 'lucide-react';

export default async function SectoresPage() {
  const comunas = await listComunas();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <MapPin className="h-6 w-6 text-[#013299]" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sectores y Comunas</h1>
          <p className="text-sm text-gray-500">Gestiona las comunas y sus sectores de reparto</p>
        </div>
      </div>
      <ComunaPanel comunas={comunas} />
    </div>
  );
}