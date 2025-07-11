import {
    dehydrate,
    hydrate,
    QueryClient,
    VueQueryPlugin,
    type DehydratedState,
    type VueQueryPluginOptions,
} from '@tanstack/vue-query';
import { defineNuxtPlugin, useState } from '#app';

export default defineNuxtPlugin((nuxtApp) => {
    const vueQueryState = useState<DehydratedState | undefined>('vue-query');

    // Modify your Vue Query global settings here
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60, // 1 minute
                refetchOnWindowFocus: false, // Optional: prevent refetching on window focus
            },
        },
    });
    const options: VueQueryPluginOptions = { queryClient };

    nuxtApp.vueApp.use(VueQueryPlugin, options);

    if (import.meta.server) {
        nuxtApp.hooks.hook('app:rendered', () => {
            vueQueryState.value = dehydrate(queryClient);
        });
    }

    if (import.meta.client) {
        nuxtApp.hooks.hook('app:created', () => {
            if (vueQueryState.value) {
                hydrate(queryClient, vueQueryState.value);
            }
        });
    }
}); 