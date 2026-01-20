// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss'],
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => ['marquee'].includes(tag),
    },
  },
  runtimeConfig: {
    db: {
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    },
  },
  app: {
    head: {
      title: 'wameguan',
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon/favicon-96x96.png', sizes: '96x96' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg', sizes: '96x96' },
        { rel: 'shortcut icon', href: '/favicon.ico', sizes: '96x96' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '96x96' },
        { rel: 'manifest', href: '/site.webmanifest', sizes: '96x96' },
      ],
      meta: [{ name: 'apple-mobile-web-app-title', content: 'korol.uk' }],
    },
  },
  ssr: false,
});
