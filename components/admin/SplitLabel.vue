<template>
  <div class="split-label-container">
    <!-- Label Preview Controls -->
    <div class="preview-controls mb-4" v-if="showPreview">
      <h3 class="text-lg font-semibold text-gray-800 mb-2">
        Split Label Preview - {{ orderItem.item?.name }}
      </h3>
      <div class="flex gap-4 items-center">
        <button
          @click="toggleBarcodeType"
          class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Icon name="heroicons:qr-code" class="mr-1 h-3 w-3" />
          {{ barcodeType === 'barcode' ? 'Switch to QR' : 'Switch to Barcode' }}
        </button>
      </div>
    </div>

    <!-- Split Label Parts Container -->
    <div class="split-label-parts" :class="{ 'print-layout': isPrintMode }">
      <!-- Top Part (3x3 inches) -->
      <div 
        class="label-part top-part"
        :ref="(el: any) => setLabelPartRef(el, 'top')"
      >
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
          <canvas 
            :ref="(el: any) => setBarcodeCanvas(el, 'top')" 
            class="barcode-canvas"
            width="200"
            height="50"
          ></canvas>
        </div>

        <div class="specs-section">
          <div class="spec-grid">
            <div class="spec-item">
              <span class="spec-label">Type:</span>
              <span class="spec-value">{{ optimizedInfo.type }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Color:</span>
              <span class="spec-value">{{ optimizedInfo.color }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Thickness:</span>
              <span class="spec-value">{{ optimizedInfo.thickness }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Size:</span>
              <span class="spec-value">{{ optimizedInfo.size }}</span>
            </div>
          </div>
          
          <div class="upgrades-section" v-if="optimizedInfo.upgrades">
            <div class="spec-item upgrades">
              <span class="spec-label">Upgrades:</span>
              <span class="spec-value">{{ optimizedInfo.upgrades }}</span>
            </div>
          </div>
        </div>

        <div class="label-footer">
          <div class="part-indicator">TOP PART</div>
        </div>
      </div>

      <!-- Bottom Part (2x3 inches) -->
      <div 
        class="label-part bottom-part"
        :ref="(el: any) => setLabelPartRef(el, 'bottom')"
      >
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
          <canvas 
            :ref="(el: any) => setBarcodeCanvas(el, 'bottom')" 
            class="barcode-canvas compact"
            width="140"
            height="40"
          ></canvas>
        </div>

        <div class="specs-section compact">
          <div class="spec-list">
            <div class="spec-item compact">
              <span class="spec-label">Type:</span>
              <span class="spec-value">{{ optimizedInfo.type }}</span>
            </div>
            <div class="spec-item compact">
              <span class="spec-label">Color:</span>
              <span class="spec-value">{{ optimizedInfo.color }}</span>
            </div>
            <div class="spec-item compact">
              <span class="spec-label">Thick:</span>
              <span class="spec-value">{{ optimizedInfo.thickness }}</span>
            </div>
            <div class="spec-item compact">
              <span class="spec-label">Size:</span>
              <span class="spec-value">{{ optimizedInfo.size }}</span>
            </div>
            <div class="spec-item compact" v-if="optimizedInfo.upgrades">
              <span class="spec-label">Up:</span>
              <span class="spec-value">{{ optimizedInfo.upgrades }}</span>
            </div>
          </div>
        </div>

        <div class="label-footer compact">
          <div class="part-indicator">BOTTOM PART</div>
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
const barcodeType = ref<'barcode' | 'qr'>('barcode');

// Compute order number
const orderNumber = computed(() => {
  return props.order?.salesOrderNumber || props.order?.id?.slice(-8) || 'N/A';
});

// Optimize label information for compact display
const optimizedInfo = computed((): OptimizedLabelInfo => {
  const orderItemData = {
    customerName: props.order?.customer?.name || '',
    thickness: getProductAttribute('thickness') || '',
    size: getProductAttribute('size') || '',
    type: props.orderItem?.item?.name || '',
    color: getProductAttribute('color') || '',
    date: props.order?.createdAt || new Date(),
    upgrades: extractUpgrades(),
    barcode: generateBarcodeText(),
    id: props.orderItem?.id || '',
  };

  return optimizeLabelInfo(orderItemData, {
    maxCustomerLength: 12, // Shorter for split labels
    maxUpgradeLength: 15,   // Shorter for compact display
    maxTypeLength: 10,      // Shorter for split labels
    maxColorLength: 8,      // Shorter for split labels
  });
});

// Generate barcode text
function generateBarcodeText(): string {
  return `${orderNumber.value}-${props.orderItem?.id || ''}`;
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
function extractUpgrades(): string[] {
  if (!props.orderItem?.productAttributes) return [];
  
  const upgrades: string[] = [];
  const attributes = props.orderItem.productAttributes;
  
  // Check for upgrade attributes
  const upgradeFields = [
    'foamUpgrade',
    'doublePlasticWrapUpgrade',
    'webbingUpgrade',
    'metalForLifterUpgrade',
    'steamStopperUpgrade',
    'fabricUpgrade',
    'extraLongSkirt'
  ];
  
  upgradeFields.forEach(field => {
    const value = attributes[field];
    if (value && value !== 'No' && value !== false && value !== '') {
      // Convert field name to readable format
      const readable = field
        .replace(/Upgrade$/, '')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .replace(/^./, str => str.toUpperCase());
      upgrades.push(readable);
    }
  });
  
  // Add extra handle quantity if present
  if (attributes.extraHandleQty && attributes.extraHandleQty !== '0') {
    upgrades.push(`Extra Handle x${attributes.extraHandleQty}`);
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
  
  try {
    // Configure barcode for different parts
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
    
    if (barcodeType.value === 'barcode') {
      await BarcodeGenerator.generateCode128(canvas, barcodeText, config);
    } else {
      BarcodeGenerator.generateQRCode(canvas, barcodeText, config);
    }
  } catch (error) {
    console.error('Error generating barcode for', part, ':', error);
    
    // Fallback to text display
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

// Toggle between barcode and QR code
function toggleBarcodeType() {
  barcodeType.value = barcodeType.value === 'barcode' ? 'qr' : 'barcode';
  
  // Regenerate barcodes for both parts
  nextTick(() => {
    Object.keys(barcodeCanvases.value).forEach(part => {
      generateBarcodeImage(part);
    });
  });
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
  toggleBarcodeType,
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
  gap: 0.5rem;
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
  width: 216px;  /* 3 inches * 72 DPI */
  height: 216px; /* 3 inches * 72 DPI */
  padding: 6px;
  display: flex;
  flex-direction: column;
}

/* Bottom Part (2x3 inches) */
.label-part.bottom-part {
  width: 144px;  /* 2 inches * 72 DPI */
  height: 216px; /* 3 inches * 72 DPI */
  padding: 4px;
  display: flex;
  flex-direction: column;
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

/* Label Footer */
.label-footer {
  border-top: 1px solid #000;
  padding-top: 2px;
  margin-top: auto;
  text-align: center;
}

.label-footer.compact {
  padding-top: 1px;
}

.part-indicator {
  font-size: 6pt;
  font-weight: bold;
  color: #666;
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
    width: 2in;
    height: 3in;
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