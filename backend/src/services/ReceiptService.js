const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const Database = require('../utils/database');

class ReceiptService {
  /**
   * Generate a PDF receipt for a payment
   * @param {Object} payment - Payment object with tenant details
   * @param {Object} user - User requesting generation (usually tenant or admin)
   * @returns {Promise<Object>} - Created Document object
   */
  static async generateReceipt(payment, user) {
    return new Promise(async (resolve, reject) => {
      try {
        // 1. Prepare file path
        const fileName = `receipt_${payment.id}_${Date.now()}.pdf`;
        const relativePath = path.join('uploads', 'receipts', fileName);
        const absolutePath = path.join(process.cwd(), relativePath);

        // Ensure directory exists
        const dir = path.dirname(absolutePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // 2. Create PDF
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(absolutePath);

        doc.pipe(stream);

        // Header
        doc.fontSize(20).text('PAYMENT RECEIPT', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Receipt ID: RCP-${payment.id}`, { align: 'right' });
        doc.text(`Date: ${new Date().toLocaleDateString('en-KE')}`, { align: 'right' });
        doc.moveDown();

        // Property/Company Info (Static for now, could be dynamic)
        doc.fontSize(12).font('Helvetica-Bold').text('Property Management POS');
        doc.fontSize(10).font('Helvetica').text('123 Management Way');
        doc.text('City, State 12345');
        doc.moveDown();

        // Tenant Info
        doc.fontSize(12).font('Helvetica-Bold').text('Bill To:');
        doc.fontSize(10).font('Helvetica').text(payment.tenant_name || 'Tenant'); // Assuming tenant_name is joined
        doc.text(`Tenant ID: ${payment.tenant_id}`);
        doc.moveDown();

        // Payment Details Loop/Table
        const tableTop = 250;
        doc.font('Helvetica-Bold');
        doc.text('Description', 50, tableTop);
        doc.text('Amount', 400, tableTop, { align: 'right' });

        const itemTop = tableTop + 25;
        doc.font('Helvetica');
        doc.text(`Payment - ${payment.type || 'Rent'} (${payment.method})`, 50, itemTop);
        doc.text(`KES ${parseFloat(payment.amount).toFixed(2)}`, 400, itemTop, { align: 'right' });

        // Total
        const totalTop = itemTop + 30;
        doc.moveTo(50, totalTop).lineTo(550, totalTop).stroke();
        doc.font('Helvetica-Bold');
        doc.text('Total Paid:', 300, totalTop + 10);
        doc.text(`KES ${parseFloat(payment.amount).toFixed(2)}`, 400, totalTop + 10, { align: 'right' });

        // Footer
        doc.fontSize(10).font('Helvetica').text('Thank you for your payment!', 50, 700, { align: 'center', width: 500 });
        
        doc.end();

        // 3. Wait for stream to finish
        stream.on('finish', async () => {
          try {
            let ownerUserId = payment.tenant_user_id || payment.tenantUserId || payment.user_id || payment.userId;
            if (!ownerUserId && payment.tenant_id) {
              const res = await Database.query('SELECT user_id FROM tenants WHERE id = $1', [payment.tenant_id]);
              ownerUserId = res.rows[0]?.user_id;
            }
            if (!ownerUserId) {
              throw new Error('Unable to determine receipt owner');
            }

            // 4. Create Document Record
            const docData = {
              userId: ownerUserId,
              name: `Receipt #${payment.id}`,
              type: 'pdf',
              filePath: relativePath,
              size: fs.statSync(absolutePath).size,
              mimeType: 'application/pdf',
              description: `Automated receipt for payment #${payment.id}`,
              entityType: 'payment',
              entityId: payment.id,
              category: 'receipt'
            };

            const newDoc = await Document.create(docData);
            resolve(newDoc);
          } catch (dbError) {
            reject(dbError);
          }
        });

        stream.on('error', (err) => {
          reject(err);
        });

      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = ReceiptService;
