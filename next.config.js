const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  buildExcludes: [/middleware-manifest\.json$/, /_next\/app-build-manifest\.json$/, /\.map$/],
  cacheOnFrontEndNav: false,
  reloadOnOnline: true,
  // Estrategia de caché runtime para reducir peticiones a Supabase
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'supabase-storage-images',
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    {
      urlPattern: /^https:\/\/(ddragon\.leagueoflegends\.com|raw\.communitydragon\.org|cdn\.communitydragon\.org)\/.*$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'riot-cdn-assets',
        expiration: {
          maxEntries: 1000,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24, // 24 horas
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Desactivar modo estricto para evitar problemas de hidratación
  // Aumentar el timeout para la carga de chunks
  experimental: {
    // Mejoras para evitar errores de carga de chunks
    // Tree-shaking optimizado para librerías pesadas
    optimizePackageImports: [
      '@supabase/auth-helpers-react',
      '@supabase/auth-helpers-nextjs',
      '@fortawesome/react-fontawesome',
      '@nextui-org/react',
      '@radix-ui/react-icons',
      'lucide-react',
      'framer-motion',
      'date-fns',
      'lodash',
      'react-hot-toast',
      'zustand',
    ],
    // Mejorar la estabilidad del servidor de desarrollo
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
    // La opción serverActions ya está disponible por defecto en Next.js 14+
  },
  // Optimizaciones de compilación para reducir tamaño de bundle
  swcMinify: true,
  compress: true,
  // Optimizar CSS y reducir render-blocking resources
  productionBrowserSourceMaps: false,
  images: {
    // Aumentar el TTL del caché de imágenes optimizadas (default es 60 seg)
    minimumCacheTTL: 31536000,
    // Limitar tamaños de dispositivos para evitar generar demasiadas variantes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.gamespot.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.gameskinny.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media.tenor.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.tenor.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'korestats.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.korestats.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'raw.communitydragon.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.communitydragon.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ddragon.leagueoflegends.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Configuración de fallbacks para compatibilidad
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
      }
      
      // Mejorar el manejo de errores de carga de chunks
      config.output.crossOriginLoading = 'anonymous';
    }
    return config
  },
}

module.exports = withPWA(nextConfig)
