/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disattivo la compressione in dev per risparmiare cicli CPU sul Raspberry Pi
  compress: false,
  poweredByHeader: false,
  reactStrictMode: false,
  experimental: {
    // Ottimizzazioni cruciali per hardware limitato
    workerThreads: false,
    cpus: 1,
    // Configurazione corretta per Next.js 15 in Cloud Workstations
    serverActions: {
      allowedOrigins: ['*.cloudworkstations.dev', 'localhost:9002'],
      bodySizeLimit: '4mb',
    },
  },
  serverExternalPackages: ['better-sqlite3'],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disattivo i source maps per velocizzare drasticamente la compilazione e ridurre l'uso di memoria
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.devtool = false;
      config.optimization.minimize = false;
    }
    return config;
  },
};

module.exports = nextConfig;
