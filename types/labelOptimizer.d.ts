/**
 * Type definitions for label optimization utilities
 */

export interface OptimizedLabelInfo {
  customer: string;
  thickness: string;
  size: string;
  type: string;
  color: string;
  date: string;
  upgrades: string;
  barcode: string;
}

export interface LabelOptimizationConfig {
  maxCustomerLength: number;
  maxUpgradeLength: number;
  maxTypeLength: number;
  maxColorLength: number;
}

export interface ValidationResult {
  isValid: boolean;
  violations: string[];
}

export interface OrderItemData {
  customerName?: string;
  thickness?: string;
  size?: string;
  type?: string;
  color?: string;
  date?: Date | string;
  upgrades?: string[];
  barcode?: string;
  id?: string;
}