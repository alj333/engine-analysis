import { CheckCircle, AlertCircle } from 'lucide-react';
import { useAcquisitionStore } from '@/stores/acquisitionStore';
import { Checkbox } from '@/components/common/FormFields';

const CHANNEL_LABELS: Record<string, { label: string; required: boolean }> = {
  time: { label: 'Time', required: true },
  speed: { label: 'Speed (GPS)', required: true },
  rpm: { label: 'Engine Speed', required: true },
  lonAcc: { label: 'Longitudinal Acc', required: true },
  latAcc: { label: 'Lateral Acc', required: false },
  distance: { label: 'Distance', required: false },
  slope: { label: 'Slope', required: false },
  tempHead: { label: 'Head Temp', required: false },
  tempCool: { label: 'Coolant Temp', required: false },
  tempExhaust: { label: 'Exhaust Temp', required: false },
  lambda: { label: 'Lambda', required: false },
  throttle: { label: 'Throttle', required: false },
};

export function ChannelMapping() {
  const {
    headers,
    channelMapping,
    keepSelectedLabels,
    updateChannelMapping,
    setKeepSelectedLabels,
  } = useAcquisitionStore();

  if (headers.length === 0) {
    return null;
  }

  const channels = Object.entries(CHANNEL_LABELS);
  const requiredChannels = channels.filter(([, info]) => info.required);
  const optionalChannels = channels.filter(([, info]) => !info.required);

  const allRequiredMapped = requiredChannels.every(
    ([channel]) => channelMapping[channel]?.header !== null
  );

  return (
    <div className="space-y-4">
      {/* Status indicator */}
      <div className={`flex items-center gap-2 p-3 rounded-lg ${
        allRequiredMapped ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
      }`}>
        {allRequiredMapped ? (
          <>
            <CheckCircle size={18} />
            <span className="text-sm">All required channels mapped</span>
          </>
        ) : (
          <>
            <AlertCircle size={18} />
            <span className="text-sm">Some required channels need mapping</span>
          </>
        )}
      </div>

      {/* Required channels */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-slate-400">Required Channels</h4>
        {requiredChannels.map(([channel, info]) => (
          <ChannelRow
            key={channel}
            channel={channel}
            label={info.label}
            headers={headers}
            mapping={channelMapping[channel]}
            onUpdate={(header) => updateChannelMapping(channel, header)}
          />
        ))}
      </div>

      {/* Optional channels */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-slate-400">Optional Channels</h4>
        {optionalChannels.map(([channel, info]) => (
          <ChannelRow
            key={channel}
            channel={channel}
            label={info.label}
            headers={headers}
            mapping={channelMapping[channel]}
            onUpdate={(header) => updateChannelMapping(channel, header)}
          />
        ))}
      </div>

      {/* Keep selected labels checkbox */}
      <div className="pt-2 border-t border-slate-700">
        <Checkbox
          label="Keep selected labels for future imports"
          checked={keepSelectedLabels}
          onChange={setKeepSelectedLabels}
        />
      </div>
    </div>
  );
}

interface ChannelRowProps {
  channel: string;
  label: string;
  headers: string[];
  mapping: { header: string | null; status: string } | undefined;
  onUpdate: (header: string | null) => void;
}

function ChannelRow({ label, headers, mapping, onUpdate }: ChannelRowProps) {
  const status = mapping?.status || 'unmatched';
  const selectedHeader = mapping?.header || '';

  return (
    <div className="flex items-center gap-2">
      {/* Status indicator */}
      <div className={`w-3 h-3 rounded-full ${
        status === 'matched' ? 'bg-green-500' :
        status === 'manual' ? 'bg-blue-500' :
        'bg-red-500'
      }`} />

      {/* Label */}
      <span className="text-sm text-slate-300 w-32">{label}</span>

      {/* Dropdown */}
      <select
        value={selectedHeader}
        onChange={(e) => onUpdate(e.target.value || null)}
        className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-yellow-500"
      >
        <option value="">-- Not mapped --</option>
        {headers.map((header) => (
          <option key={header} value={header}>
            {header}
          </option>
        ))}
      </select>
    </div>
  );
}
