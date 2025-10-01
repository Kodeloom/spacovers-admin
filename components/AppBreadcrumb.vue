<template>
  <nav class="flex mb-4" aria-label="Breadcrumb">
    <ol class="inline-flex items-center space-x-1 md:space-x-3">
      <li v-for="(item, index) in breadcrumbItems" :key="index" class="inline-flex items-center">
        <template v-if="index === 0">
          <NuxtLink
            v-if="!item.current"
            :to="item.path"
            class="inline-flex items-center text-sm font-medium text-gray-700 hover:text-indigo-600"
          >
            <Icon :name="item.icon" class="w-4 h-4 mr-2" />
            {{ item.name }}
          </NuxtLink>
          <span v-else class="inline-flex items-center text-sm font-medium text-gray-500">
            <Icon :name="item.icon" class="w-4 h-4 mr-2" />
            {{ item.name }}
          </span>
        </template>
        <template v-else>
          <Icon name="heroicons:chevron-right-20-solid" class="w-5 h-5 text-gray-400" />
          <NuxtLink
            v-if="!item.current"
            :to="item.path"
            class="ml-1 text-sm font-medium text-gray-700 hover:text-indigo-600 md:ml-2"
          >
            {{ item.name }}
          </NuxtLink>
          <span v-else class="ml-1 text-sm font-medium text-gray-500 md:ml-2">
            {{ item.name }}
          </span>
        </template>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
interface BreadcrumbItem {
  name: string;
  path: string;
  icon?: string;
  current?: boolean;
}

interface Props {
  items: BreadcrumbItem[];
}

const props = defineProps<Props>();

const breadcrumbItems = computed(() => {
  return props.items.map((item, index) => ({
    ...item,
    current: index === props.items.length - 1
  }));
});
</script>