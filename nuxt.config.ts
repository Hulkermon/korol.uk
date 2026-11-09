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
      title: 'koroluk_explorer_v1.6',
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon/favicon-96x96.png', sizes: '96x96' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon/favicon.svg' },
        { rel: 'shortcut icon', href: '/favicon/favicon.ico' },
        {
          key: 'apple-touch-icon',
          rel: 'apple-touch-icon',
          href: '/favicon/apple-touch-icon.png',
          sizes: '180x180',
        },
        { key: 'manifest', rel: 'manifest', href: '/favicon/site.webmanifest' },
      ],
      meta: [{ name: 'apple-mobile-web-app-title', content: 'korol.uk' }],
    },
  },
  ssr: false,
});
