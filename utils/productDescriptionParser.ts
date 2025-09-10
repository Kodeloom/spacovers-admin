export interface ParsedProductAttributes {
  productType: string;
  color: string;
  size: string;
  shape: string;
  radiusSize: string;
  length: string;
  width: string;
  skirtLength: string;
  skirtType: string;
  tieDownsQty: string;
  tieDownPlacement: string;
  distance: string;
  foamUpgrade: string;
  doublePlasticWrapUpgrade: string;
  webbingUpgrade: string;
  metalForLifterUpgrade: string;
  steamStopperUpgrade: string;
  fabricUpgrade: string;
  extraHandleQty: string;
  extraLongSkirt: string;
  packaging: boolean;
  notes: string;
}

export interface ParsedProductDescription {
  attributes: ParsedProductAttributes;
  errors: string[];
}

export class ProductDescriptionParser {
  /**
   * Parse product description and extract structured attributes
   * Never fails - returns partial attributes with parsing errors
   */
  static parseDescription(description: string): ParsedProductDescription {
    const attributes: ParsedProductAttributes = {
      productType: 'SPA_COVER',
      color: '',
      size: '',
      shape: '',
      radiusSize: '',
      length: '',
      width: '',
      skirtLength: '',
      skirtType: 'CONN',
      tieDownsQty: '',
      tieDownPlacement: 'HANDLE_SIDE',
      distance: '0',
      foamUpgrade: '',
      doublePlasticWrapUpgrade: 'No',
      webbingUpgrade: 'No',
      metalForLifterUpgrade: 'No',
      steamStopperUpgrade: 'No',
      fabricUpgrade: 'No',
      extraHandleQty: '0',
      extraLongSkirt: '',
      packaging: false,
      notes: ''
    };
    const errors: string[] = [];

    try {
      if (!description) {
        return { attributes, errors: ['No description provided'] };
      }

      console.log(`🔍 Parsing description: "${description}"`);

      // Parse Color: First part before comma (e.g., "Dark Gray" from "Dark Gray, 87, Square, R: 8...")
      const colorMatch = description.match(/^([^,]+?)(?=,\s*\d+)/);
      if (colorMatch) {
        attributes.color = colorMatch[1].trim();
        console.log(`✅ Parsed color: ${attributes.color}`);
      } else {
        console.log(`ℹ️ No color found at start of description`);
      }

      // Parse Size: First number in the description (e.g., "87" from "Dark Gray, 87, Square, R: 8...")
      const sizeMatch = description.match(/(\d+)/);
      if (sizeMatch) {
        attributes.size = sizeMatch[1];
        console.log(`✅ Parsed size: ${attributes.size}`);
      } else {
        console.log(`ℹ️ No size found in description`);
      }

      // Parse Shape: Look for common shapes after the size (e.g., "Square", "Round", "Oval")
      const shapeMatch = description.match(/(?:,\s*)(Square|Round|Oval|Rectangle|Custom)/i);
      if (shapeMatch) {
        attributes.shape = shapeMatch[1];
        console.log(`✅ Parsed shape: ${attributes.shape}`);
      } else {
        console.log(`ℹ️ No shape found after size`);
      }

      // Parse Radius: R: [RadiusSize] (e.g., "R: 8" -> "8")
      const radiusMatch = description.match(/R:\s*(\d+(?:\.\d+)?)/i);
      if (radiusMatch) {
        attributes.radiusSize = radiusMatch[1];
        console.log(`✅ Parsed radius: ${attributes.radiusSize}`);
      } else {
        console.log(`ℹ️ No radius found (looking for "R:" format)`);
      }

      // Parse Skirt: Skirt: [SkirtLength]-[SkirtType] (e.g., "Skirt: 5-Conn" -> length="5", type="Conn")
      const skirtMatch = description.match(/Skirt:\s*(\d+(?:\.\d+)?)-([A-Za-z]+)/i);
      if (skirtMatch) {
        attributes.skirtLength = skirtMatch[1];
        const skirtType = skirtMatch[2]?.toUpperCase();
        if (skirtType === 'CONN' || skirtType === 'SLIT') {
          attributes.skirtType = skirtType;
        } else {
          // Map common variations
          if (skirtType === 'CONNECTED') attributes.skirtType = 'CONN';
          else if (skirtType === 'SLITTED') attributes.skirtType = 'SLIT';
          else attributes.skirtType = skirtType;
        }
        console.log(`✅ Parsed skirt: length=${attributes.skirtLength}, type=${attributes.skirtType}`);
      } else {
        console.log(`ℹ️ No skirt found (looking for "Skirt:" format)`);
      }

      // Parse Tie Downs: TD: [Quantity]-[Placement] (e.g., "TD: 4-Handle Side" -> qty="4", placement="Handle Side")
      // This pattern looks for: TD: number-hyphen-text (optionally followed by another hyphen and number for distance)
      const tdMatch = description.match(/TD:\s*(\d+)-([A-Za-z\s]+?)(?:-(\d+(?:\.\d+)?))?/i);
      if (tdMatch) {
        attributes.tieDownsQty = tdMatch[1];
        const placement = tdMatch[2]?.trim().toUpperCase().replace(/\s+/g, '_');
        if (placement === 'HANDLE_SIDE' || placement === 'CORNER_SIDE' || placement === 'FOLD_SIDE') {
          attributes.tieDownPlacement = placement;
        } else {
          // Map common variations
          if (placement === 'HANDLE_SIDE' || placement.includes('HANDLE')) {
            attributes.tieDownPlacement = 'HANDLE_SIDE';
          } else if (placement === 'CORNER_SIDE' || placement.includes('CORNER')) {
            attributes.tieDownPlacement = 'CORNER_SIDE';
          } else if (placement === 'FOLD_SIDE' || placement.includes('FOLD')) {
            attributes.tieDownPlacement = 'FOLD_SIDE';
          } else {
            attributes.tieDownPlacement = placement;
          }
        }
        attributes.distance = tdMatch[3] || '0';
        console.log(`✅ Parsed tie downs: qty=${attributes.tieDownsQty}, placement=${attributes.tieDownPlacement}, distance=${attributes.distance}`);
      } else {
        console.log(`ℹ️ No tie-downs found in description (looking for "TD:" format)`);
      }

      // Parse Foam Upgrade: FoamU: [Value] (e.g., "FoamU: 2#" -> "2#")
      const foamMatch = description.match(/FoamU:\s*([^\s,]+)/i);
      if (foamMatch) {
        attributes.foamUpgrade = foamMatch[1];
        console.log(`✅ Parsed foam upgrade: ${attributes.foamUpgrade}`);
      } else {
        console.log(`ℹ️ No foam upgrade found (looking for "FoamU:" format)`);
      }

      // Parse Double Plastic Wrap: DPW: [Value] (e.g., "DPW: Yes" -> "Yes")
      const dpwMatch = description.match(/DPW:\s*([^\s,]+)/i);
      if (dpwMatch) {
        const value = dpwMatch[1]?.toLowerCase();
        if (value === 'yes' || value === 'y' || value === 'true' || value === '1') {
          attributes.doublePlasticWrapUpgrade = 'Yes';
        } else if (value === 'no' || value === 'n' || value === 'false' || value === '0') {
          attributes.doublePlasticWrapUpgrade = 'No';
        } else {
          attributes.doublePlasticWrapUpgrade = dpwMatch[1];
        }
        console.log(`✅ Parsed double plastic wrap: ${attributes.doublePlasticWrapUpgrade}`);
      }

      // Parse Webbing Upgrade: WebU: [Value] (e.g., "WebU: Yes" -> "Yes")
      const webMatch = description.match(/WebU:\s*([^\s,]+)/i);
      if (webMatch) {
        const value = webMatch[1]?.toLowerCase();
        if (value === 'yes' || value === 'y' || value === 'true' || value === '1') {
          attributes.webbingUpgrade = 'Yes';
        } else if (value === 'no' || value === 'n' || value === 'false' || value === '0') {
          attributes.webbingUpgrade = 'No';
        } else {
          attributes.webbingUpgrade = webMatch[1];
        }
        console.log(`✅ Parsed webbing upgrade: ${attributes.webbingUpgrade}`);
      }

      // Parse Metal for Lifter: MFL: [Value] (e.g., "MFL: Yes" -> "Yes")
      const mflMatch = description.match(/MFL:\s*([^\s,]+)/i);
      if (mflMatch) {
        const value = mflMatch[1]?.toLowerCase();
        if (value === 'yes' || value === 'y' || value === 'true' || value === '1') {
          attributes.metalForLifterUpgrade = 'Yes';
        } else if (value === 'no' || value === 'n' || value === 'false' || value === '0') {
          attributes.metalForLifterUpgrade = 'No';
        } else {
          attributes.metalForLifterUpgrade = mflMatch[1];
        }
        console.log(`✅ Parsed metal for lifter: ${attributes.metalForLifterUpgrade}`);
      }

      // Parse Steam Stopper: SteamS: [Value] (e.g., "SteamS: Yes" -> "Yes")
      const steamMatch = description.match(/SteamS:\s*([^\s,]+)/i);
      if (steamMatch) {
        const value = steamMatch[1]?.toLowerCase();
        if (value === 'yes' || value === 'y' || value === 'true' || value === '1') {
          attributes.steamStopperUpgrade = 'Yes';
        } else if (value === 'no' || value === 'n' || value === 'false' || value === '0') {
          attributes.steamStopperUpgrade = 'No';
        } else {
          attributes.steamStopperUpgrade = steamMatch[1];
        }
        console.log(`✅ Parsed steam stopper: ${attributes.steamStopperUpgrade}`);
      }

      // Parse Fabric Upgrade: FabricU: [Value] (e.g., "FabricU: Yes" -> "Yes")
      const fabricMatch = description.match(/FabricU:\s*([^\s,]+)/i);
      if (fabricMatch) {
        const value = fabricMatch[1]?.toLowerCase();
        if (value === 'yes' || value === 'y' || value === 'true' || value === '1') {
          attributes.fabricUpgrade = 'Yes';
        } else if (value === 'no' || value === 'n' || value === 'false' || value === '0') {
          attributes.fabricUpgrade = 'No';
        } else {
          attributes.fabricUpgrade = fabricMatch[1];
        }
        console.log(`✅ Parsed fabric upgrade: ${attributes.fabricUpgrade}`);
      }

      // Parse Extra Handle: EH: [Value] (e.g., "EH: Yes" -> "2", "EH: 3" -> "3")
      const ehMatch = description.match(/EH:\s*([^\s,]+)/i);
      if (ehMatch) {
        const value = ehMatch[1]?.toLowerCase();
        if (value === 'yes' || value === 'y' || value === 'true' || value === '1') {
          attributes.extraHandleQty = '2';
        } else if (value === 'no' || value === 'n' || value === 'false' || value === '0') {
          attributes.extraHandleQty = '0';
        } else {
          // Try to parse as number
          const num = parseInt(value);
          if (!isNaN(num)) {
            attributes.extraHandleQty = num.toString();
          } else {
            attributes.extraHandleQty = value;
          }
        }
        console.log(`✅ Parsed extra handle: ${attributes.extraHandleQty}`);
      }

      // Parse Extra Long Skirt: ELS: [Value] (e.g., "ELS: Yes" -> "Yes")
      const elsMatch = description.match(/ELS:\s*([^\s,]+)/i);
      if (elsMatch) {
        const value = elsMatch[1]?.toLowerCase();
        if (value === 'yes' || value === 'y' || value === 'true' || value === '1') {
          attributes.extraLongSkirt = 'Yes';
        } else if (value === 'no' || value === 'n' || value === 'false' || value === '0') {
          attributes.extraLongSkirt = 'No';
        } else {
          attributes.extraLongSkirt = elsMatch[1];
        }
        console.log(`✅ Parsed extra long skirt: ${attributes.extraLongSkirt}`);
      }

      // Parse Packaging: Pack: [Value] (e.g., "Pack: Yes" -> "Yes")
      const packMatch = description.match(/Pack:\s*([^\s,]+)/i);
      if (packMatch) {
        const packValue = packMatch[1].toLowerCase();
        if (packValue === 'yes' || packValue === 'true' || packValue === '1') {
          attributes.packaging = true;
        } else if (packValue === 'no' || packValue === 'false' || packValue === '0') {
          attributes.packaging = false;
        } else {
          attributes.packaging = packValue === 'yes' || packValue === 'true' || packValue === '1';
        }
        console.log(`✅ Parsed packaging: ${attributes.packaging}`);
      }

      // Calculate Extra Long Skirt based on Skirt Length if not explicitly set
      if (!attributes.extraLongSkirt && attributes.skirtLength) {
        const skirtLengthNum = parseFloat(attributes.skirtLength);
        if (!isNaN(skirtLengthNum) && skirtLengthNum > 6) {
          attributes.extraLongSkirt = 'Yes';
          console.log(`✅ Auto-calculated extra long skirt: Yes (skirt length > 6)`);
        }
      }

      console.log(`🎯 Final parsed attributes:`, attributes);
      
      // Summary of what was parsed
      console.log(`📊 Parsing Summary:`);
      console.log(`   Color: ${attributes.color || 'NOT FOUND'}`);
      console.log(`   Size: ${attributes.size || 'NOT FOUND'}`);
      console.log(`   Shape: ${attributes.shape || 'NOT FOUND'}`);
      console.log(`   Radius: ${attributes.radiusSize || 'NOT FOUND'}`);
      console.log(`   Skirt Length: ${attributes.skirtLength || 'NOT FOUND'}`);
      console.log(`   Skirt Type: ${attributes.skirtType || 'NOT FOUND'}`);
      console.log(`   Tie Downs Qty: ${attributes.tieDownsQty || 'NOT FOUND'}`);
      console.log(`   Tie Down Placement: ${attributes.tieDownPlacement || 'NOT FOUND'}`);
      console.log(`   Foam Upgrade: ${attributes.foamUpgrade || 'NOT FOUND'}`);
      console.log(`   Parsing Errors: ${errors.length > 0 ? errors.join(', ') : 'None'}`);

    } catch (error) {
      console.error('Error parsing product description:', error);
      errors.push('Failed to parse description');
    }

    // Set defaults for required fields
    if (!attributes.distance) attributes.distance = '0';
    if (!attributes.foamUpgrade) attributes.foamUpgrade = '';
    if (!attributes.doublePlasticWrapUpgrade) attributes.doublePlasticWrapUpgrade = 'No';
    if (!attributes.webbingUpgrade) attributes.webbingUpgrade = 'No';
    if (!attributes.metalForLifterUpgrade) attributes.metalForLifterUpgrade = 'No';
    if (!attributes.steamStopperUpgrade) attributes.steamStopperUpgrade = 'No';
    if (!attributes.fabricUpgrade) attributes.fabricUpgrade = 'No';
    if (!attributes.extraHandleQty) attributes.extraHandleQty = '0';

    return {
      attributes,
      errors
    };
  }
}