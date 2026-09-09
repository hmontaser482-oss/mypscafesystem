import React from 'react';
import { Printer } from 'lucide-react';

export default function ThermalReceipt({ invoice }) {
  if (!invoice) return null;

  const store = invoice.store || {};
  const items = invoice.items || [];

  return (
    <div>
      {/* Printable Area (Styled specifically for 80mm Thermal paper) */}
      <div className="printable-area thermal-receipt-preview" id="thermal-invoice-printable">
        {/* Header */}
        <div className="receipt-header">
          <div className="receipt-title">{store.store_name || 'PS LOUNGE GAMING CENTER'}</div>
          <div style={{ fontSize: '11px', marginTop: '2px' }}>{store.address || 'القاهرة - مصر'}</div>
          <div style={{ fontSize: '11px' }}>هاتف: {store.phone || '01000000000'}</div>
          {store.tax_number && <div style={{ fontSize: '10px' }}>الرقم الضريبي: {store.tax_number}</div>}
        </div>

        {/* Invoice Meta */}
        <div style={{ fontSize: '11px', marginBottom: '8px' }}>
          <div className="receipt-row">
            <span>رقم الفاتورة:</span>
            <span style={{ fontWeight: 'bold' }}>{invoice.invoice_number}</span>
          </div>
          <div className="receipt-row">
            <span>التاريخ والوقت:</span>
            <span>{invoice.created_at?.slice(0, 16)}</span>
          </div>
          <div className="receipt-row">
            <span>الكاشير:</span>
            <span>{invoice.cashier_name || 'الكاشير'}</span>
          </div>
          <div className="receipt-row">
            <span>العميل:</span>
            <span>{invoice.customer_name || 'زائر عادي'}</span>
          </div>
          {invoice.device_name && (
            <div className="receipt-row">
              <span>الجهاز / القاعة:</span>
              <span style={{ fontWeight: 'bold' }}>{invoice.device_name} {invoice.room_name ? `(${invoice.room_name})` : ''}</span>
            </div>
          )}
          {invoice.session_duration && (
            <div className="receipt-row">
              <span>مدة اللعب ({invoice.session_type === 'multi' ? 'مالتي' : 'سينجل'}):</span>
              <span>{invoice.session_duration}</span>
            </div>
          )}
        </div>

        <div className="receipt-divider" />

        {/* Items Table */}
        <div style={{ marginBottom: '8px' }}>
          <div className="receipt-row bold" style={{ borderBottom: '1px solid #000', paddingBottom: '3px' }}>
            <span style={{ width: '45%' }}>البند</span>
            <span style={{ width: '15%', textAlign: 'center' }}>الكمية</span>
            <span style={{ width: '20%', textAlign: 'left' }}>السعر</span>
            <span style={{ width: '20%', textAlign: 'left' }}>الإجمالي</span>
          </div>

          {items.map((itm, i) => (
            <div key={itm.id || i} className="receipt-row" style={{ fontSize: '11px', marginTop: '3px' }}>
              <span style={{ width: '45%' }}>{itm.item_name}</span>
              <span style={{ width: '15%', textAlign: 'center' }}>{itm.quantity}</span>
              <span style={{ width: '20%', textAlign: 'left' }}>{itm.unit_price}</span>
              <span style={{ width: '20%', textAlign: 'left', fontWeight: 'bold' }}>{itm.total_price}</span>
            </div>
          ))}
        </div>

        <div className="receipt-divider" />

        {/* Totals Breakdown */}
        <div style={{ fontSize: '11px' }}>
          {invoice.gaming_subtotal > 0 && (
            <div className="receipt-row">
              <span>حساب اللعب:</span>
              <span>{invoice.gaming_subtotal} ج.م</span>
            </div>
          )}
          {invoice.products_subtotal > 0 && (
            <div className="receipt-row">
              <span>حساب الكافيه والطلبات:</span>
              <span>{invoice.products_subtotal} ج.م</span>
            </div>
          )}
          {invoice.discount_amount > 0 && (
            <div className="receipt-row" style={{ color: '#d97706' }}>
              <span>الخصم ({invoice.discount_reason || 'خصم'}):</span>
              <span>-{invoice.discount_amount} ج.م</span>
            </div>
          )}

          <div className="receipt-double-divider" />

          <div className="receipt-row bold" style={{ fontSize: '15px' }}>
            <span>المبلغ الإجمالي:</span>
            <span>{invoice.grand_total} ج.م</span>
          </div>

          <div className="receipt-row">
            <span>المدفوع ({invoice.payment_method === 'cash' ? 'نقدي' : invoice.payment_method === 'card' ? 'فيزا' : 'محفظة'}):</span>
            <span>{invoice.paid_amount} ج.م</span>
          </div>

          {invoice.change_amount > 0 && (
            <div className="receipt-row bold">
              <span>الباقي للعميل:</span>
              <span>{invoice.change_amount} ج.م</span>
            </div>
          )}

          {invoice.remaining_amount > 0 && (
            <div className="receipt-row bold" style={{ color: '#dc2626' }}>
              <span>المتبقي آجل:</span>
              <span>{invoice.remaining_amount} ج.م</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '16px', borderTop: '1px dashed #000', paddingTop: '8px', fontSize: '10px' }}>
          <div>{store.invoice_footer_msg || 'شكراً لزيارتكم ونتشرف بحضوركم دائماً!'}</div>
          <div style={{ marginTop: '4px', color: '#666' }}>Powered by PS Lounge Manager</div>
        </div>
      </div>
    </div>
  );
}
