// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  ssr: true,
  devtools: { enabled: process.env.NODE_ENV === 'development' },
  nitro: {
  //   preset: 'node-server',
    // externals: {
    //   inline: ['@prisma/client', '@zenstackhq/runtime'],
    // },
    preset: "cloudflare_pages",
      cloudflare: {
        deployConfig: true,
        nodeCompat: true
      },
    //   experimental: {
    //   wasm: true
    // }
  },
  modules: [
    '@nuxt/eslint',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/test-utils',
    '@nuxtjs/tailwindcss',
    '@nuxthub/core'
  ]
})