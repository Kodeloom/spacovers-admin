<template>
  <div v-if="isLoading" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]">
    <!-- Basic Loader Text -->
    <div class="text-white text-xl p-4 bg-gray-800 rounded-lg shadow-xl">
      Loading...
      <!-- You can add an SVG spinner or a CSS loader animation here -->
      <!-- Example of a simple dot animation (requires some CSS) -->
      <!-- 
      <div class="flex space-x-2 justify-center items-center mt-2">
        <span class="sr-only">Loading...</span>
        <div class="h-2 w-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div class="h-2 w-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div class="h-2 w-2 bg-white rounded-full animate-bounce"></div>
      </div>
      -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGlobalLoading } from '~/composables/useGlobalLoading';

const { isLoading } = useGlobalLoading();
</script>

<style scoped>
/* 
If you use the example dot animation, you'd need Tailwind's JIT 
(which is default in Nuxt 3 with Tailwind) or define 'animate-bounce' 
if it's not part of your base Tailwind setup, though it usually is.
For custom animations, you can add them here:

@keyframes bounce {
  0%, 100% {
    transform: translateY(-25%);
    animation-timing-function: cubic-bezier(0.8,0,1,1);
  }
  50% {
    transform: none;
    animation-timing-function: cubic-bezier(0,0,0.2,1);
  }
}
.animate-bounce {
  animation: bounce 1s infinite;
}
*/
</style> 