import { redirect } from 'next/navigation';
import { getUsuarioActual } from '@/lib/auth-session';
import { prisma } from '@lib/prisma';
import PerfilRepartidorClient from './PerfilRepartidorClient';

export const metadata = {
  title: 'Mi Perfil y Ajustes - Repartidor SODATAL',
  description: 'Datos de la sesión, información de vehículo y ajustes de la cuenta del repartidor.',
};

export default async function PerfilRepartidorPage() {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect('/login');

  const vehiculo = usuario.vehiculo_id 
    ? await prisma.vehiculo.findUnique({ where: { id: usuario.vehiculo_id } })
    : null;

  return (
    <div className="space-y-6">
      <PerfilRepartidorClient 
        usuario={{
          id: usuario.id,
          nombre: usuario.nombre,
          apellido: (usuario as any).apellido || '',
          email: usuario.email,
          rut: usuario.rut,
          telefono: usuario.telefono || 'Sin registrar',
          rol: usuario.rol || 'REPARTIDOR',
          licencia_tipo: usuario.licencia_tipo,
          vencimiento_lic: usuario.vencimiento_lic ? usuario.vencimiento_lic.toLocaleDateString('es-CL') : null,
          fecha_ingreso: usuario.fecha_ingreso ? usuario.fecha_ingreso.toLocaleDateString('es-CL') : 'N/A',
          activo: usuario.activo,
        }} 
        vehiculo={vehiculo ? {
          patente: vehiculo.patente,
          marca: vehiculo.marca,
          modelo: vehiculo.modelo,
          anio: vehiculo.anio,
          kilometraje_actual: vehiculo.kilometraje_actual,
        } : null}
      />
    </div>
  );
}
