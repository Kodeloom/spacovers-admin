import Toast, { type PluginOptions } from 'vue-toastification';
import 'vue-toastification/dist/index.css'; // Import the CSS
import { defineNuxtPlugin } from '#app';

export default defineNuxtPlugin((nuxtApp) => {
  const options: PluginOptions = {
    // You can set your default options here
    // @ts-expect-error - TODO: fix this
    position: "bottom-right", // Use destructured POSITION
    timeout: 5000,
    closeOnClick: true,
    pauseOnFocusLoss: true,
    pauseOnHover: true,
    draggable: true,
    draggablePercent: 0.6,
    showCloseButtonOnHover: false,
    hideProgressBar: false,
    closeButton: 'button',
    icon: true,
    rtl: false,
    // transition: 'Vue-Toastification__fade', // Ensure this is uncommented if intended
    // maxToasts: 10, // Ensure this is uncommented if intended
    // newestOnTop: true, // Ensure this is uncommented if intended
  };

  nuxtApp.vueApp.use(Toast, options); // Changed to use Toast
}); 