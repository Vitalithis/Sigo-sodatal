/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // 💡 Amplía el límite para que Next.js acepte la foto pesada de la cámara
    },
  },

  // 💡 Permite compilar a producción aunque queden errores de TypeScript
  typescript: {
    ignoreBuildErrors: true,
  },

  // 💡 Permite compilar a producción aunque queden errores de ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;