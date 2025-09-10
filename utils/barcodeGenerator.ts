// Professional barcode generation utilities for Code 128 and QR codes

export interface BarcodeConfig {
  width: number;
  height: number;
  fontSize: number;
  margin: number;
  showText: boolean;
  format: 'CODE128' | 'QR';
}

// Proper Code 128 patterns - each array represents [bar, space, bar, space, bar, space] widths
const CODE128_PATTERNS = [
  [2,1,2,2,2,2], [2,2,2,1,2,2], [2,2,2,2,2,1], [1,2,1,2,2,3], [1,2,1,3,2,2], [1,3,1,2,2,2], [1,2,2,2,1,3], [1,2,2,3,1,2], [1,3,2,2,1,2], [2,2,1,2,1,3],
  [2,2,1,3,1,2], [2,3,1,2,1,2], [1,1,2,2,3,2], [1,2,2,1,3,2], [1,2,2,2,3,1], [1,1,3,2,2,2], [1,2,3,1,2,2], [1,2,3,2,2,1], [2,2,3,2,1,1], [2,2,1,1,3,2],
  [2,2,1,2,3,1], [2,1,3,2,1,2], [2,2,3,1,1,2], [3,1,2,1,3,1], [3,1,1,2,2,2], [3,2,1,1,2,2], [3,2,1,2,2,1], [3,1,2,2,1,2], [3,2,2,1,1,2], [3,2,2,2,1,1],
  [2,1,2,1,2,3], [2,1,2,3,2,1], [2,3,2,1,2,1], [1,1,1,3,2,3], [1,3,1,1,2,3], [1,3,1,3,2,1], [1,1,2,3,1,3], [1,3,2,1,1,3], [1,3,2,3,1,1], [2,1,1,3,1,3],
  [2,3,1,1,1,3], [2,3,1,3,1,1], [1,1,2,1,3,3], [1,1,2,3,3,1], [1,3,2,1,3,1], [1,1,3,1,2,3], [1,1,3,3,2,1], [1,3,3,1,2,1], [3,1,3,1,2,1], [2,1,1,3,3,1],
  [2,3,1,1,3,1], [2,1,3,1,1,3], [2,1,3,3,1,1], [2,1,3,1,3,1], [3,1,1,1,2,3], [3,1,1,3,2,1], [3,3,1,1,2,1], [3,1,2,1,1,3], [3,1,2,3,1,1], [3,3,2,1,1,1],
  [3,1,4,1,1,1], [2,2,1,4,1,1], [4,3,1,1,1,1], [1,1,1,2,2,4], [1,1,1,4,2,2], [1,2,1,1,2,4], [1,2,1,4,2,1], [1,4,1,1,2,2], [1,4,1,2,2,1], [1,1,2,2,1,4],
  [1,1,2,4,1,2], [1,2,2,1,1,4], [1,2,2,4,1,1], [1,4,2,1,1,2], [1,4,2,2,1,1], [2,4,1,2,1,1], [2,2,1,1,1,4], [4,1,3,1,1,1], [2,4,1,1,1,2], [1,3,4,1,1,1],
  [1,1,1,2,4,2], [1,2,1,1,4,2], [1,2,1,2,4,1], [1,1,4,2,1,2], [1,2,4,1,1,2], [1,2,4,2,1,1], [4,1,1,2,1,2], [4,2,1,1,1,2], [4,2,1,2,1,1], [2,1,2,1,4,1],
  [2,1,4,1,2,1], [4,1,2,1,2,1], [1,1,1,1,4,3], [1,1,1,3,4,1], [1,3,1,1,4,1], [1,1,4,1,1,3], [1,1,4,3,1,1], [4,1,1,1,1,3], [4,1,1,3,1,1], [1,1,3,1,4,1],
  [1,1,4,1,3,1], [3,1,1,1,4,1], [4,1,1,1,3,1], [2,1,1,4,1,2], [2,1,1,2,1,4], [2,1,1,2,3,2], [2,3,3,1,1,1,2]
];

// Code 128B character mapping (ASCII 32-127)
const CODE128B_CHARS = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

// Special codes
const START_B = 104;
const STOP = 106;



export class BarcodeGenerator {
  /**
   * Generate a Code 128 barcode on a canvas
   */
  static async generateCode128(canvas: HTMLCanvasElement, data: string, config: BarcodeConfig): Promise<void> {
    try {
      // Dynamically import JsBarcode
      const JsBarcode = await import('jsbarcode');
      
      JsBarcode.default(canvas, data, {
        format: "CODE128",
        width: 3,
        height: config.height - (config.showText ? 25 : 10),
        displayValue: config.showText,
        fontSize: config.fontSize,
        margin: config.margin,
        background: "#ffffff",
        lineColor: "#000000",
        textMargin: 5,
        valid: (valid: boolean) => {
          if (!valid) {
            console.warn('Invalid barcode data:', data);
          }
        }
      });
    } catch (error) {
      console.error('JsBarcode generation failed:', error);
      // Fallback to text display
      const ctx = canvas.getContext('2d');
      if (ctx) {
        this.drawTextFallback(ctx, data, config);
      }
    }
  }

  /**
   * Draw Code 128 optimized for hardware scanners like Tea Digital 5100
   */
  private static drawSimpleBarcode(ctx: CanvasRenderingContext2D, data: string, config: BarcodeConfig): void {
    const textHeight = config.showText ? config.fontSize + 8 : 0;
    const barcodeHeight = config.height - config.margin * 2 - textHeight;
    
    // Generate proper Code 128 pattern
    const pattern = this.generateCode128Pattern(data);
    
    // Calculate bar dimensions optimized for hardware scanners
    const quietZone = 20; // Larger quiet zone for hardware scanners
    const availableWidth = config.width - (config.margin * 2) - (quietZone * 2);
    const minBarWidth = 3; // Minimum 3px bar width for reliable scanning
    const barWidth = Math.max(minBarWidth, availableWidth / pattern.length);
    
    // Draw quiet zone (white space before barcode)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, config.width, config.height);
    
    // Draw the barcode with optimized settings
    ctx.fillStyle = '#000000';
    let x = config.margin + quietZone;
    
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === 1) {
        // Draw bars with sharp edges
        ctx.fillRect(Math.floor(x), config.margin, Math.ceil(barWidth), barcodeHeight);
      }
      x += barWidth;
    }

    // Draw text with better positioning
    if (config.showText) {
      ctx.fillStyle = '#000000';
      ctx.font = `${config.fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      // Position text in the center
      const textX = config.width / 2;
      const textY = config.margin + barcodeHeight + 6;
      
      // Add white background behind text for better readability
      const textMetrics = ctx.measureText(data);
      const textWidth = textMetrics.width;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(textX - textWidth/2 - 2, textY - 2, textWidth + 4, config.fontSize + 4);
      
      // Draw the text
      ctx.fillStyle = '#000000';
      ctx.fillText(data, textX, textY);
    }
  }

  /**
   * Fallback to text display if barcode generation fails
   */
  private static drawTextFallback(ctx: CanvasRenderingContext2D, data: string, config: BarcodeConfig): void {
    ctx.fillStyle = '#000000';
    ctx.font = `${config.fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data, config.width / 2, config.height / 2);
  }

  /**
   * Generate proper Code 128B pattern (the one that worked with your phone)
   */
  private static generateCode128Pattern(data: string): number[] {
    const values: number[] = [];
    
    // Add start code B (104)
    values.push(START_B);
    
    // Calculate checksum starting with Start B value
    let checksum = START_B;
    
    // Add data characters
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      const charIndex = CODE128B_CHARS.indexOf(char);
      
      if (charIndex === -1) {
        // Replace unsupported characters with space
        values.push(0); // Space is at index 0
        checksum += 0 * (i + 1);
      } else {
        values.push(charIndex);
        checksum += charIndex * (i + 1);
      }
    }
    
    // Add checksum character
    const checksumValue = checksum % 103;
    values.push(checksumValue);
    
    // Add stop pattern (106)
    values.push(STOP);
    
    // Convert values to binary pattern
    const binaryPattern: number[] = [];
    
    for (const value of values) {
      if (value < CODE128_PATTERNS.length) {
        const pattern = CODE128_PATTERNS[value];
        if (pattern) {
          // Each pattern is [bar, space, bar, space, bar, space]
          for (let i = 0; i < pattern.length; i++) {
            const width = pattern[i];
            const isBar = i % 2 === 0;
            
            // Add the appropriate number of 1s (bars) or 0s (spaces)
            for (let j = 0; j < width; j++) {
              binaryPattern.push(isBar ? 1 : 0);
            }
          }
        }
      }
    }
    
    return binaryPattern;
  }

  /**
   * Generate a QR code on a canvas (simplified version)
   */
  static generateQRCode(canvas: HTMLCanvasElement, data: string, config: BarcodeConfig): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas context');

    // Set high resolution for crisp rendering
    const scale = window.devicePixelRatio || 2;
    canvas.width = config.width * scale;
    canvas.height = config.height * scale;
    canvas.style.width = config.width + 'px';
    canvas.style.height = config.height + 'px';
    ctx.scale(scale, scale);

    // Clear canvas
    ctx.clearRect(0, 0, config.width, config.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, config.width, config.height);

    // Calculate QR code dimensions
    const textHeight = config.showText ? config.fontSize + 4 : 0;
    const qrSize = Math.min(config.width, config.height - textHeight) - config.margin * 2;
    const gridSize = 21; // Standard QR code size
    const cellSize = qrSize / gridSize;
    const offsetX = (config.width - qrSize) / 2;
    const offsetY = config.margin;

    // Generate QR pattern (simplified)
    const pattern = this.generateQRPattern(data, gridSize);
    
    // Draw QR code
    ctx.fillStyle = '#000000';
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (pattern[row][col]) {
          ctx.fillRect(
            offsetX + col * cellSize,
            offsetY + row * cellSize,
            cellSize,
            cellSize
          );
        }
      }
    }

    // Draw text if enabled
    if (config.showText) {
      ctx.fillStyle = '#000000';
      ctx.font = `${config.fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(data, config.width / 2, offsetY + qrSize + 2);
    }
  }

  /**
   * Generate simplified QR pattern
   */
  private static generateQRPattern(data: string, size: number): boolean[][] {
    const pattern: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));
    
    // Add finder patterns (corners)
    this.addFinderPattern(pattern, 0, 0);
    this.addFinderPattern(pattern, 0, size - 7);
    this.addFinderPattern(pattern, size - 7, 0);
    
    // Add timing patterns
    for (let i = 8; i < size - 8; i++) {
      pattern[6][i] = i % 2 === 0;
      pattern[i][6] = i % 2 === 0;
    }
    
    // Add data pattern (simplified)
    let dataIndex = 0;
    for (let row = 1; row < size - 1; row++) {
      for (let col = 1; col < size - 1; col++) {
        if (!this.isReservedArea(row, col, size)) {
          const charIndex = dataIndex % data.length;
          const char = data[charIndex];
          pattern[row][col] = (char.charCodeAt(0) + row + col) % 3 === 0;
          dataIndex++;
        }
      }
    }
    
    return pattern;
  }

  /**
   * Add finder pattern to QR code
   */
  private static addFinderPattern(pattern: boolean[][], startRow: number, startCol: number): void {
    const finderPattern = [
      [true, true, true, true, true, true, true],
      [true, false, false, false, false, false, true],
      [true, false, true, true, true, false, true],
      [true, false, true, true, true, false, true],
      [true, false, true, true, true, false, true],
      [true, false, false, false, false, false, true],
      [true, true, true, true, true, true, true]
    ];
    
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 7; col++) {
        if (startRow + row < pattern.length && startCol + col < pattern[0].length) {
          pattern[startRow + row][startCol + col] = finderPattern[row][col];
        }
      }
    }
  }

  /**
   * Check if position is in reserved area
   */
  private static isReservedArea(row: number, col: number, size: number): boolean {
    // Finder patterns
    if ((row < 9 && col < 9) || 
        (row < 9 && col >= size - 8) || 
        (row >= size - 8 && col < 9)) {
      return true;
    }
    
    // Timing patterns
    if (row === 6 || col === 6) {
      return true;
    }
    
    return false;
  }

  /**
   * Validate barcode data
   */
  static validateBarcode(barcode: string): boolean {
    // Check format: PREFIX-ORDER-ITEM
    const parts = barcode.split('-');
    if (parts.length !== 3) return false;
    
    const [prefix, orderNumber, itemId] = parts;
    
    // Validate prefix (3 characters)
    if (prefix.length !== 3) return false;
    
    // Validate order number (not empty)
    if (!orderNumber.trim()) return false;
    
    // Validate item ID (not empty)
    if (!itemId.trim()) return false;
    
    return true;
  }

  /**
   * Get default configuration for packing slips (optimized for scanning)
   */
  static getPackingSlipConfig(): BarcodeConfig {
    return {
      width: 280,
      height: 70,
      fontSize: 10,
      margin: 8,
      showText: true,
      format: 'CODE128'
    };
  }

  /**
   * Get high-resolution configuration for printing
   */
  static getPrintConfig(): BarcodeConfig {
    return {
      width: 900,
      height: 120,
      fontSize: 26,
      margin: 10,
      showText: true,
      format: 'CODE128'
    };
  }
}