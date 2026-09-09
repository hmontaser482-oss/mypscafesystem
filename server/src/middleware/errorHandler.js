/**
 * Global Error Handling Middleware
 * Converts technical database and system errors into friendly Arabic messages
 */
function errorHandler(err, req, res, next) {
  console.error('[System Error]:', err);

  let status = 500;
  let message = 'حدث خطأ غير متوقع أثناء معالجة الطلب.';

  const errStr = err.message || '';

  if (errStr.includes('FOREIGN KEY constraint failed')) {
    status = 400;
    message = 'لا يمكن إتمام العملية لوجود عناصر مرتبطة بهذا السجل في النظام (مثل جلسات أو فواتير مسجلة).';
  } else if (errStr.includes('UNIQUE constraint failed')) {
    status = 400;
    if (errStr.includes('users.username')) {
      message = 'اسم المستخدم مسجل مسبقاً، يرجى اختيار اسم آخر.';
    } else if (errStr.includes('customers.phone')) {
      message = 'رقم الهاتف مسجل لعميل آخر بالفعل.';
    } else if (errStr.includes('invoices.invoice_number')) {
      message = 'رقم الفاتورة مكرر.';
    } else if (errStr.includes('products.barcode')) {
      message = 'الباركود مسجل لمنتج آخر بالفعل.';
    } else {
      message = 'هذا العنصر مسجل مسبقاً في النظام ولا يمكن تكراره.';
    }
  } else if (errStr.includes('انتقال غير مسموح به')) {
    status = 400;
    message = errStr;
  } else if (errStr.includes('Device not found') || errStr.includes('الجهاز غير موجود')) {
    status = 404;
    message = 'الجهاز المطلوب غير موجود.';
  } else if (errStr.includes('الجهاز غير متاح')) {
    status = 400;
    message = errStr;
  } else if (errStr.includes('Session not found') || errStr.includes('الجلسة غير موجودة')) {
    status = 404;
    message = 'الجلسة المطلوبة غير موجودة.';
  } else if (err.status) {
    status = err.status;
    message = err.message;
  }

  res.status(status).json({
    success: false,
    message,
    errorDetails: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = errorHandler;
