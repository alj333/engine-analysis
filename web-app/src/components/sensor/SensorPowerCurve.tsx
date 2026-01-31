/**
 * Power vs Speed chart for sensor data
 * Adapted from PowerCurve.tsx but with Speed on X-axis instead of RPM
 */

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
import type { SpeedPowerPoint } from '@/types/sensor';

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

interface SensorPowerCurveProps {
  data: SpeedPowerPoint[];
  comparison?: SpeedPowerPoint[];
}

export function SensorPowerCurve({ data, comparison }: SensorPowerCurveProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        No data to display
      </div>
    );
  }

  const labels = data.map((d) => d.speedKmh.toFixed(0));

  const datasets = [
    {
      label: 'Power (CV)',
      data: data.map((d) => d.avgPower),
      borderColor: 'rgb(239, 68, 68)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.3,
      pointRadius: 3,
      pointHoverRadius: 5,
    },
    ...(comparison
      ? [
          {
            label: 'Power - Comparison (CV)',
            data: comparison.map((d) => d.avgPower),
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            tension: 0.3,
            pointRadius: 2,
            pointHoverRadius: 4,
          },
        ]
      : []),
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
        text: 'Power vs Speed',
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
          title: (context: TooltipItem<'line'>[]) => {
            return `Speed: ${context[0].label} km/h`;
          },
          label: (context: TooltipItem<'line'>) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y ?? 0;
            return `${label}: ${value.toFixed(2)} CV`;
          },
          afterBody: (context: TooltipItem<'line'>[]) => {
            const index = context[0].dataIndex;
            const point = data[index];
            if (!point) return [];
            return [
              '',
              `Samples: ${point.sampleCount}`,
              `Avg Accel: ${point.avgForwardAccel.toFixed(2)} m/s²`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Speed (km/h)',
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
        min: 0,
      },
    },
  };

  return (
    <div className="h-[400px] md:h-[500px]">
      <Line data={chartData} options={options} />
    </div>
  );
}
