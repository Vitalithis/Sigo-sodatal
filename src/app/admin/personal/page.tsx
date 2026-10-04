import React from 'react';
import { obtenerPersonalAction } from './actions';
import PersonalApp from './components/PersonalApp';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Fichas Personal - SIGO Sodatal',
  description: 'Gestión de personal, datos de contacto, vehículos y control de asistencia.',
};

export default async function PersonalPage() {
  const resultado = await obtenerPersonalAction();

  return (
    <div className="space-y-6 pb-12">
      <PersonalApp initialUsuarios={resultado.usuarios as any} />
    </div>
  );
}
