const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = this.initializeTransporter();
  }

  initializeTransporter() {
    // Use environment variables for email configuration
    const emailConfig = {
      // Gmail configuration (most common for development)
      // Set EMAIL_SERVICE, EMAIL_USER, EMAIL_PASSWORD in .env
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    };

    // If using a custom SMTP server instead of Gmail
    if (process.env.SMTP_HOST) {
      delete emailConfig.service;
      emailConfig.host = process.env.SMTP_HOST;
      emailConfig.port = process.env.SMTP_PORT || 587;
      emailConfig.secure = process.env.SMTP_SECURE === 'true'; // true for 465, false for other ports
      emailConfig.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      };
    }

    try {
      const transporter = nodemailer.createTransport(emailConfig);
      console.log('Email service initialized successfully');
      return transporter;
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      return null;
    }
  }

  /**
   * Verify email configuration is working
   */
  async verifyConnection() {
    if (!this.transporter) {
      console.warn('Email transporter not initialized');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('Email service connection verified');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error.message);
      return false;
    }
  }

  /**
   * Send a generic email
   */
  async sendEmail(to, subject, htmlContent, textContent = null) {
    if (!this.transporter) {
      console.warn('Email transporter not available, skipping email send');
      return { success: false, message: 'Email service not configured' };
    }

    if (!to || !subject || !htmlContent) {
      throw new Error('Email recipient, subject, and content are required');
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@propertymanagement.com',
        to,
        subject,
        html: htmlContent,
        text: textContent || 'Please open this email in an HTML-compatible viewer'
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Error sending email to ${to}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send lease expiration notification email
   */
  async sendLeaseExpirationEmail(adminEmail, data) {
    const {
      tenant_name,
      tenant_email,
      property_name,
      lease_end_date,
      days_remaining,
      days_expired,
      reminder_type,
      admin_name
    } = data;

    const daysText = reminder_type === 'expired' 
      ? `EXPIRED ${days_expired || '?'} days ago`
      : `expiring in ${days_remaining || '?'} days`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .header h2 { margin: 0; }
            .content { padding: 20px; }
            .alert { padding: 12px; margin: 10px 0; border-radius: 4px; }
            .alert-warning { background: #fff3cd; border-left: 4px solid #ffc107; }
            .alert-danger { background: #f8d7da; border-left: 4px solid #dc3545; }
            .details { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
            .details p { margin: 8px 0; }
            .footer { text-align: center; padding: 15px; font-size: 12px; color: #7f8c8d; border-top: 1px solid #eee; margin-top: 20px; }
            .action-btn { display: inline-block; padding: 10px 20px; background: #3498db; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${reminder_type === 'expired' ? '⚠️ Lease EXPIRED Notification' : '📅 Lease Expiration Reminder'}</h2>
            </div>
            
            <div class="content">
              <p>Dear ${admin_name || 'Administrator'},</p>
              
              <div class="alert ${reminder_type === 'expired' ? 'alert-danger' : 'alert-warning'}">
                <strong>Alert:</strong> Lease for tenant <strong>${tenant_name}</strong> is <strong>${daysText}</strong>.
              </div>

              <div class="details">
                <h3 style="margin-top: 0;">Lease Details:</h3>
                <p><strong>Tenant:</strong> ${tenant_name} (${tenant_email})</p>
                <p><strong>Property:</strong> ${property_name}</p>
                <p><strong>Lease End Date:</strong> ${new Date(lease_end_date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
                <p><strong>Status:</strong> ${reminder_type === 'expired' ? 'EXPIRED' : 'EXPIRING SOON'}</p>
              </div>

              <p>
                ${reminder_type === 'expired' 
                  ? 'Please contact the tenant immediately to renew the lease or arrange for move-out.'
                  : 'Please send a renewal notice to the tenant or begin the renewal process.'
                }
              </p>

              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/leases" class="action-btn">
                  View in Dashboard
                </a>
              </p>
            </div>

            <div class="footer">
              <p>This is an automated notification from Property Management System</p>
              <p>© 2026 Property Management. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail(
      adminEmail,
      `${reminder_type === 'expired' ? '[URGENT] Lease EXPIRED' : '[REMINDER] Lease Expiring Soon'} - ${tenant_name}`,
      htmlContent
    );
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmationEmail(recipientEmail, data) {
    const { tenant_name, amount, method, date, property_name } = data;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            .header { background: #27ae60; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .header h2 { margin: 0; }
            .content { padding: 20px; }
            .receipt { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
            .receipt p { margin: 8px 0; }
            .amount { font-size: 28px; color: #27ae60; font-weight: bold; }
            .footer { text-align: center; padding: 15px; font-size: 12px; color: #7f8c8d; border-top: 1px solid #eee; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>✓ Payment Received</h2>
            </div>
            
            <div class="content">
              <p>Dear ${tenant_name},</p>
              <p>Thank you for your payment! We have successfully received your payment.</p>

              <div class="receipt">
                <h3 style="margin-top: 0;">Payment Receipt:</h3>
                <p><strong>Property:</strong> ${property_name}</p>
                <p><strong>Amount:</strong> <span class="amount">$${parseFloat(amount).toFixed(2)}</span></p>
                <p><strong>Payment Method:</strong> ${method}</p>
                <p><strong>Date:</strong> ${new Date(date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
              </div>

              <p>If you have any questions, please contact your property manager.</p>
            </div>

            <div class="footer">
              <p>This is an automated confirmation from Property Management System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail(
      recipientEmail,
      `Payment Confirmation - ${property_name}`,
      htmlContent
    );
  }

  /**
   * Send maintenance request notification email
   */
  async sendMaintenanceNotificationEmail(recipientEmail, data) {
    const { tenant_name, title, description, priority, request_id } = data;

    const priorityColor = {
      'low': '#3498db',
      'medium': '#f39c12',
      'high': '#e74c3c'
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            .header { background: #34495e; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .header h2 { margin: 0; }
            .content { padding: 20px; }
            .details { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
            .details p { margin: 8px 0; }
            .priority-badge { 
              display: inline-block; 
              padding: 5px 12px; 
              border-radius: 4px; 
              color: white; 
              font-weight: bold;
              background: ${priorityColor[priority?.toLowerCase()] || '#95a5a6'};
            }
            .footer { text-align: center; padding: 15px; font-size: 12px; color: #7f8c8d; border-top: 1px solid #eee; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🔧 New Maintenance Request</h2>
            </div>
            
            <div class="content">
              <p>A new maintenance request has been submitted:</p>

              <div class="details">
                <p><strong>Tenant:</strong> ${tenant_name}</p>
                <p><strong>Title:</strong> ${title}</p>
                <p><strong>Description:</strong> ${description}</p>
                <p><strong>Priority:</strong> <span class="priority-badge">${priority?.toUpperCase()}</span></p>
                <p><strong>Request ID:</strong> #${request_id}</p>
              </div>

              <p>Please review and respond to this request as soon as possible.</p>
            </div>

            <div class="footer">
              <p>This is an automated notification from Property Management System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail(
      recipientEmail,
      `Maintenance Request: ${title}`,
      htmlContent
    );
  }
}

// Export singleton instance
module.exports = new EmailService();
