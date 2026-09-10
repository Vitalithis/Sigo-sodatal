import 'dotenv/config';
import { prisma } from './lib/prisma';

async function main() {
  const email = 'docampo@ing.ucsc.cl';

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.error('❌ Primero regístrate en la app, luego corre este script');
    return;
  }

  await prisma.usuario.upsert({
    where: { email },
    update: { rol: 'ADMIN' },
    create: {
      user_id: user.id,
      email,
      nombre: 'Dan Ocampo',
      rut: user.rut,
      telefono: '999999999',
      rol: 'ADMIN',
      fecha_ingreso: new Date(),
    },
  });

  console.log('✅ Admin configurado');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());