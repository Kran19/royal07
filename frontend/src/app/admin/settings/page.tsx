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
