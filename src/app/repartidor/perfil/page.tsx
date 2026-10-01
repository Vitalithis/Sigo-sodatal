import { redirect } from 'next/navigation';
import { getUsuarioActual } from '@/lib/auth-session';
import { prisma } from '@lib/prisma';
import PerfilRepartidorClient from './PerfilRepartidorClient';

export default async function PerfilRepartidorPage() {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect('/login');

  const vehiculo = usuario.vehiculo_id 
    ? await prisma.vehiculo.findUnique({ where: { id: usuario.vehiculo_id } })
    : null;

  return (
    <PerfilRepartidorClient 
      usuario={{
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido || '',
        email: usuario.email,
        rut: usuario.rut,
        telefono: usuario.telefono || 'Sin registrar',
        licencia_tipo: usuario.licencia_tipo,
        fecha_ingreso: usuario.fecha_ingreso ? usuario.fecha_ingreso.toLocaleDateString('es-CL') : 'N/A',
      }} 
      vehiculo={vehiculo ? {
        patente: vehiculo.patente,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        anio: vehiculo.anio,
      } : null}
    />
  );
}
