'use server';

import { prisma } from '@lib/prisma';
import { revalidatePath } from 'next/cache';

export async function crearDispensadorAction(data: any) {
  // Aquí puedes verificar permisos:
  // const session = await getSession();
  // if (!session) throw new Error("No autorizado");

  const nuevoDispensador = await prisma.dispensador.create({
    data: { ...data, estado: 'EN_CLIENTE' },
  });
  
  revalidatePath('/admin/dispensadores');
  return { success: true, data: nuevoDispensador };
}
