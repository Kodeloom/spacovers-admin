import { VueQueryPlugin, type VueQueryPluginOptions } from '@tanstack/vue-query';
import { defineNuxtPlugin } from '#app';

export default defineNuxtPlugin((nuxtApp) => {
  // Modify your Vue Query global settings here
  const vueQueryOptions: VueQueryPluginOptions = {
    queryClientConfig: {
      defaultOptions: {
        queries: {
          // staleTime: 1000 * 60, // 1 minute, for example
          // refetchOnWindowFocus: false,
        },
      },
    },
  };

  nuxtApp.vueApp.use(VueQueryPlugin, vueQueryOptions);
}); 