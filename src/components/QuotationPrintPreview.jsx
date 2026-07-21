import React from 'react';
import { THBText, formatMoney } from '../utils/formatters';

export default function QuotationPrintPreview({ quoteData, settings, paginatedItems, totalPages }) {
  const ITEMS_PER_PAGE = 20;

  return (
    <div style={styles.rightPanel}>
      <div className="print-container">
        {paginatedItems.map((pageItems, pageIndex) => (
          <div key={pageIndex} className="a4-preview print-area" style={{ marginBottom: pageIndex < totalPages - 1 ? '20px' : '0', pageBreakAfter: pageIndex < totalPages - 1 ? 'always' : 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--text-primary)', paddingBottom: '1rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {settings.companyLogo && (
                  <img src={settings.companyLogo} alt="Logo" style={{ maxHeight: '80px', maxWidth: '150px', objectFit: 'contain' }} />
                )}
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>{settings.companyName || settings['Company Name'] || 'บริษัท สมาร์ทโควท จำกัด'}</h1>
                  <p style={{ fontSize: '12px', color: '#666' }}>{settings.companyAddress || settings['Address'] || '123 ถ.สุขุมวิท กรุงเทพฯ 10110'}</p>
                  <p style={{ fontSize: '12px', color: '#666' }}>โทร: {settings.companyPhone || settings['Phone'] || '02-123-4567'} | เลขภาษี: {settings.companyTaxId || settings['Tax ID'] || '01055xxxxxxxx'}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>ใบเสนอราคา</h2>
                <h3 style={{ fontSize: '18px', color: '#666' }}>QUOTATION</h3>
              </div>
            </div>

            {/* Info block */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <div style={{ width: '50%', border: '1px solid #ccc', padding: '1rem', borderRadius: '4px' }}>
                <p><strong>ลูกค้า:</strong> {quoteData.customer.name}</p>
                <p><strong>ที่อยู่:</strong> {quoteData.customer.address}</p>
                <p><strong>เลขประจำตัวผู้เสียภาษี:</strong> {quoteData.customer.taxId}</p>
                <p><strong>เบอร์โทร:</strong> {quoteData.customer.phone}</p>
              </div>
              <div style={{ width: '48%', border: '1px solid #ccc', padding: '1rem', borderRadius: '4px' }}>
                <p><strong>เลขที่:</strong> {quoteData.quotation_no}</p>
                <p><strong>วันที่:</strong> {quoteData.date}</p>
                <p><strong>พนักงานขาย:</strong> {quoteData.employee?.name || ''}</p>
              </div>
            </div>

            {/* Table */}
            <table style={styles.printTable}>
              <thead>
                <tr>
                  <th style={{ width: '5%', textAlign: 'center' }}>ลำดับ</th>
                  <th style={{ width: '50%' }}>รายการ</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>จำนวน</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>หน่วย</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>ราคา/หน่วย</th>
                  <th style={{ width: '13%', textAlign: 'right' }}>จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item, index) => (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center' }}>{(pageIndex * ITEMS_PER_PAGE) + index + 1}</td>
                    <td>{item.description}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'center' }}>{item.unit}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(item.unit_price)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals and Signatures only on the last page */}
            {pageIndex === totalPages - 1 && (
              <>
                {/* Totals */}
                <div className="print-totals-section" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                  <div style={{ width: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                    <p><strong>หมายเหตุ:</strong> {quoteData.remark}</p>
                  </div>
                  <div style={{ width: '48%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '0.25rem' }}>รวมเงิน</td>
                          <td style={{ padding: '0.25rem', textAlign: 'right' }}>{formatMoney(quoteData.subtotal)}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '0.25rem' }}>ภาษีมูลค่าเพิ่ม 7%</td>
                          <td style={{ padding: '0.25rem', textAlign: 'right' }}>{formatMoney(quoteData.vat)}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '0.25rem', fontWeight: 'bold' }}>ยอดเงินสุทธิ</td>
                          <td style={{ padding: '0.25rem', textAlign: 'right', fontWeight: 'bold', borderTop: '2px solid #333' }}>{formatMoney(quoteData.total)}</td>
                        </tr>
                        <tr>
                          <td colSpan="2" style={{ padding: '0.25rem', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem', color: '#333', fontStyle: 'italic', borderBottom: '2px solid #333' }}>
                            ( {THBText(quoteData.total)} )
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signatures */}
                <div className="print-signature-section" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4rem' }}>
                  <div style={styles.signatureBox}>
                    <div style={styles.signatureLine}></div>
                    <p>ผู้เสนอราคา</p>
                    <p>วันที่: ...../...../.....</p>
                  </div>
                  <div style={styles.signatureBox}>
                    <div style={styles.signatureLine}></div>
                    <p>ผู้อนุมัติ</p>
                    <p>วันที่: ...../...../.....</p>
                  </div>
                  <div style={styles.signatureBox}>
                    <div style={styles.signatureLine}></div>
                    <p>ผู้รับใบเสนอราคา</p>
                    <p>วันที่: ...../...../.....</p>
                  </div>
                </div>
              </>
            )}

            {/* Page Indicator */}
            {totalPages > 1 && (
              <div className="no-print" style={{ textAlign: 'right', fontSize: '12px', marginTop: '1rem', color: '#666' }}>
                หน้า {pageIndex + 1} / {totalPages}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  rightPanel: {
    background: 'var(--bg-tertiary)',
    padding: '2rem',
    borderRadius: 'var(--radius-md)'
  },
  printTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '1rem',
    fontSize: '14px'
  },
  signatureBox: {
    textAlign: 'center',
    width: '30%',
    fontSize: '14px'
  },
  signatureLine: {
    borderBottom: '1px dotted #000',
    marginBottom: '0.5rem',
    height: '2rem'
  }
};
