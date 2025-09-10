// AWS SES Email Service for customer notifications

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { unenhancedPrisma as prisma } from './db';

export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export interface OrderEmailData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  orderDate: string;
  orderStatus: string;
  items: Array<{
    name: string;
    quantity: number;
    status: string;
  }>;
  trackingNumber?: string;
  estimatedDelivery?: string;
}

// Initialize SES client
const sesClient = new SESClient({
  region: process.env.AWS_SES_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

export class EmailService {
  private static readonly FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@spacovers.com';
  private static readonly COMPANY_NAME = 'Spacovers';

  /**
   * Send order status notification email
   */
  static async sendOrderStatusEmail(
    orderId: string, 
    emailType: 'order_approved' | 'production_started' | 'order_ready' | 'order_shipped'
  ): Promise<void> {
    try {
      // Get order data
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          items: {
            include: {
              item: true
            }
          }
        }
      });

      if (!order || !order.customer) {
        throw new Error('Order or customer not found');
      }

      if (!order.contactEmail) {
        console.warn(`No contact email for order ${orderId}, skipping notification`);
        return;
      }

      // Prepare email data
      const emailData: OrderEmailData = {
        customerName: order.customer.name,
        customerEmail: order.contactEmail,
        orderNumber: order.salesOrderNumber || order.id.slice(-8),
        orderDate: new Date(order.createdAt).toLocaleDateString(),
        orderStatus: order.orderStatus,
        items: order.items.map(item => ({
          name: item.item.name,
          quantity: item.quantity,
          status: item.itemStatus
        })),
        trackingNumber: order.trackingNumber || undefined
      };

      // Get email template
      const template = this.getEmailTemplate(emailType, emailData);

      // Send email
      await this.sendEmail(
        order.contactEmail,
        template.subject,
        template.htmlBody,
        template.textBody
      );

      // Log the email notification
      await this.logEmailNotification(orderId, emailType, order.contactEmail, template.subject, true);

      console.log(`Email sent successfully: ${emailType} for order ${orderId}`);

    } catch (error) {
      console.error(`Failed to send ${emailType} email for order ${orderId}:`, error);
      
      // Log the failed email attempt
      await this.logEmailNotification(
        orderId, 
        emailType, 
        '', 
        '', 
        false, 
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      throw error;
    }
  }

  /**
   * Send tracking information email
   */
  static async sendTrackingEmail(orderId: string, trackingNumber: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          items: {
            include: {
              item: true
            }
          }
        }
      });

      if (!order || !order.customer || !order.contactEmail) {
        throw new Error('Order, customer, or contact email not found');
      }

      const emailData: OrderEmailData = {
        customerName: order.customer.name,
        customerEmail: order.contactEmail,
        orderNumber: order.salesOrderNumber || order.id.slice(-8),
        orderDate: new Date(order.createdAt).toLocaleDateString(),
        orderStatus: order.orderStatus,
        items: order.items.map(item => ({
          name: item.item.name,
          quantity: item.quantity,
          status: item.itemStatus
        })),
        trackingNumber: trackingNumber
      };

      const template = this.getTrackingEmailTemplate(emailData);

      await this.sendEmail(
        order.contactEmail,
        template.subject,
        template.htmlBody,
        template.textBody
      );

      await this.logEmailNotification(orderId, 'tracking_info', order.contactEmail, template.subject, true);

    } catch (error) {
      console.error(`Failed to send tracking email for order ${orderId}:`, error);
      await this.logEmailNotification(
        orderId, 
        'tracking_info', 
        '', 
        '', 
        false, 
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  /**
   * Send raw email using AWS SES
   */
  private static async sendEmail(
    toEmail: string,
    subject: string,
    htmlBody: string,
    textBody: string
  ): Promise<void> {
    const command = new SendEmailCommand({
      Source: this.FROM_EMAIL,
      Destination: {
        ToAddresses: [toEmail]
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8'
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8'
          }
        }
      }
    });

    await sesClient.send(command);
  }

  /**
   * Get email template based on type
   */
  private static getEmailTemplate(
    emailType: 'order_approved' | 'production_started' | 'order_ready' | 'order_shipped',
    data: OrderEmailData
  ): EmailTemplate {
    switch (emailType) {
      case 'order_approved':
        return {
          subject: `Order #${data.orderNumber} Approved - ${this.COMPANY_NAME}`,
          htmlBody: this.getOrderApprovedHtml(data),
          textBody: this.getOrderApprovedText(data)
        };
      
      case 'production_started':
        return {
          subject: `Order #${data.orderNumber} Production Started - ${this.COMPANY_NAME}`,
          htmlBody: this.getProductionStartedHtml(data),
          textBody: this.getProductionStartedText(data)
        };
      
      case 'order_ready':
        return {
          subject: `Order #${data.orderNumber} Ready for Pickup - ${this.COMPANY_NAME}`,
          htmlBody: this.getOrderReadyHtml(data),
          textBody: this.getOrderReadyText(data)
        };
      
      case 'order_shipped':
        return {
          subject: `Order #${data.orderNumber} Shipped - ${this.COMPANY_NAME}`,
          htmlBody: this.getOrderShippedHtml(data),
          textBody: this.getOrderShippedText(data)
        };
      
      default:
        throw new Error(`Unknown email type: ${emailType}`);
    }
  }

  /**
   * Get tracking email template
   */
  private static getTrackingEmailTemplate(data: OrderEmailData): EmailTemplate {
    return {
      subject: `Tracking Information for Order #${data.orderNumber} - ${this.COMPANY_NAME}`,
      htmlBody: this.getTrackingInfoHtml(data),
      textBody: this.getTrackingInfoText(data)
    };
  }

  // HTML Email Templates
  private static getOrderApprovedHtml(data: OrderEmailData): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Order Approved</h2>
            <p>Dear ${data.customerName},</p>
            <p>Great news! Your order has been approved and will begin production soon.</p>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Order Details</h3>
              <p><strong>Order Number:</strong> #${data.orderNumber}</p>
              <p><strong>Order Date:</strong> ${data.orderDate}</p>
              <p><strong>Status:</strong> ${data.orderStatus.replace(/_/g, ' ')}</p>
            </div>

            <h3>Items in Your Order</h3>
            <ul>
              ${data.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('')}
            </ul>

            <p>We'll keep you updated as your order progresses through production.</p>
            <p>Thank you for choosing ${this.COMPANY_NAME}!</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private static getProductionStartedHtml(data: OrderEmailData): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #059669;">Production Started</h2>
            <p>Dear ${data.customerName},</p>
            <p>Your order is now in production! Our team has started working on your items.</p>
            
            <div style="background: #f0fdf4; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Order Details</h3>
              <p><strong>Order Number:</strong> #${data.orderNumber}</p>
              <p><strong>Status:</strong> In Production</p>
            </div>

            <p>Your items will progress through our production stations:</p>
            <ol>
              <li>Cutting</li>
              <li>Sewing</li>
              <li>Foam Cutting</li>
              <li>Packaging</li>
              <li>Quality Check</li>
            </ol>

            <p>We'll notify you when your order is ready for pickup or shipping.</p>
            <p>Thank you for your patience!</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private static getOrderReadyHtml(data: OrderEmailData): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc2626;">Order Ready!</h2>
            <p>Dear ${data.customerName},</p>
            <p>Excellent news! Your order is complete and ready for pickup or shipping.</p>
            
            <div style="background: #fef2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Order Details</h3>
              <p><strong>Order Number:</strong> #${data.orderNumber}</p>
              <p><strong>Status:</strong> Ready to Ship</p>
            </div>

            <h3>Completed Items</h3>
            <ul>
              ${data.items.map(item => `<li>${item.quantity}x ${item.name} - ${item.status.replace(/_/g, ' ')}</li>`).join('')}
            </ul>

            <p><strong>Next Steps:</strong></p>
            <p>Please contact us to arrange pickup or confirm shipping details.</p>
            
            <p>Thank you for choosing ${this.COMPANY_NAME}!</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private static getOrderShippedHtml(data: OrderEmailData): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #7c3aed;">Order Shipped!</h2>
            <p>Dear ${data.customerName},</p>
            <p>Your order has been shipped and is on its way to you!</p>
            
            <div style="background: #faf5ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Shipping Details</h3>
              <p><strong>Order Number:</strong> #${data.orderNumber}</p>
              ${data.trackingNumber ? `<p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>` : ''}
              <p><strong>Status:</strong> Shipped</p>
            </div>

            ${data.trackingNumber ? '<p>You can track your shipment using the tracking number provided above.</p>' : ''}
            <p>Thank you for your business!</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private static getTrackingInfoHtml(data: OrderEmailData): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0891b2;">Tracking Information</h2>
            <p>Dear ${data.customerName},</p>
            <p>Here's the tracking information for your order:</p>
            
            <div style="background: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Tracking Details</h3>
              <p><strong>Order Number:</strong> #${data.orderNumber}</p>
              <p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
            </div>

            <p>You can use this tracking number to monitor your shipment's progress with the shipping carrier.</p>
            <p>Thank you for choosing ${this.COMPANY_NAME}!</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  // Text Email Templates (simplified versions)
  private static getOrderApprovedText(data: OrderEmailData): string {
    return `
Order Approved - ${this.COMPANY_NAME}

Dear ${data.customerName},

Great news! Your order has been approved and will begin production soon.

Order Details:
- Order Number: #${data.orderNumber}
- Order Date: ${data.orderDate}
- Status: ${data.orderStatus.replace(/_/g, ' ')}

Items in Your Order:
${data.items.map(item => `- ${item.quantity}x ${item.name}`).join('\n')}

We'll keep you updated as your order progresses through production.

Thank you for choosing ${this.COMPANY_NAME}!

---
This is an automated message. Please do not reply to this email.
    `;
  }

  private static getProductionStartedText(data: OrderEmailData): string {
    return `
Production Started - ${this.COMPANY_NAME}

Dear ${data.customerName},

Your order is now in production! Our team has started working on your items.

Order Number: #${data.orderNumber}
Status: In Production

Your items will progress through our production stations:
1. Cutting
2. Sewing  
3. Foam Cutting
4. Packaging
5. Quality Check

We'll notify you when your order is ready for pickup or shipping.

Thank you for your patience!

---
This is an automated message. Please do not reply to this email.
    `;
  }

  private static getOrderReadyText(data: OrderEmailData): string {
    return `
Order Ready! - ${this.COMPANY_NAME}

Dear ${data.customerName},

Excellent news! Your order is complete and ready for pickup or shipping.

Order Number: #${data.orderNumber}
Status: Ready to Ship

Completed Items:
${data.items.map(item => `- ${item.quantity}x ${item.name} - ${item.status.replace(/_/g, ' ')}`).join('\n')}

Next Steps:
Please contact us to arrange pickup or confirm shipping details.

Thank you for choosing ${this.COMPANY_NAME}!

---
This is an automated message. Please do not reply to this email.
    `;
  }

  private static getOrderShippedText(data: OrderEmailData): string {
    return `
Order Shipped! - ${this.COMPANY_NAME}

Dear ${data.customerName},

Your order has been shipped and is on its way to you!

Order Number: #${data.orderNumber}
${data.trackingNumber ? `Tracking Number: ${data.trackingNumber}` : ''}
Status: Shipped

${data.trackingNumber ? 'You can track your shipment using the tracking number provided above.' : ''}

Thank you for your business!

---
This is an automated message. Please do not reply to this email.
    `;
  }

  private static getTrackingInfoText(data: OrderEmailData): string {
    return `
Tracking Information - ${this.COMPANY_NAME}

Dear ${data.customerName},

Here's the tracking information for your order:

Order Number: #${data.orderNumber}
Tracking Number: ${data.trackingNumber}

You can use this tracking number to monitor your shipment's progress with the shipping carrier.

Thank you for choosing ${this.COMPANY_NAME}!

---
This is an automated message. Please do not reply to this email.
    `;
  }

  /**
   * Log email notification to database
   */
  private static async logEmailNotification(
    orderId: string,
    emailType: string,
    recipientEmail: string,
    subject: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      await prisma.emailNotification.create({
        data: {
          orderId,
          emailType,
          recipientEmail,
          subject,
          sentAt: success ? new Date() : null,
          failedAt: success ? null : new Date(),
          errorMessage: errorMessage || null,
          retryCount: 0
        }
      });
    } catch (error) {
      console.error('Failed to log email notification:', error);
    }
  }

  /**
   * Retry failed email notifications
   */
  static async retryFailedEmails(): Promise<void> {
    try {
      const failedEmails = await prisma.emailNotification.findMany({
        where: {
          sentAt: null,
          retryCount: { lt: 3 } // Max 3 retries
        },
        include: {
          order: {
            include: {
              customer: true,
              items: {
                include: {
                  item: true
                }
              }
            }
          }
        }
      });

      for (const notification of failedEmails) {
        try {
          await this.sendOrderStatusEmail(
            notification.orderId, 
            notification.emailType as any
          );
          
          // Mark as sent
          await prisma.emailNotification.update({
            where: { id: notification.id },
            data: {
              sentAt: new Date(),
              failedAt: null,
              errorMessage: null
            }
          });
        } catch (error) {
          // Increment retry count
          await prisma.emailNotification.update({
            where: { id: notification.id },
            data: {
              retryCount: { increment: 1 },
              errorMessage: error instanceof Error ? error.message : 'Retry failed'
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to retry email notifications:', error);
    }
  }
}