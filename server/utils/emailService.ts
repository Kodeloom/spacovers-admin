import nodemailer from 'nodemailer';
import { SESClient } from '@aws-sdk/client-ses';

// Email service configuration using AWS SES
const createTransporter = () => {
  // For development, we'll log emails unless AWS credentials are provided
  if (process.env.NODE_ENV === 'development' && !process.env.AWS_REGION) {
    // In development, just log emails instead of actually sending them
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
  }

  // Production configuration using AWS SES
  const sesClient = new SESClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
  });

  return nodemailer.createTransport({
    SES: { ses: sesClient, aws: { SendRawEmail: true } }
  });
};

interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  orderStatus: string;
  totalAmount?: number;
}

interface OrderItemEmailData {
  orderNumber: string;
  customerName: string;
  itemName: string;
  quantity: number;
}

export const emailService = {
  async sendOrderStatusUpdate(to: string, orderData: OrderEmailData): Promise<boolean> {
    try {
      const transporter = createTransporter();
      
      const subject = `Order Update: ${orderData.orderNumber} - ${orderData.orderStatus}`;
      const html = generateOrderStatusEmailTemplate(orderData);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@spacovers.com',
        to,
        subject,
        html,
      };

      if (process.env.NODE_ENV === 'development' && !process.env.AWS_REGION) {
        console.log('📧 [DEV] Email would be sent to:', to);
        console.log('📧 [DEV] Subject:', subject);
        console.log('📧 [DEV] Order Status:', orderData.orderStatus);
        return true; // Simulate success in development
      }

      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Order status email sent successfully to:', to, '| MessageID:', result.messageId);
      return true;
    } catch (error: unknown) {
      console.error('❌ Error sending order status email to:', to);
      
      // Log specific AWS SES errors
      const errorWithCode = error as { code?: string; message?: string };
      if (errorWithCode.code) {
        console.error('AWS SES Error Code:', errorWithCode.code);
        if (errorWithCode.code === 'MessageRejected') {
          console.error('Email rejected - check if sender/recipient is verified in SES');
        } else if (errorWithCode.code === 'AccessDenied') {
          console.error('Access denied - check AWS credentials and SES permissions');
        }
      }
      
      console.error('Full error:', error);
      return false;
    }
  },

  async sendOrderItemReady(to: string, itemData: OrderItemEmailData): Promise<boolean> {
    try {
      const transporter = createTransporter();
      
      const subject = `Item Ready: ${itemData.itemName} in Order ${itemData.orderNumber}`;
      const html = generateOrderItemReadyEmailTemplate(itemData);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@spacovers.com',
        to,
        subject,
        html,
      };

      if (process.env.NODE_ENV === 'development' && !process.env.AWS_REGION) {
        console.log('📧 [DEV] Item ready email would be sent to:', to);
        console.log('📧 [DEV] Subject:', subject);
        console.log('📧 [DEV] Item:', itemData.itemName, '| Quantity:', itemData.quantity);
        return true; // Simulate success in development
      }

      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Item ready email sent successfully to:', to, '| MessageID:', result.messageId);
      return true;
    } catch (error: unknown) {
      console.error('❌ Error sending item ready email to:', to);
      
      // Log specific AWS SES errors
      const errorWithCode = error as { code?: string; message?: string };
      if (errorWithCode.code) {
        console.error('AWS SES Error Code:', errorWithCode.code);
        if (errorWithCode.code === 'MessageRejected') {
          console.error('Email rejected - check if sender/recipient is verified in SES');
        } else if (errorWithCode.code === 'AccessDenied') {
          console.error('Access denied - check AWS credentials and SES permissions');
        }
      }
      
      console.error('Full error:', error);
      return false;
    }
  }
};

function generateOrderStatusEmailTemplate(orderData: OrderEmailData): string {
  const statusMessages: Record<string, string> = {
    APPROVED: 'Your order has been approved and will begin production soon.',
    ORDER_PROCESSING: 'Your order is now in production.',
    READY_TO_SHIP: 'Great news! Your order is ready to ship.',
    SHIPPED: 'Your order has been shipped.',
    COMPLETED: 'Your order has been completed.',
    CANCELLED: 'Your order has been cancelled.',
  };

  const statusMessage = statusMessages[orderData.orderStatus] || 'Your order status has been updated.';

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Order Status Update</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .footer { padding: 20px; text-align: center; font-size: 14px; color: #666; }
            .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
            .status-approved { background-color: #dcfce7; color: #166534; }
            .status-processing { background-color: #dbeafe; color: #1e40af; }
            .status-ready { background-color: #f3e8ff; color: #7c3aed; }
            .status-shipped { background-color: #fef3c7; color: #d97706; }
            .status-completed { background-color: #dcfce7; color: #166534; }
            .status-cancelled { background-color: #fee2e2; color: #dc2626; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Order Status Update</h1>
            </div>
            <div class="content">
                <h2>Hello ${orderData.customerName},</h2>
                <p>${statusMessage}</p>
                <h3>Order Details:</h3>
                <ul>
                    <li><strong>Order Number:</strong> ${orderData.orderNumber}</li>
                    <li><strong>Status:</strong> 
                        <span class="status-badge status-${orderData.orderStatus.toLowerCase()}">
                            ${orderData.orderStatus.replace(/_/g, ' ')}
                        </span>
                    </li>
                    ${orderData.totalAmount ? `<li><strong>Total Amount:</strong> $${orderData.totalAmount.toFixed(2)}</li>` : ''}
                </ul>
                <p>If you have any questions about your order, please don't hesitate to contact us.</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 Spacovers. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

function generateOrderItemReadyEmailTemplate(itemData: OrderItemEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Item Ready for Pickup</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .footer { padding: 20px; text-align: center; font-size: 14px; color: #666; }
            .item-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Item Ready!</h1>
            </div>
            <div class="content">
                <h2>Hello ${itemData.customerName},</h2>
                <p>Great news! One of your items has completed production and is ready.</p>
                <div class="item-box">
                    <h3>Item Details:</h3>
                    <ul>
                        <li><strong>Order Number:</strong> ${itemData.orderNumber}</li>
                        <li><strong>Item:</strong> ${itemData.itemName}</li>
                        <li><strong>Quantity:</strong> ${itemData.quantity}</li>
                    </ul>
                </div>
                <p>We'll notify you when your complete order is ready to ship.</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 Spacovers. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
} 