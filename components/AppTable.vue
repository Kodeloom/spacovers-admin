<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            scope="col"
            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            :class="{ 'cursor-pointer hover:bg-gray-100': column.sortable }"
            @click="onSort(column)"
          >
            <div class="flex items-center">
              <span>{{ column.label }}</span>
              <span v-if="localSort.column === column.key" class="ml-1">
                <Icon
                  :name="localSort.direction === 'asc' ? 'heroicons:arrow-up-20-solid' : 'heroicons:arrow-down-20-solid'"
                  class="h-4 w-4"
                />
              </span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <tr v-if="pending">
          <td :colspan="columns.length" class="text-center py-4">
            <div class="flex justify-center items-center">
              <Icon name="svg-spinners:180-ring-with-bg" class="h-8 w-8 text-gray-500" />
              <span class="ml-2">Loading...</span>
            </div>
          </td>
        </tr>
        <tr v-else-if="rows.length === 0">
          <td :colspan="columns.length" class="text-center py-4 text-gray-500">
            No data available.
          </td>
        </tr>
        <tr v-for="(row, rowIndex) in rows" :key="rowIndex" class="hover:bg-gray-50">
          <td v-for="column in columns" :key="column.key" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <slot :name="`${column.key}-data`" :row="row">
              {{ getColumnData(row, column.key) }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue';

const props = defineProps({
  columns: {
    type: Array as () => { key: string; label: string; sortable?: boolean }[],
    required: true,
  },
  rows: {
    type: Array as () => Record<string, any>[],
    required: true,
  },
  pending: {
    type: Boolean,
    default: false,
  },
  sort: {
    type: Object as () => { column: string; direction: 'asc' | 'desc' },
    default: () => ({ column: '', direction: 'asc' }),
  },
});

const emit = defineEmits(['update:sort']);

const localSort = computed({
  get: () => props.sort,
  set: (value) => emit('update:sort', value),
});

function onSort(column: { key: string; sortable?: boolean }) {
  if (!column.sortable) return;

  if (localSort.value.column === column.key) {
    localSort.value.direction = localSort.value.direction === 'asc' ? 'desc' : 'asc';
  } else {
    localSort.value.column = column.key;
    localSort.value.direction = 'asc';
  }
}

function getColumnData(row: Record<string, any>, key: string) {
    return key.split('.').reduce((o, i) => (o ? o[i] : undefined), row);
}
</script>