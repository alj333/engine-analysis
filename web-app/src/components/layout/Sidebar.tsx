import type { ReactNode } from 'react';
import { Car, Cog, Circle, Settings2, Cloud, Sliders } from 'lucide-react';

interface SidebarProps {
  children: ReactNode;
}

interface SectionProps {
  title: string;
  icon: ReactNode;
  color?: 'yellow' | 'cyan';
  children: ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="w-80 bg-slate-850 border-r border-slate-700 overflow-y-auto">
      <div className="p-4 space-y-4">
        {children}
      </div>
    </aside>
  );
}

export function SidebarSection({ title, icon, color = 'yellow', children }: SectionProps) {
  const colorClasses = {
    yellow: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5',
    cyan: 'text-cyan-500 border-cyan-500/30 bg-cyan-500/5',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <h2 className={`section-title ${color === 'cyan' ? 'text-cyan-500' : ''}`}>
        {icon}
        {title}
      </h2>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

// Pre-defined section headers with icons
export function KartSection({ children }: { children: ReactNode }) {
  return (
    <SidebarSection title="KART" icon={<Car size={20} />} color="yellow">
      {children}
    </SidebarSection>
  );
}

export function EngineSection({ children }: { children: ReactNode }) {
  return (
    <SidebarSection title="ENGINE" icon={<Cog size={20} />} color="yellow">
      {children}
    </SidebarSection>
  );
}

export function FinalDriveSection({ children }: { children: ReactNode }) {
  return (
    <SidebarSection title="FINAL DRIVE" icon={<Settings2 size={20} />} color="yellow">
      {children}
    </SidebarSection>
  );
}

export function TyreSection({ children }: { children: ReactNode }) {
  return (
    <SidebarSection title="REAR WHEEL" icon={<Circle size={20} />} color="yellow">
      {children}
    </SidebarSection>
  );
}

export function RunConditionsSection({ children }: { children: ReactNode }) {
  return (
    <SidebarSection title="RUN CONDITIONS" icon={<Cloud size={20} />} color="cyan">
      {children}
    </SidebarSection>
  );
}

export function ResultsOptionsSection({ children }: { children: ReactNode }) {
  return (
    <SidebarSection title="RESULTS OPTIONS" icon={<Sliders size={20} />} color="cyan">
      {children}
    </SidebarSection>
  );
}
