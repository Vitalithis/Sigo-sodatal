import { listUsuarios } from './actions';
import RolesTable from './components/RolesTable';
import { ShieldCheck } from 'lucide-react';

export default async function RolesPage() {
  const usuarios = await listUsuarios();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <ShieldCheck className="h-6 w-6 text-[#013299]" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestión de Roles</h1>
          <p className="text-sm text-gray-500">Asigna roles a los usuarios registrados en el sistema</p>
        </div>
      </div>
      <RolesTable usuarios={usuarios} />
    </div>
  );
}