-- Migration to add STUFFING station to OrderItemProcessingStatus enum
-- This adds STUFFING between FOAM_CUTTING and PACKAGING in the production workflow

-- Add STUFFING to the OrderItemProcessingStatus enum
ALTER TYPE "OrderItemProcessingStatus" ADD VALUE 'STUFFING' AFTER 'FOAM_CUTTING';

-- Note: This migration adds the new STUFFING station to the production workflow
-- The new workflow is: NOT_STARTED_PRODUCTION → CUTTING → SEWING → FOAM_CUTTING → STUFFING → PACKAGING → PRODUCT_FINISHED → READY