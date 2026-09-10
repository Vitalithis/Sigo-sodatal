import 'dotenv/config';
import { prisma } from './lib/prisma';

async function main() {
  // Buscamos si ya existe el registro en la tabla usuario
  const usuarioExistente = await prisma.usuario.findUnique({
    where: { email: 'docampo@ing.ucsc.cl' },
  });

  if (usuarioExistente) {
    // Si ya existe, solo actualizamos su rol a ADMIN
    const actualizado = await prisma.usuario.update({
      where: { email: 'docampo@ing.ucsc.cl' },
      data: { rol: 'ADMIN' },
    });
    console.log('✅ ¡Rol de ADMIN actualizado con éxito para el usuario existente!', actualizado);
  } else {
    // Si no existe, lo creamos con los campos obligatorios de tu esquema
    const creado = await prisma.usuario.create({
      data: {
        email: 'docampo@ing.ucsc.cl',
        nombre: 'Dan Ocampo',
        rol: 'ADMIN',
        rut: '19906083-k',
        telefono: '999999999', // Ajusta un teléfono temporal si tu esquema lo exige
        fecha_ingreso: new Date(),
      },
    });
    console.log('✅ ¡Usuario creado y configurado como ADMIN con éxito!', creado);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error crítico al sincronizar el usuario:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });