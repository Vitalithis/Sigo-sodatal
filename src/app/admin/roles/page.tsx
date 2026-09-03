import { listUsuarios } from './actions';
import RolesTable from './components/RolesTable';
import { ShieldCheck } from 'lucide-react';

export default async function RolesPage() {
  const usuarios = await listUsuarios();

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
      </div>

      {/* TABLA */}
      <RolesTable usuarios={usuarios} />

    </div>
  );
}
