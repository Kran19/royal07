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
import { cn } from "../../../lib/utils";

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
      <div className={cn('flex', 'min-h-[400px]', 'items-center', 'justify-center', 'rounded-3xl', 'bg-white/50', 'dark:bg-slate-900/20', 'backdrop-blur-md')}>
        <div className={cn('flex', 'flex-col', 'items-center', 'gap-4')}>
          <div className={cn('animate-spin', 'h-10', 'w-10', 'border-4', 'border-indigo-500', 'border-t-transparent', 'rounded-full', 'shadow-[0_0_15px_rgba(99,102,241,0.5)]')} />
          <p className={cn('text-slate-500', 'dark:text-slate-400', 'font-bold', 'tracking-wide', 'animate-pulse')}>Loading Configurations...</p>
        </div>
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

      <div className={cn('grid', 'grid-cols-1', 'gap-6', 'lg:grid-cols-2', 'max-w-7xl')}>
        <SectionCard title="Round Configuration" description="Manage the global timer for all automated bets.">
          <div className={cn('space-y-4', 'pt-2')}>
            <Input
              label="Round duration (seconds)"
              type="number"
              value={settings.roundDuration}
              onChange={(e) => setSettings({ ...settings, roundDuration: Number(e.target.value) })}
            />
         
          </div>
        </SectionCard>

        <SectionCard title="House Edge Guarantee" description="Ensure platform profitability automatically.">
          <div className={cn('space-y-6', 'pt-2')}>
            <div>
              <div className={cn('flex', 'items-center', 'justify-between', 'mb-4')}>
                <label className={cn('text-sm', 'font-bold', 'text-slate-700', 'dark:text-slate-300')}>
                  Minimum House Profit %
                </label>
                <span className={cn('px-3', 'py-1', 'bg-indigo-50', 'dark:bg-indigo-500/10', 'text-indigo-600', 'dark:text-indigo-400', 'font-black', 'rounded-lg', 'text-lg', 'border', 'border-indigo-100', 'dark:border-indigo-500/20', 'shadow-sm')}>
                  {Number(settings.houseProfitPercent ?? 5).toFixed(1)}%
                </span>
              </div>
              <input
                id="house-profit-slider"
                type="range"
                min={1}
                max={30}
                step={0.5}
                value={Number(settings.houseProfitPercent ?? 5)}
                onChange={(e) => setSettings({ ...settings, houseProfitPercent: Number(e.target.value) } as any)}
                className={cn('w-full', 'h-2.5', 'rounded-full', 'appearance-none', 'bg-slate-200', 'dark:bg-slate-700', 'accent-indigo-500', 'cursor-pointer')}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Betting Limits" description="Restrict minimum and maximum betting amounts per floor.">
          <div className={cn('grid', 'grid-cols-1', 'sm:grid-cols-2', 'gap-4', 'sm:gap-6', 'pt-2')}>
            <Input
              label="Minimum Bet (₹)"
              type="number"
              value={settings.minBetAmount}
              onChange={(e) => setSettings({ ...settings, minBetAmount: Number(e.target.value) })}
            />
            <Input
              label="Maximum Bet (₹)"
              type="number"
              value={settings.maxBetAmount}
              onChange={(e) => setSettings({ ...settings, maxBetAmount: Number(e.target.value) })}
            />
          </div>
        </SectionCard>

        <SectionCard title="System Availability" description="Emergency controls for the platform.">
          <div className="pt-2">
            <ToggleRow
              title="Maintenance Mode"
              description="Immediately disable all betting activity across the platform."
              checked={settings.maintenanceMode}
              onChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
            />
          </div>
        </SectionCard>
        
        <SectionCard title="Bank & Deposit Details" description="Configure the payment information displayed to users." className="lg:col-span-2">
          <div className={cn('grid', 'grid-cols-1', 'gap-6', 'pt-2', 'lg:grid-cols-2')}>
            
            {/* Left Column: Bank Inputs */}
            <div className="space-y-5">
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

            {/* Right Column: QR and Instructions */}
            <div className="space-y-6">
              <TextArea
                label="Payment Instructions"
                value={settings.paymentInstructions || ''}
                onChange={(e) => setSettings({ ...settings, paymentInstructions: e.target.value })}
                className="h-32"
              />
              
              <div className={cn('p-5', 'rounded-xl', 'border', 'border-slate-200', 'dark:border-slate-700/50', 'bg-slate-50', 'dark:bg-slate-800/30')}>
                 <label className={cn('text-xs', 'font-bold', 'uppercase', 'tracking-widest', 'text-slate-500', 'mb-4', 'block')}>Payment QR Code</label>
                 <div className={cn('flex', 'flex-col', 'sm:flex-row', 'gap-6', 'items-center')}>
                   {settings.qrCodeUrl ? (
                     <div className={cn('relative', 'group')}>
                       <img 
                         src={`${apiService.getApiBase()}${settings.qrCodeUrl}`} 
                         alt="QR Code" 
                         className={cn('h-32', 'w-32', 'rounded-xl', 'object-contain', 'bg-white', 'p-2', 'shadow-sm', 'border', 'border-slate-200', 'dark:border-transparent')} 
                       />
                     </div>
                   ) : (
                     <div className={cn('h-32', 'w-32', 'rounded-xl', 'bg-slate-100', 'dark:bg-slate-800/80', 'flex', 'flex-col', 'items-center', 'justify-center', 'text-slate-400', 'text-xs', 'border-2', 'border-dashed', 'border-slate-300', 'dark:border-slate-600')}>
                       <span className={cn('text-2xl', 'mb-1')}>📷</span>
                       No QR Uploaded
                     </div>
                   )}
                   
                   <div className={cn('flex-1', 'w-full', 'sm:w-auto')}>
                     <p className={cn('text-sm', 'text-slate-500', 'mb-3', 'hidden', 'sm:block')}>Upload a valid UPI QR code for users to scan during deposits. Square aspect ratios work best.</p>
                     <input 
                       type="file" 
                       accept="image/*"
                       onChange={handleQrUpload}
                       className={cn('block', 'w-full', 'text-sm', 'text-slate-500', 'file:mr-4', 'file:py-2.5', 'file:px-5', 'file:rounded-xl', 'file:border-0', 'file:text-sm', 'file:font-bold', 'file:bg-indigo-50', 'file:text-indigo-600', 'hover:file:bg-indigo-100', 'dark:file:bg-indigo-500/10', 'dark:file:text-indigo-400', 'dark:hover:file:bg-indigo-500/20', 'file:transition-colors', 'cursor-pointer', 'outline-none')}
                     />
                   </div>
                 </div>
              </div>
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
          <div className={cn('flex', 'justify-end')}>
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
    <div className={cn('flex', 'items-center', 'justify-between', 'gap-4', 'rounded-2xl', 'border', 'border-rose-100', 'dark:border-rose-900/30', 'bg-rose-50/50', 'dark:bg-rose-950/20', 'p-5', 'transition-all')}>
      <div>
        <p className={cn('text-sm', 'font-bold', 'text-slate-900', 'dark:text-slate-100')}>{title}</p>
        {description ? <p className={cn('text-sm', 'text-slate-500', 'dark:text-slate-400', 'mt-1', 'leading-relaxed')}>{description}</p> : null}
      </div>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 flex-shrink-0 rounded-full border-2 transition-all duration-300 ${
          checked 
            ? 'border-rose-500 bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]' 
            : 'border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-all duration-300 ${
            checked ? 'left-6' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}
