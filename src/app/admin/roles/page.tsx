import { listUsuarios } from './actions';
import RolesTable from './components/RolesTable';

export const metadata = {
  title: 'Gestión de Roles y Permisos - SIGO Sodatal',
  description: 'Asignación de roles y permisos de acceso para usuarios del sistema.',
};

export default async function RolesPage() {
  const usuarios = await listUsuarios();

  return (
    <div className="space-y-6 pb-12">
      <RolesTable usuarios={usuarios} />
    </div>
  );
}