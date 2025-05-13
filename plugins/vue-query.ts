import { VueQueryPlugin, QueryClient, type VueQueryPluginOptions } from '@tanstack/vue-query';

export default defineNuxtPlugin((nuxt) => {
    const queryClient = new QueryClient();
    const vueQueryPluginOptions: VueQueryPluginOptions = {
        queryClient,
    };

    nuxt.vueApp.use(VueQueryPlugin, vueQueryPluginOptions);
}); 