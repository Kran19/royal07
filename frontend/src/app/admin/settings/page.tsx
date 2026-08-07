'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Input,
  TextArea,
  Badge,
  Modal,
  PageHeader,
  SectionCard,
} from '@/components/admin/common';
import { apiService } from '@/lib/api/api-service';
import { AdminSettings } from '@/types';

type AlertState = {
  title: string;
  description: string;
  tone: 'success' | 'danger';
} | null;

export default function SettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertState, setAlertState] = useState<AlertState>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiService.getSettings();
        if (response.success && response.data) {
          setSettings(response.data);
        } else {
          setAlertState({
            title: 'Fetch failed',
            description: response.message || 'The engine returned an empty response.',
            tone: 'danger',
          });
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        setAlertState({
          title: 'Connection error',
          description: 'The platform settings engine is unreachable.',
          tone: 'danger',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await apiService.updateSettings(settings);
      if (response.success) {
        setAlertState({
          title: 'Settings saved',
          description: 'Global house parameters have been updated successfully.',
          tone: 'success',
        });
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      setAlertState({
        title: 'Save failed',
        description: 'Could not sync settings with the backend.',
        tone: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const response = await apiService.uploadSettingsQr(file);
      if (response.success && response.data?.qrCodeUrl) {
        const qrCodeUrl = response.data.qrCodeUrl;
        setSettings((prev) => prev ? { ...prev, qrCodeUrl } : null);
        setAlertState({ title: 'QR Code Uploaded', description: 'The QR Code has been securely saved to the server.', tone: 'success' });
      }
    } catch (e) {
      console.error(e);
      setAlertState({ title: 'Upload Failed', description: 'Could not upload the QR code image.', tone: 'danger' });
    }
  };

  if (loading || !settings) {
    return (
      <div className="glass-panel flex min-h-[320px] items-center justify-center rounded-3xl">
        <div className="animate-spin h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Platform settings"
        description="Global parameters for the automated 60-second round engine."
        actions={
          <Button variant="primary" size="lg" onClick={handleSaveSettings} loading={saving}>
            Save settings
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Round Configuration">
          <div className="space-y-4 pt-2">
            <Input
              label="Round duration (seconds)"
              type="number"
              value={settings.roundDuration}
              onChange={(e) => setSettings({ ...settings, roundDuration: Number(e.target.value) })}
            />
            <p className="text-xs text-slate-500 italic">Default: 60s as per production spec.</p>
          </div>
        </SectionCard>

        <SectionCard title="House Profit Guarantee">
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-500 font-bold block mb-3">
                House profit %
              </label>
              <div className="flex items-center gap-4">
                <input
                  id="house-profit-slider"
                  type="range"
                  min={1}
                  max={30}
                  step={0.5}
                  value={Number(settings.houseProfitPercent ?? 5)}
                  onChange={(e) => setSettings({ ...settings, houseProfitPercent: Number(e.target.value) } as any)}
                  className="flex-1 h-2 rounded-full appearance-none bg-gradient-to-r from-cyan-500 to-blue-600 accent-cyan-400 cursor-pointer"
                />
                <span className="text-2xl font-bold text-cyan-400 min-w-[4ch] text-right">
                  {Number(settings.houseProfitPercent ?? 5).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-2 text-sm">
              <p className="text-slate-300">
                <span className="font-semibold text-white">How it works:</span> Every round, the engine guarantees the house keeps at least this percentage of the total stake before distributing winnings.
              </p>
              <p className="text-slate-400 text-xs">
                Example at <span className="text-cyan-400 font-semibold">{Number(settings.houseProfitPercent ?? 5).toFixed(1)}%</span>: On a ₹5,000 stake round, the house keeps ≥ <span className="text-emerald-400 font-semibold">₹{(5000 * Number(settings.houseProfitPercent ?? 5) / 100).toFixed(0)}</span>, and the payout pool is capped at <span className="text-yellow-400 font-semibold">₹{(5000 * (1 - Number(settings.houseProfitPercent ?? 5) / 100)).toFixed(0)}</span>.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Betting Limits">
          <div className="grid grid-cols-2 gap-4 pt-2">
            <Input
              label="Min (₹)"
              type="number"
              value={settings.minBetAmount}
              onChange={(e) => setSettings({ ...settings, minBetAmount: Number(e.target.value) })}
            />
            <Input
              label="Max (₹)"
              type="number"
              value={settings.maxBetAmount}
              onChange={(e) => setSettings({ ...settings, maxBetAmount: Number(e.target.value) })}
            />
          </div>
        </SectionCard>

        <SectionCard title="System Availability">
          <ToggleRow
            title="Maintenance Mode"
            description="Disable all betting activity immediately."
            checked={settings.maintenanceMode}
            onChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
          />
        </SectionCard>
        
        <SectionCard title="Bank & Deposit Details">
          <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
            <Input
              label="Bank Account Name"
              value={settings.bankAccountName || ''}
              onChange={(e) => setSettings({ ...settings, bankAccountName: e.target.value })}
            />
            <Input
              label="Account Number"
              value={settings.bankAccountNumber || ''}
              onChange={(e) => setSettings({ ...settings, bankAccountNumber: e.target.value })}
            />
            <Input
              label="IFSC Code"
              value={settings.bankIfscCode || ''}
              onChange={(e) => setSettings({ ...settings, bankIfscCode: e.target.value })}
            />
            <Input
              label="UPI ID"
              value={settings.upiId || ''}
              onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
            />
          </div>
          <div className="mt-4">
            <TextArea
              label="Payment Instructions"
              value={settings.paymentInstructions || ''}
              onChange={(e) => setSettings({ ...settings, paymentInstructions: e.target.value })}
            />
          </div>
          <div className="mt-4 p-4 rounded-xl border border-white/5 bg-slate-900/50">
             <label className="text-xs uppercase tracking-wider text-slate-500 font-bold block mb-4">Payment QR Code</label>
             <div className="flex gap-6 items-center">
               {settings.qrCodeUrl ? (
                 <img src={`${apiService.getApiBase()}${settings.qrCodeUrl}`} className="h-24 w-24 rounded-lg object-contain bg-white p-1" />
               ) : (
                 <div className="h-24 w-24 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 text-xs border border-dashed border-slate-600">No QR</div>
               )}
               <input 
                 type="file" 
                 accept="image/*"
                 onChange={handleQrUpload}
                 className="text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-cyan-500/20 file:text-cyan-400 hover:file:bg-cyan-500/30 file:transition-all cursor-pointer"
               />
             </div>
          </div>
        </SectionCard>
      </div>

      <Modal
        isOpen={Boolean(alertState)}
        onClose={() => setAlertState(null)}
        title={alertState?.title || ''}
        description={alertState?.description}
        footer={
          <div className="flex justify-end">
            <Button variant={alertState?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => setAlertState(null)}>
              Close
            </Button>
          </div>
        }
      />
    </>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/5 p-4">
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        {description ? <p className="text-sm text-slate-400">{description}</p> : null}
      </div>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 rounded-full border transition-all duration-300 ${
          checked ? 'border-cyan-400/50 bg-cyan-500/20 shadow-[0_0_12px_rgba(34,211,238,0.3)]' : 'border-white/10 bg-white/5 hover:bg-white/10'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
            checked ? 'left-8' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}
