// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  ssr: true,
  devtools: { enabled: process.env.NODE_ENV === 'development' },

  nitro: {
  //   preset: 'node-server',
  // preset: 'node-server',
    externals: {
      // inline: ['@prisma/client'],
      trace: false,
    },
    // experimental: {
      // wasm: true,
    // },
  },

  runtimeConfig: {
    qboClientId: process.env.QBO_CLIENT_ID,
    qboClientSecret: process.env.QBO_CLIENT_SECRET,
    qboEnvironment: process.env.QBO_ENVIRONMENT || 'sandbox',
    public: {
      authOrigin: process.env.AUTH_ORIGIN || 'http://localhost:3000',
      appUrl: process.env.APP_URL || 'http://localhost:3000',
    },
  },

  modules: [
    '@nuxt/eslint',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/test-utils',
    '@nuxtjs/tailwindcss',
    'nuxt-toast',
    '@sentry/nuxt/module'
  ],

  sentry: {
    sourceMapsUploadOptions: {
      org: 'kodeloom-software-solutions-ll',
      project: 'spacovers-admin'
    }
  },

  sourcemap: {
    client: 'hidden'
  }
})