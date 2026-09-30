import { listComunas } from './actions';
import ComunaPanel from './components/ComunaPanel';

export const metadata = {
  title: 'Sectores y Comunas - SIGO Sodatal',
  description: 'Gestión geofencing de comunas y sectores de distribución.',
};

export default async function SectoresPage() {
  const comunas = await listComunas();

  return (
    <div className="space-y-6 pb-12">
      <ComunaPanel comunas={comunas} />
    </div>
  );
}