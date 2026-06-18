/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // 💡 Esto amplía el límite para que Next.js acepte la foto pesada de la cámara
    },
  },
  // 💡 Nota: Quitamos la propiedad 'env' de aquí porque Prisma ya lee el archivo .env.local de forma nativa en el backend de forma segura.
};

export default nextConfig;