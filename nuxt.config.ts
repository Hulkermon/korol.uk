// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/content'],
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => ['marquee'].includes(tag)
    }
  },
  // Runtime Config to expose environment variables
  runtimeConfig: {
    // Keys defined here are available server-side only by default
    // geminiApiKey: process.env.GEMINI_API_KEY, // Example for server-only

    // Public keys are exposed to the client-side
    public: {
      // We only want to expose this in development for auto-loading
      geminiApiKeyDev: process.env.NODE_ENV === 'development' ? process.env.GEMINI_API_KEY : '',
    }
  }
})
