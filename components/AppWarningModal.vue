<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" class="relative z-50" @close="closeModal">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/30" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-yellow-700">
                <Icon name="heroicons:exclamation-triangle-solid" class="h-6 w-6 text-yellow-500 inline-block mr-2 align-text-bottom" />
                {{ title }}
              </DialogTitle>
              <div class="mt-2">
                <p class="text-sm text-gray-600">
                  {{ message }}
                </p>
              </div>
              <div v-if="confirmationPhrase" class="mt-4">
                <label for="confirmationInput" class="block text-sm font-medium text-gray-700">
                  To proceed, please type "<span class="font-semibold text-yellow-700">{{ confirmationPhrase }}</span>" below:
                </label>
                <input 
                  id="confirmationInput"
                  v-model="userInput" 
                  type="text" 
                  class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  :placeholder="confirmationPhrase"
                >
              </div>

              <div class="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  class="inline-flex justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 transition-colors duration-150"
                  @click="closeModal"
                >
                  {{ cancelButtonText }}
                </button>
                <button
                  type="button"
                  :disabled="isConfirmDisabled"
                  class="inline-flex justify-center rounded-md border border-transparent bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                  @click="confirmModal"
                >
                   <Icon v-if="isLoading" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4 inline-block" />
                  {{ isLoading ? loadingConfirmButtonText : confirmButtonText }}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild } from '@headlessui/vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: 'Proceed with Caution',
  },
  message: {
    type: String,
    default: 'The action you are about to take is critical and can have significant impacts on the system. Please be sure before proceeding.',
  },
  confirmButtonText: {
    type: String,
    default: 'I Understand, Proceed',
  },
  loadingConfirmButtonText: {
    type: String,
    default: 'Processing...',
  },
  cancelButtonText: {
    type: String,
    default: 'Cancel',
  },
  confirmationPhrase: {
    type: String,
    default: null, // e.g., "PROCEED"
  },
  isLoading: {
    type: Boolean,
    default: false,
  }
});

const emit = defineEmits(['confirmed', 'closed']);

const userInput = ref('');

const isConfirmDisabled = computed(() => {
  if (props.isLoading) return true;
  if (props.confirmationPhrase) {
    return userInput.value !== props.confirmationPhrase;
  }
  return false;
});

const closeModal = () => {
  if (props.isLoading) return; // Don't allow close if an action is processing
  userInput.value = ''; // Reset for next time
  emit('closed');
};

const confirmModal = () => {
  if (isConfirmDisabled.value) return;
  emit('confirmed');
  // userInput.value = ''; // Resetting here might be too soon if confirm action fails and modal reappears
};

// Reset userInput when modal is opened/closed or phrase changes
watch(() => props.isOpen, (newVal: boolean) => {
  if (!newVal) {
    userInput.value = '';
  }
});
watch(() => props.confirmationPhrase, () => {
  userInput.value = '';
});

</script> 