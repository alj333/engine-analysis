import { useEffect, useState } from 'react';
import { useConfigStore } from '@/stores/configStore';

export function useLoadConfigs() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { loadEngines, loadKarts, loadTyres } = useConfigStore();

  useEffect(() => {
    async function loadAllConfigs() {
      try {
        setIsLoading(true);

        // Load all config files in parallel
        const [enginesRes, kartsRes, tyresRes] = await Promise.all([
          fetch('/data/engines.json'),
          fetch('/data/karts.json'),
          fetch('/data/tyres.json'),
        ]);

        if (!enginesRes.ok || !kartsRes.ok || !tyresRes.ok) {
          throw new Error('Failed to load configuration files');
        }

        const [enginesData, kartsData, tyresData] = await Promise.all([
          enginesRes.json(),
          kartsRes.json(),
          tyresRes.json(),
        ]);

        loadEngines(enginesData.engines);
        loadKarts(kartsData.karts);
        loadTyres(tyresData.tyres);

        setError(null);
      } catch (err) {
        console.error('Failed to load configs:', err);
        setError(err instanceof Error ? err.message : 'Unknown error loading configs');
      } finally {
        setIsLoading(false);
      }
    }

    loadAllConfigs();
  }, [loadEngines, loadKarts, loadTyres]);

  return { isLoading, error };
}

// Load channel mappings
export async function loadChannelMappings(): Promise<Record<string, string[]>> {
  const res = await fetch('/data/channelMappings.json');
  if (!res.ok) throw new Error('Failed to load channel mappings');
  const data = await res.json();
  return data.channelMappings;
}
