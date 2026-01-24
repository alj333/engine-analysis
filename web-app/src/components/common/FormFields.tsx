import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
}

export function NumberInput({ label, value, onChange, unit, ...props }: NumberInputProps) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="input pr-12"
          {...props}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; group?: string }[];
  placeholder?: string;
}

export function Select({ label, value, onChange, options, placeholder, ...props }: SelectProps) {
  // Group options if they have groups
  const hasGroups = options.some((opt) => opt.group);
  const groups = hasGroups
    ? [...new Set(options.map((opt) => opt.group).filter(Boolean))]
    : [];

  return (
    <div>
      <label className="label">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select"
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {hasGroups ? (
          groups.map((group) => (
            <optgroup key={group} label={group}>
              {options
                .filter((opt) => opt.group === group)
                .map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
            </optgroup>
          ))
        ) : (
          options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))
        )}
      </select>
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  showValue?: boolean;
  unit?: string;
}

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  showValue = true,
  unit,
}: SliderProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="label mb-0">{label}</label>
        {showValue && (
          <span className="text-sm text-slate-400">
            {value}
            {unit}
          </span>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
      />
    </div>
  );
}

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Checkbox({ label, checked, onChange, disabled }: CheckboxProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-yellow-500 focus:ring-yellow-500 focus:ring-offset-slate-900"
      />
      <span className={`text-sm ${disabled ? 'text-slate-500' : 'text-slate-300'}`}>
        {label}
      </span>
    </label>
  );
}

interface FieldGroupProps {
  children: ReactNode;
  columns?: 1 | 2;
}

export function FieldGroup({ children, columns = 1 }: FieldGroupProps) {
  return (
    <div className={`grid gap-3 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {children}
    </div>
  );
}

interface GearInputProps {
  label: string;
  inputValue: number;
  outputValue: number;
  onInputChange: (value: number) => void;
  onOutputChange: (value: number) => void;
}

export function GearInput({
  label,
  inputValue,
  outputValue,
  onInputChange,
  onOutputChange,
}: GearInputProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-400 w-16">{label}</span>
      <input
        type="number"
        value={inputValue || ''}
        onChange={(e) => onInputChange(parseInt(e.target.value) || 0)}
        className="input w-16 text-center px-2"
        placeholder="in"
      />
      <span className="text-slate-500">/</span>
      <input
        type="number"
        value={outputValue || ''}
        onChange={(e) => onOutputChange(parseInt(e.target.value) || 0)}
        className="input w-16 text-center px-2"
        placeholder="out"
      />
    </div>
  );
}
