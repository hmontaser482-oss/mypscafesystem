import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Save, Download, Printer, DollarSign,
  Clock, CheckCircle2, ShieldCheck, Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Settings() {
  const { t } = useLanguage();
  const { authFetch } = useAuth();

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('ج.م');
  const [roundMethod, setRoundMethod] = useState('minute');
  const [minChargeMinutes, setMinChargeMinutes] = useState(15);
  const [peakHoursEnabled, setPeakHoursEnabled] = useState(false);
  const [peakStartTime, setPeakStartTime] = useState('18:00');
  const [peakEndTime, setPeakEndTime] = useState('02:00');
  const [peakSurchargePercent, setPeakSurchargePercent] = useState(20);
  const [thermalWidth, setThermalWidth] = useState(80);
  const [footerMsg, setFooterMsg] = useState('');

  const loadSettings = async () => {
    try {
      const res = await authFetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        setSettings(s);
        setStoreName(s.store_name);
        setPhone(s.phone || '');
        setAddress(s.address || '');
        setTaxNumber(s.tax_number || '');
        setCurrencySymbol(s.currency_symbol || 'ج.م');
        setRoundMethod(s.round_method || 'minute');
        setMinChargeMinutes(s.min_charge_minutes || 15);
        setPeakHoursEnabled(!!s.peak_hours_enabled);
        setPeakStartTime(s.peak_start_time || '18:00');
        setPeakEndTime(s.peak_end_time || '02:00');
        setPeakSurchargePercent(s.peak_surcharge_percent || 20);
        setThermalWidth(s.thermal_width || 80);
        setFooterMsg(s.invoice_footer_msg || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await authFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          store_name: storeName,
          phone,
          address,
          tax_number: taxNumber,
          currency_symbol: currencySymbol,
          round_method: roundMethod,
          min_charge_minutes: Number(minChargeMinutes),
          peak_hours_enabled: peakHoursEnabled,
          peak_start_time: peakStartTime,
          peak_end_time: peakEndTime,
          peak_surcharge_percent: Number(peakSurchargePercent),
          thermal_width: Number(thermalWidth),
          invoice_footer_msg: footerMsg
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setSuccessMsg('تم حفظ الإعدادات وتطبيق قواعد التسعير الجديدة بنجاح!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDownloadBackup = () => {
    window.open('/api/settings/backup/download', '_blank');
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>جاري تحميل الإعدادات...</div>;

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>إعدادات النظام العامة (Settings)</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            تخصيص بيانات المحل، وقواعد محرك التسعير (Pricing Engine)، والطابعات والنسخ الاحتياطي
          </p>
        </div>

        <button className="btn btn-secondary" onClick={handleDownloadBackup}>
          <Database size={16} />
          تحميل نسخة احتياطية (Backup DB)
        </button>
      </div>

      {successMsg && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 700 }}>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Section 1: Store Information */}
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: '#60a5fa' }}>
            🏪 بيانات المحل والفواتير (Store Profile)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">اسم المحل / المركز:</label>
              <input type="text" className="form-control" value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">رقم الهاتف:</label>
              <input type="text" className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">العنوان:</label>
              <input type="text" className="form-control" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">رمز العملة:</label>
              <input type="text" className="form-control" value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">الرقم الضريبي / السجل التجاري (اختياري):</label>
            <input type="text" className="form-control" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
          </div>
        </div>

        {/* Section 2: Pricing Engine & Rounding Rules */}
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.4rem', color: '#fbbf24' }}>
            ⚙️ محرك التسعير وقواعد التقريب (Pricing Engine & Rounding)
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '1.25rem' }}>
            تتحكم هذه القواعد في كيفية حساب كسور الساعات في الجلسات المفتوحة والمغلقة
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="form-label">طريقة حساب وتقريب الدقائق:</label>
              <select className="form-control" value={roundMethod} onChange={(e) => setRoundMethod(e.target.value)}>
                <option value="minute">بالدقيقة الفعلية (Per Minute - الأكثر عدالة)</option>
                <option value="15m">لأقرب 15 دقيقة (ربع ساعة)</option>
                <option value="30m">لأقرب 30 دقيقة (نصف ساعة)</option>
                <option value="hour">تقريب لساعة كاملة (Per Full Hour)</option>
              </select>
            </div>
            <div>
              <label className="form-label">الحد الأدنى لمحاسبة الجلسة (Minimum Charge):</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number"
                  min="0"
                  step="5"
                  className="form-control"
                  value={minChargeMinutes}
                  onChange={(e) => setMinChargeMinutes(e.target.value)}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>دقيقة كحد أدنى</span>
              </div>
            </div>
          </div>

          {/* Peak Hours Box */}
          <div style={{ background: 'var(--bg-surface-2)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input
                type="checkbox"
                id="peak_check"
                checked={peakHoursEnabled}
                onChange={(e) => setPeakHoursEnabled(e.target.checked)}
              />
              <label htmlFor="peak_check" style={{ fontWeight: 800, cursor: 'pointer' }}>
                تفعيل تسعير ساعات الذروة تلقائياً (Peak Hours Surcharge)
              </label>
            </div>

            {peakHoursEnabled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>من الساعة:</label>
                  <input type="time" className="form-control" value={peakStartTime} onChange={(e) => setPeakStartTime(e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>إلى الساعة:</label>
                  <input type="time" className="form-control" value={peakEndTime} onChange={(e) => setPeakEndTime(e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>نسبة الزيادة (%):</label>
                  <input type="number" step="5" className="form-control" value={peakSurchargePercent} onChange={(e) => setPeakSurchargePercent(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Thermal Printer Settings */}
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: '#10b981' }}>
            🖨️ إعدادات الطابعة الحرارية والفاتورة (Thermal Receipt)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">عرض ورق الطابعة:</label>
              <select className="form-control" value={thermalWidth} onChange={(e) => setThermalWidth(e.target.value)}>
                <option value="80">طابعة 80mm حرارية (القياسية)</option>
                <option value="57">طابعة 57mm صغيرة</option>
              </select>
            </div>
            <div>
              <label className="form-label">رسالة أسفل الفاتورة (Receipt Footer):</label>
              <input type="text" className="form-control" value={footerMsg} onChange={(e) => setFooterMsg(e.target.value)} />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-success" style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}>
          <Save size={18} />
          حفظ جميع الإعدادات الآن
        </button>
      </form>
    </div>
  );
}
