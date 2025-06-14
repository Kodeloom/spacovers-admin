import 'nuxt/schema';

declare module 'nuxt/schema' {
  interface PageMeta {
    layout?: 'admin' | 'default' | false;
  }
} 