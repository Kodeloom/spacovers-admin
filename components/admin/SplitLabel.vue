<template>
  <div class="split-label-container">
    <!-- Label Preview Controls -->
    <div class="preview-controls mb-4" v-if="showPreview">
      <h3 class="text-lg font-semibold text-gray-800 mb-2">
        Packing Slip Preview - {{ orderItem.item?.name }}
      </h3>
      <div class="flex gap-4 items-center">

      </div>
    </div>

    <!-- Split Label Parts Container -->
    <div class="split-label-parts" :class="{ 'print-layout': isPrintMode }" :data-print-mode="isPrintMode">
      <!-- Top Part (3x3 inches) -->
      <div class="label-part top-part" :ref="(el: any) => setLabelPartRef(el, 'top')">
        <div class="label-header">
          <div class="customer-info">
            <div class="customer-label">Customer:</div>
            <div class="customer-name">{{ optimizedInfo.customer }}</div>
          </div>
          <div class="order-info">
            <div class="order-number">Order #{{ orderNumber }}</div>
            <div class="order-date">{{ optimizedInfo.date }}</div>
          </div>
        </div>

        <div class="barcode-section">
          <canvas :ref="(el: any) => setBarcodeCanvas(el, 'top')" class="barcode-canvas" width="200"
            height="50"></canvas>
        </div>

        <div class="specs-section">
          <div class="spec-grid">
            <div class="spec-item">
              <span class="spec-label">Type:</span>
              <span class="spec-value">{{ optimizedInfo.type }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Skirt Length:</span>
              <span class="spec-value">{{ getProductAttribute('skirtLength') || '1' }}"</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Color:</span>
              <span class="spec-value">{{ optimizedInfo.color }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">TD's:</span>
              <span class="spec-value">{{ getProductAttribute('tieDownsQty') || '4' }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Size:</span>
              <span class="spec-value">{{ optimizedInfo.size }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Location:</span>
              <span class="spec-value">{{ getProductAttribute('tieDownPlacement') === 'HANDLE_SIDE' ? 'Handle Side' : (getProductAttribute('tieDownPlacement') || 'Standard') }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Shape:</span>
              <span class="spec-value">{{ getProductAttribute('shape') || 'Round' }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">TD Distance:</span>
              <span class="spec-value">{{ getProductAttribute('distance') || '4' }}"</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">TD Length:</span>
              <span class="spec-value">{{ getProductAttribute('tieDownLength') || '-' }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Radius:</span>
              <span class="spec-value">{{ getProductAttribute('radiusSize') || '12' }}"</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Foam:</span>
              <span class="spec-value">{{ getProductAttribute('foamUpgrade') || '54' }}"</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Skirt Type:</span>
              <span class="spec-value">{{ getProductAttribute('skirtType') === 'CONN' ? 'Connected' : (getProductAttribute('skirtType') || 'Standard') }}</span>
            </div>
          </div>

          <div class="upgrades-section" v-if="extractUpgrades().length > 0">
            <div class="spec-item" v-for="upgrade in extractUpgrades()" :key="upgrade.name">
              <span class="spec-label">{{ upgrade.name }}:</span>
              <span class="spec-value">{{ upgrade.value }}</span>
            </div>
          </div>
        </div>


      </div>

      <!-- Bottom Part (3x2 inches) -->
      <div class="label-part bottom-part" :ref="(el: any) => setLabelPartRef(el, 'bottom')">
        <div class="label-header compact">
          <div class="customer-info compact">
            <span class="customer-label">Customer:</span>
            <span class="customer-name">{{ optimizedInfo.customer }}</span>
          </div>
          <div class="order-info compact">
            <div class="order-number">{{ orderNumber }}</div>
            <div class="order-date">{{ optimizedInfo.date }}</div>
          </div>
        </div>

        <div class="barcode-section compact">
          <canvas :ref="(el: any) => setBarcodeCanvas(el, 'bottom')" class="barcode-canvas compact" width="140"
            height="40"></canvas>
        </div>

        <div class="specs-section compact">
          <div class="spec-list">
            <div class="spec-item compact">
              <span class="spec-label">Type:</span>
              <span class="spec-value">{{ optimizedInfo.type }}</span>
            </div>
            <div class="spec-item compact">
              <span class="spec-label">Shape:</span>
              <span class="spec-value">{{ getProductAttribute('shape') || 'Round' }}</span>
            </div>
            <div class="spec-item compact">
              <span class="spec-label">Color:</span>
              <span class="spec-value">{{ optimizedInfo.color }}</span>
            </div>
            <div class="spec-item compact">
              <span class="spec-label">Skirt:</span>
              <span class="spec-value">{{ getProductAttribute('skirtLength') || '1' }}"</span>
            </div>
            <div class="spec-item compact">
              <span class="spec-label">Size:</span>
              <span class="spec-value">{{ optimizedInfo.size }}</span>
            </div>
            <div class="spec-item compact">
              <span class="spec-label">Ties:</span>
              <span class="spec-value">{{ getProductAttribute('tieDownsQty') || '4' }}</span>
            </div>
            <div class="spec-item compact">
              <span class="spec-label">TD Len:</span>
              <span class="spec-value">{{ getProductAttribute('tieDownLength') || '-' }}</span>
            </div>
            <div class="spec-item compact" v-for="upgrade in extractUpgrades()" :key="upgrade.name">
              <span class="spec-label">{{ upgrade.name }}:</span>
              <span class="spec-value">{{ upgrade.value }}</span>
            </div>
          </div>
        </div>


      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue';
import { BarcodeGenerator } from '~/utils/barcodeGenerator';
import { optimizeLabelInfo, type OptimizedLabelInfo } from '~/utils/labelOptimizer';

interface Props {
  orderItem: any;
  order: any;
  showPreview?: boolean;
  isPrintMode?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showPreview: true,
  isPrintMode: false,
});

const labelPartRefs = ref<Record<string, HTMLElement>>({});
const barcodeCanvases = ref<Record<string, HTMLCanvasElement>>({});
const barcodeType = ref<'barcode'>('barcode');

// Compute order number
const orderNumber = computed(() => {
  return props.order?.salesOrderNumber || props.order?.id?.slice(-8) || 'N/A';
});

// Optimize label information for compact display
const optimizedInfo = computed((): OptimizedLabelInfo => {
  const attrs = props.orderItem?.productAttributes
  
  // Convert productType enum to human readable format
  const getProductTypeDisplay = (productType: string) => {
    switch (productType) {
      case 'SPA_COVER':
        return 'Cover for Cover'
      case 'POOL_COVER':
        return 'Pool Cover'
      case 'HOT_TUB_COVER':
        return 'Hot Tub Cover'
      default:
        return productType || 'Standard'
    }
  }
  
  const orderItemData = {
    customerName: props.order?.customer?.name || '',
    type: getProductTypeDisplay(attrs?.productType),
    color: attrs?.color || 'Standard',
    size: attrs?.size || 'Custom',
    shape: attrs?.shape || 'Standard',
    radiusSize: attrs?.radiusSize || '',
    skirtType: attrs?.skirtType === 'CONN' ? 'Connected' : (attrs?.skirtType || 'Standard'),
    skirtLength: attrs?.skirtLength || '0',
    tieDownsQty: attrs?.tieDownsQty || '0',
    tieDownPlacement: attrs?.tieDownPlacement === 'HANDLE_SIDE' ? 'Handle Side' : (attrs?.tieDownPlacement || 'Standard'),
    distance: attrs?.distance || '0',
    foam: attrs?.foamUpgrade || 'Standard',
    thickness: attrs?.thickness || 'Standard',
    date: props.order?.createdAt || new Date(),
    upgrades: [], // We handle upgrades separately now
    barcode: generateBarcodeText(),
    id: props.orderItem?.id || '',
  };

  console.log('🔍 DEBUG - orderItemData before optimization:', {
    barcode: orderItemData.barcode,
    id: orderItemData.id
  });

  const result = optimizeLabelInfo(orderItemData, {
    maxCustomerLength: 12, // Shorter for split labels
    maxUpgradeLength: 15,   // Shorter for compact display
    maxTypeLength: 10,      // Shorter for split labels
    maxColorLength: 8,      // Shorter for split labels
  });

  console.log('🔍 DEBUG - optimizedInfo result:', {
    barcode: result.barcode
  });

  return result;
});

// Generate barcode text
function generateBarcodeText(): string {
  const result = `${orderNumber.value}-${props.orderItem?.id || ''}`;
  console.log('🔍 DEBUG - generateBarcodeText:', {
    orderNumber: orderNumber.value,
    orderItemId: props.orderItem?.id,
    result: result
  });
  return result;
}

// Get product attribute value
function getProductAttribute(attributeName: string): string {
  if (!props.orderItem?.productAttributes) return '';

  const value = props.orderItem.productAttributes[attributeName];

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (value === '' || value === null || value === undefined) {
    return '';
  }

  return value.toString();
}

// Extract upgrades from product attributes
function extractUpgrades(): Array<{name: string, value: string}> {
  if (!props.orderItem?.productAttributes) return [];

  const upgrades: Array<{name: string, value: string}> = [];
  const attributes = props.orderItem.productAttributes;

  // Check for upgrade attributes with their values
  const upgradeFields = [
    // { field: 'foamUpgrade', label: 'Foam' },
    { field: 'doublePlasticWrapUpgrade', label: 'Double Wrap' },
    { field: 'webbingUpgrade', label: 'Webbing' },
    { field: 'metalForLifterUpgrade', label: 'Metal Lifter' },
    { field: 'steamStopperUpgrade', label: 'Steam Stop' },
    { field: 'fabricUpgrade', label: 'Fabric' },
    { field: 'extraLongSkirt', label: 'Extra Long Skirt' }
  ];

  upgradeFields.forEach(({ field, label }) => {
    const value = attributes[field];
    if (value && value !== 'No' && value !== false && value !== '') {
      // If it's a boolean true, show "Yes", otherwise show the actual value
      const displayValue = value === true ? 'Yes' : value.toString();
      upgrades.push({ name: label, value: displayValue });
    }
  });

  // Add extra handle quantity if present
  if (attributes.extraHandleQty && attributes.extraHandleQty !== '0') {
    upgrades.push({ name: 'Extra Handles', value: `+${attributes.extraHandleQty}` });
  }

  return upgrades;
}

// Set label part reference
function setLabelPartRef(el: any, part: string) {
  if (el) {
    labelPartRefs.value[part] = el;
  }
}

// Set barcode canvas reference
function setBarcodeCanvas(el: any, part: string) {
  if (el) {
    barcodeCanvases.value[part] = el;
    nextTick(() => generateBarcodeImage(part));
  }
}

// Generate barcode image for a specific part
async function generateBarcodeImage(part: string) {
  const canvas = barcodeCanvases.value[part];
  if (!canvas) return;

  const barcodeText = optimizedInfo.value.barcode;

  console.log('HERE');
  console.log(barcodeText);

  try {
    // Configure barcode for different parts - using the original working approach
    const config = part === 'top' ? {
      width: 200,
      height: 50,
      fontSize: 8,
      margin: 5,
      showText: true,
      format: 'CODE128' as const
    } : {
      width: 140,
      height: 40,
      fontSize: 7,
      margin: 3,
      showText: true,
      format: 'CODE128' as const
    };

    // Use the original BarcodeGenerator method that was working
    await BarcodeGenerator.generateCode128(canvas, barcodeText, config);
  } catch (error) {
    console.error('Error generating barcode for', part, ':', error);

    // Fallback to text display if barcode generation fails
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const width = part === 'top' ? 200 : 140;
      const height = part === 'top' ? 50 : 40;

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#000000';
      ctx.font = `${part === 'top' ? 8 : 7}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(barcodeText, width / 2, height / 2);
    }
  }
}

// Manual barcode generation as final fallback
function generateManualBarcode(canvas: HTMLCanvasElement, text: string, part: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = part === 'top' ? 200 : 140;
  const height = part === 'top' ? 50 : 40;
  const fontSize = part === 'top' ? 8 : 7;

  // Set canvas dimensions with high DPI for crisp rendering
  const scale = window.devicePixelRatio || 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.scale(scale, scale);

  // Clear with white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Calculate barcode dimensions
  const textHeight = fontSize + 4;
  const barcodeHeight = height - textHeight - 8;
  const barcodeWidth = width - 16;
  const startX = 8;
  const startY = 4;

  // Generate a more realistic barcode pattern
  ctx.fillStyle = '#000000';

  // Create start pattern
  const startPattern = [3, 1, 1, 1, 1, 1]; // Start bars
  let x = startX;
  const minBarWidth = part === 'top' ? 1.5 : 1;

  // Draw start pattern
  for (let i = 0; i < startPattern.length; i++) {
    const barWidth = startPattern[i] * minBarWidth;
    if (i % 2 === 0) { // Even indices are bars
      ctx.fillRect(x, startY, barWidth, barcodeHeight);
    }
    x += barWidth;
  }

  // Generate data pattern based on text
  const availableWidth = barcodeWidth - (x - startX) - (6 * minBarWidth); // Reserve space for end pattern
  const charWidth = availableWidth / text.length;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);

    // Create pattern for each character (6 elements: bar-space-bar-space-bar-space)
    const pattern = [
      ((charCode & 1) ? 2 : 1) * minBarWidth,        // Bar
      ((charCode >> 1 & 1) ? 2 : 1) * minBarWidth,  // Space
      ((charCode >> 2 & 1) ? 2 : 1) * minBarWidth,  // Bar
      ((charCode >> 3 & 1) ? 2 : 1) * minBarWidth,  // Space
      ((charCode >> 4 & 1) ? 2 : 1) * minBarWidth,  // Bar
      ((charCode >> 5 & 1) ? 1 : 2) * minBarWidth   // Space
    ];

    for (let j = 0; j < pattern.length && x < startX + barcodeWidth - (6 * minBarWidth); j++) {
      if (j % 2 === 0) { // Even indices are bars
        ctx.fillRect(x, startY, pattern[j], barcodeHeight);
      }
      x += pattern[j];
    }
  }

  // Draw end pattern
  const endPattern = [1, 1, 3, 1, 1, 1]; // End bars
  for (let i = 0; i < endPattern.length; i++) {
    const barWidth = endPattern[i] * minBarWidth;
    if (i % 2 === 0) { // Even indices are bars
      ctx.fillRect(x, startY, barWidth, barcodeHeight);
    }
    x += barWidth;
  }

  // Draw text below barcode
  ctx.fillStyle = '#000000';
  ctx.font = `${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(text, width / 2, startY + barcodeHeight + 2);

  console.log(`Manual barcode generated for ${part} part: ${text}`);
}



// Watch for changes and regenerate barcodes
watch(() => props.orderItem, () => {
  nextTick(() => {
    Object.keys(barcodeCanvases.value).forEach(part => {
      generateBarcodeImage(part);
    });
  });
}, { deep: true });

// Generate barcodes on mount
onMounted(() => {
  nextTick(() => {
    Object.keys(barcodeCanvases.value).forEach(part => {
      generateBarcodeImage(part);
    });
  });
});

// Expose methods for parent components
defineExpose({
  generateBarcodeImage,
  getLabelPartRef: (part: string) => labelPartRefs.value[part],
  getBarcodeType: () => barcodeType.value,
});
</script>

<style scoped>
/* Split Label Container */
.split-label-container {
  font-family: Arial, sans-serif;
}

.split-label-parts {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.split-label-parts.print-layout {
  flex-direction: column;
  gap: 0;
}

/* Label Parts Base Styles */
.label-part {
  border: 2px solid #000;
  background: #fff;
  box-sizing: border-box;
  overflow: hidden;
  font-size: 8pt;
  line-height: 1.1;
}

/* Top Part (3x3 inches) */
.label-part.top-part {
  width: 216px;
  /* 3 inches * 72 DPI */
  height: 216px;
  /* 3 inches * 72 DPI */
  padding: 6px;
  display: flex;
  flex-direction: column;
}

/* Bottom Part (3x2 inches) */
.label-part.bottom-part {
  width: 216px;
  /* 3 inches * 72 DPI */
  height: 144px;
  /* 2 inches * 72 DPI */
  padding: 4px;
  display: flex;
  flex-direction: column;
}

/* Remove gap between parts when printing - make them touch */
.split-label-container .split-label-parts.print-layout .label-part.top-part {
  margin-bottom: -6px !important;
  border-bottom: none !important;
}

.split-label-container .split-label-parts.print-layout .label-part.bottom-part {
  margin-top: -6px !important;
  border-top: none !important;
}

/* Alternative approach - target by data attribute */
.split-label-container .split-label-parts[data-print-mode="true"] .label-part.top-part {
  margin-bottom: -6px !important;
  border-bottom: none !important;
}

.split-label-container .split-label-parts[data-print-mode="true"] .label-part.bottom-part {
  margin-top: -6px !important;
  border-top: none !important;
}

/* Print media query as backup */
@media print {
  .split-label-container .split-label-parts .label-part.top-part {
    margin-bottom: -6px !important;
    border-bottom: none !important;
  }
  
  .split-label-container .split-label-parts .label-part.bottom-part {
    margin-top: -6px !important;
    border-top: none !important;
  }
}

/* Label Header */
.label-header {
  border-bottom: 1px solid #000;
  margin-bottom: 4px;
  padding-bottom: 3px;
}

.label-header.compact {
  margin-bottom: 3px;
  padding-bottom: 2px;
}

.customer-info {
  margin-bottom: 3px;
}

.customer-info.compact {
  margin-bottom: 2px;
  font-size: 7pt;
}

.customer-label {
  font-weight: bold;
  display: inline;
}

.customer-name {
  font-weight: bold;
  margin-left: 4px;
  display: inline;
}

.order-info {
  text-align: right;
  font-size: 7pt;
}

.order-info.compact {
  font-size: 6pt;
}

.order-number {
  font-weight: bold;
}

.order-date {
  margin-top: 1px;
}

/* Barcode Section */
.barcode-section {
  text-align: center;
  margin: 4px 0;
  flex-shrink: 0;
}

.barcode-section.compact {
  margin: 3px 0;
}

.barcode-canvas {
  display: block;
  margin: 0 auto;
  max-width: 100%;
  height: auto;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  image-rendering: pixelated;
}

.barcode-canvas.compact {
  max-width: 100%;
}

/* Specifications Section */
.specs-section {
  flex: 1;
  margin: 4px 0;
}

.specs-section.compact {
  margin: 3px 0;
}

.spec-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  margin-bottom: 4px;
}

.spec-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.spec-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px dotted #ccc;
  padding-bottom: 1px;
  margin-bottom: 2px;
}

.spec-item.compact {
  margin-bottom: 1px;
  font-size: 6pt;
}

.spec-item.upgrades {
  grid-column: 1 / -1;
  margin-top: 2px;
}

.spec-label {
  font-weight: bold;
  flex-shrink: 0;
}

.spec-value {
  text-align: right;
  margin-left: 4px;
  word-break: break-word;
}

.upgrades-section {
  margin-top: 4px;
}



/* Preview Controls */
.preview-controls {
  padding: 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

/* Print Mode Adjustments */
@media print {
  .preview-controls {
    display: none;
  }

  .split-label-parts {
    flex-direction: column;
    gap: 0.25rem;
  }

  .label-part {
    page-break-inside: avoid;
  }

  /* Ensure exact print dimensions */
  .label-part.top-part {
    width: 3in;
    height: 3in;
  }

  .label-part.bottom-part {
    width: 3in;
    height: 2in;
  }
}

/* Responsive adjustments for smaller screens */
@media (max-width: 640px) {
  .split-label-parts {
    flex-direction: column;
    align-items: center;
  }

  .label-part.top-part,
  .label-part.bottom-part {
    transform: scale(0.8);
    transform-origin: top center;
  }
}
</style>