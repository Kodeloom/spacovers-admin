import { ref, readonly } from 'vue';

const isLoading = ref(false);

export const useGlobalLoading = () => {
  const showLoading = () => {
    isLoading.value = true;
  };

  const hideLoading = () => {
    isLoading.value = false;
  };

  // Expose isLoading as a readonly ref to prevent accidental modification outside the composable
  // but allow components to react to its changes.
  return {
    isLoading: readonly(isLoading),
    showLoading,
    hideLoading,
  };
}; 