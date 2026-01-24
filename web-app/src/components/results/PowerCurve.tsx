import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type TooltipItem,
} from 'chart.js';
import type { BinnedResult } from '@/types/results';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PowerCurveProps {
  data: BinnedResult[];
  comparison?: BinnedResult[];
  showTorque?: boolean;
}

export function PowerCurve({ data, comparison, showTorque = true }: PowerCurveProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        No data to display
      </div>
    );
  }

  const labels = data.map(d => d.rpm.toString());

  const datasets = [
    {
      label: 'Power (CV)',
      data: data.map(d => d.avgPower),
      borderColor: 'rgb(239, 68, 68)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.3,
      yAxisID: 'y',
    },
    ...(showTorque ? [{
      label: 'Torque (N·m)',
      data: data.map(d => d.avgTorque),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      fill: false,
      tension: 0.3,
      yAxisID: 'y1',
    }] : []),
    ...(comparison ? [
      {
        label: 'Power - Comparison (CV)',
        data: comparison.map(d => d.avgPower),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0.3,
        yAxisID: 'y',
      },
      ...(showTorque ? [{
        label: 'Torque - Comparison (N·m)',
        data: comparison.map(d => d.avgTorque),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0.3,
        yAxisID: 'y1',
      }] : []),
    ] : []),
  ];

  const chartData = { labels, datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(148, 163, 184)',
          font: { size: 11 },
        },
      },
      title: {
        display: true,
        text: 'Wheel Power & Torque vs RPM',
        color: 'rgb(226, 232, 240)',
        font: { size: 14, weight: 'bold' as const },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: 'rgb(226, 232, 240)',
        bodyColor: 'rgb(148, 163, 184)',
        borderColor: 'rgb(51, 65, 85)',
        borderWidth: 1,
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y ?? 0;
            if (label.includes('Power')) {
              return `${label}: ${value.toFixed(2)} CV`;
            } else if (label.includes('Torque')) {
              return `${label}: ${value.toFixed(2)} N·m`;
            }
            return `${label}: ${value.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'RPM',
          color: 'rgb(148, 163, 184)',
        },
        ticks: { color: 'rgb(148, 163, 184)' },
        grid: { color: 'rgba(51, 65, 85, 0.5)' },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Power (CV)',
          color: 'rgb(239, 68, 68)',
        },
        ticks: { color: 'rgb(239, 68, 68)' },
        grid: { color: 'rgba(51, 65, 85, 0.5)' },
      },
      ...(showTorque ? {
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: {
            display: true,
            text: 'Torque (N·m)',
            color: 'rgb(59, 130, 246)',
          },
          ticks: { color: 'rgb(59, 130, 246)' },
          grid: { drawOnChartArea: false },
        },
      } : {}),
    },
  };

  return (
    <div className="h-[640px]">
      <Line data={chartData} options={options} />
    </div>
  );
}
