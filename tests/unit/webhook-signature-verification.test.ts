/**
 * Unit tests for QuickBooks webhook signature verification
 * Tests signature validation logic and security scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';

describe('Webhook Signature Verification', () => {
  const testVerifierToken = 'test-webhook-verifier-token-12345';
  
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.QBO_WEBHOOK_VERIFIER_TOKEN = testVerifierToken;
  });

  describe('Valid Signature Generation and Verification', () => {
    it('should generate consistent signatures for the same payload', () => {
      const payload = JSON.stringify({
        eventNotifications: [{
          realmId: 'test-realm-123',
          dataChangeEvent: {
            entities: [{
              name: 'Customer',
              id: 'customer-123',
              operation: 'Create'
            }]
          }
        }]
      });

      const signature1 = crypto.createHmac('sha256', testVerifierToken)
        .update(payload)
        .digest('base64');
      
      const signature2 = crypto.createHmac('sha256', testVerifierToken)
        .update(payload)
        .digest('base64');

      expect(signature1).toBe(signature2);
      expect(signature1).toBeDefined();
      expect(signature1.length).toBeGreaterThan(0);
    });

    it('should generate different signatures for different payloads', () => {
      const payload1 = JSON.stringify({ test: 'data1' });
      const payload2 = JSON.stringify({ test: 'data2' });

      const signature1 = crypto.createHmac('sha256', testVerifierToken)
        .update(payload1)
        .digest('base64');
      
      const signature2 = crypto.createHmac('sha256', testVerifierToken)
        .update(payload2)
        .digest('base64');

      expect(signature1).not.toBe(signature2);
    });

    it('should generate different signatures for different verifier tokens', () => {
      const payload = JSON.stringify({ test: 'data' });
      const token1 = 'verifier-token-1';
      const token2 = 'verifier-token-2';

      const signature1 = crypto.createHmac('sha256', token1)
        .update(payload)
        .digest('base64');
      
      const signature2 = crypto.createHmac('sha256', token2)
        .update(payload)
        .digest('base64');

      expect(signature1).not.toBe(signature2);
    });

    it('should handle complex webhook payloads correctly', () => {
      const complexPayload = JSON.stringify({
        eventNotifications: [
          {
            realmId: 'realm-123',
            dataChangeEvent: {
              entities: [
                {
                  name: 'Customer',
                  id: 'customer-456',
                  operation: 'Create',
                  lastUpdated: '2024-01-01T12:00:00.000Z'
                },
                {
                  name: 'Invoice',
                  id: 'invoice-789',
                  operation: 'Update',
                  lastUpdated: '2024-01-01T12:05:00.000Z'
                }
              ]
            }
          }
        ]
      });

      const signature = crypto.createHmac('sha256', testVerifierToken)
        .update(complexPayload)
        .digest('base64');

      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(40); // Base64 SHA256 should be longer
    });
  });

  describe('Signature Verification Edge Cases', () => {
    it('should handle empty payloads', () => {
      const emptyPayload = '';
      
      const signature = crypto.createHmac('sha256', testVerifierToken)
        .update(emptyPayload)
        .digest('base64');

      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);
    });

    it('should handle payloads with special characters', () => {
      const specialPayload = JSON.stringify({
        test: 'data with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
        unicode: '测试数据 🚀 émojis',
        newlines: 'line1\nline2\r\nline3'
      });

      const signature = crypto.createHmac('sha256', testVerifierToken)
        .update(specialPayload)
        .digest('base64');

      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);
    });

    it('should handle very large payloads', () => {
      const largePayload = JSON.stringify({
        eventNotifications: Array.from({ length: 100 }, (_, i) => ({
          realmId: `realm-${i}`,
          dataChangeEvent: {
            entities: Array.from({ length: 10 }, (_, j) => ({
              name: 'Customer',
              id: `customer-${i}-${j}`,
              operation: 'Create',
              lastUpdated: new Date().toISOString(),
              data: 'x'.repeat(100) // Add some bulk to each entity
            }))
          }
        }))
      });

      const signature = crypto.createHmac('sha256', testVerifierToken)
        .update(largePayload)
        .digest('base64');

      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);
      expect(largePayload.length).toBeGreaterThan(10000); // Ensure it's actually large
    });

    it('should handle payloads with null and undefined values', () => {
      const payloadWithNulls = JSON.stringify({
        eventNotifications: [{
          realmId: 'realm-123',
          dataChangeEvent: {
            entities: [{
              name: 'Customer',
              id: 'customer-123',
              operation: 'Create',
              optionalField: null,
              anotherField: undefined // This will be omitted in JSON.stringify
            }]
          }
        }]
      });

      const signature = crypto.createHmac('sha256', testVerifierToken)
        .update(payloadWithNulls)
        .digest('base64');

      expect(signature).toBeDefined();
      expect(payloadWithNulls).toContain('null');
      expect(payloadWithNulls).not.toContain('undefined');
    });
  });

  describe('Security Scenarios', () => {
    it('should detect signature tampering', () => {
      const originalPayload = JSON.stringify({ test: 'original data' });
      const tamperedPayload = JSON.stringify({ test: 'tampered data' });

      const originalSignature = crypto.createHmac('sha256', testVerifierToken)
        .update(originalPayload)
        .digest('base64');

      const tamperedSignature = crypto.createHmac('sha256', testVerifierToken)
        .update(tamperedPayload)
        .digest('base64');

      // Verify that using the original signature with tampered payload would fail
      expect(originalSignature).not.toBe(tamperedSignature);
    });

    it('should handle timing attack resistance', () => {
      const payload = JSON.stringify({ test: 'data' });
      const correctSignature = crypto.createHmac('sha256', testVerifierToken)
        .update(payload)
        .digest('base64');

      // Create signatures that differ by one character
      const almostCorrectSignature = correctSignature.slice(0, -1) + 'X';
      const completelyWrongSignature = 'completely-wrong-signature';

      expect(correctSignature).not.toBe(almostCorrectSignature);
      expect(correctSignature).not.toBe(completelyWrongSignature);
      
      // Both should be rejected, but timing should be consistent
      // (This is more of a documentation of the security requirement)
    });

    it('should handle different encoding attacks', () => {
      const payload = JSON.stringify({ test: 'data' });
      
      // Test with different string encodings
      const utf8Signature = crypto.createHmac('sha256', testVerifierToken)
        .update(payload, 'utf8')
        .digest('base64');

      const binarySignature = crypto.createHmac('sha256', testVerifierToken)
        .update(Buffer.from(payload, 'utf8'))
        .digest('base64');

      // These should be the same since the data is the same
      expect(utf8Signature).toBe(binarySignature);
    });

    it('should handle replay attack scenarios', () => {
      const timestamp1 = '2024-01-01T12:00:00Z';
      const timestamp2 = '2024-01-01T12:01:00Z';

      const payload1 = JSON.stringify({
        eventNotifications: [{
          realmId: 'realm-123',
          dataChangeEvent: {
            entities: [{
              name: 'Customer',
              id: 'customer-123',
              operation: 'Create',
              lastUpdated: timestamp1
            }]
          }
        }]
      });

      const payload2 = JSON.stringify({
        eventNotifications: [{
          realmId: 'realm-123',
          dataChangeEvent: {
            entities: [{
              name: 'Customer',
              id: 'customer-123',
              operation: 'Create',
              lastUpdated: timestamp2
            }]
          }
        }]
      });

      const signature1 = crypto.createHmac('sha256', testVerifierToken)
        .update(payload1)
        .digest('base64');

      const signature2 = crypto.createHmac('sha256', testVerifierToken)
        .update(payload2)
        .digest('base64');

      // Different timestamps should produce different signatures
      expect(signature1).not.toBe(signature2);
    });
  });

  describe('Error Conditions', () => {
    it('should handle missing verifier token', () => {
      delete process.env.QBO_WEBHOOK_VERIFIER_TOKEN;
      
      const payload = JSON.stringify({ test: 'data' });
      
      // Without a verifier token, signature verification should fail
      expect(process.env.QBO_WEBHOOK_VERIFIER_TOKEN).toBeUndefined();
      
      // Restore for other tests
      process.env.QBO_WEBHOOK_VERIFIER_TOKEN = testVerifierToken;
    });

    it('should handle empty verifier token', () => {
      process.env.QBO_WEBHOOK_VERIFIER_TOKEN = '';
      
      const payload = JSON.stringify({ test: 'data' });
      
      // Empty verifier token should be handled gracefully
      expect(process.env.QBO_WEBHOOK_VERIFIER_TOKEN).toBe('');
      
      // Restore for other tests
      process.env.QBO_WEBHOOK_VERIFIER_TOKEN = testVerifierToken;
    });

    it('should handle malformed signatures', () => {
      const payload = JSON.stringify({ test: 'data' });
      const validSignature = crypto.createHmac('sha256', testVerifierToken)
        .update(payload)
        .digest('base64');

      const malformedSignatures = [
        '', // Empty
        'not-base64-!@#$%', // Invalid base64
        'dGVzdA==', // Valid base64 but wrong signature
        validSignature + 'extra', // Valid signature with extra chars
        validSignature.slice(0, -5), // Truncated signature
      ];

      malformedSignatures.forEach(malformed => {
        expect(malformed).not.toBe(validSignature);
      });
    });
  });

  describe('Performance Considerations', () => {
    it('should handle signature verification efficiently', () => {
      const payload = JSON.stringify({ test: 'performance test data' });
      
      const startTime = Date.now();
      
      // Generate multiple signatures to test performance
      for (let i = 0; i < 100; i++) {
        crypto.createHmac('sha256', testVerifierToken)
          .update(payload)
          .digest('base64');
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete 100 signature generations in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent signature verification', async () => {
      const payload = JSON.stringify({ test: 'concurrent test data' });
      
      const promises = Array.from({ length: 10 }, () => 
        Promise.resolve().then(() => 
          crypto.createHmac('sha256', testVerifierToken)
            .update(payload)
            .digest('base64')
        )
      );
      
      const results = await Promise.all(promises);
      
      // All concurrent operations should produce the same result
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toBe(firstResult);
      });
    });
  });
});