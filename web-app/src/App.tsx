import { useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import {
  Sidebar,
  KartSection,
  EngineSection,
  FinalDriveSection,
  TyreSection,
  RunConditionsSection,
  ResultsOptionsSection,
} from '@/components/layout/Sidebar';
import { Select, NumberInput, Slider, FieldGroup, GearInput } from '@/components/common/FormFields';
import { FileImport } from '@/components/acquisition/FileImport';
import { ChannelMapping } from '@/components/acquisition/ChannelMapping';
import { LapSelector } from '@/components/acquisition/LapSelector';
import { PowerCurve } from '@/components/results/PowerCurve';
import { ResultsSummary } from '@/components/results/ResultsSummary';
import { useConfigStore } from '@/stores/configStore';
import { useAcquisitionStore } from '@/stores/acquisitionStore';
import { useResultsStore } from '@/stores/resultsStore';
import { useLoadConfigs } from '@/hooks/useLoadConfigs';
import { runAnalysis } from '@/lib/analysis/powerCalculation';
import { Laptop, BarChart3, Loader2, Flag, Settings } from 'lucide-react';

function App() {
  const { isLoading: configsLoading, error: configsError } = useLoadConfigs();
  const [activeView, setActiveView] = useState<'input' | 'output'>('input');

  // Config store
  const {
    kart,
    engine,
    tyre,
    finalDrive,
    runConditions,
    karts,
    engines,
    tyres,
    setKart,
    setEngine,
    setTyre,
    setFinalDrive,
    setRunConditions,
  } = useConfigStore();

  // Acquisition store
  const {
    filterLevel,
    minRpm,
    maxRpm,
    setFilterLevel,
    setMinRpm,
    setMaxRpm,
    rawData,
    laps,
    selectedLaps,
    headers,
    clearData: clearAcquisitionData,
  } = useAcquisitionStore();

  // Results store
  const { results, comparisonResults, isAnalyzing, analysisError, setResults, setIsAnalyzing, setAnalysisError, clearResults } = useResultsStore();

  // Handlers
  const handleStart = useCallback(() => {
    if (!rawData || selectedLaps.length === 0) {
      setAnalysisError('Please import a CSV file and select laps to analyze');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    // Run analysis in a setTimeout to allow UI to update
    setTimeout(() => {
      try {
        console.log('Starting analysis with config:', {
          engine: engine.name,
          isDirectDrive: !engine.gearbox.gears || engine.gearbox.gears.length === 0,
          finalRatio: finalDrive.rearSprocket / finalDrive.frontSprocket,
          selectedLaps,
          rpmRange: { min: minRpm, max: maxRpm },
        });

        const analysisResults = runAnalysis(
          rawData,
          laps,
          selectedLaps,
          {
            kart,
            engine,
            tyre,
            finalDrive,
            runConditions,
            minRpm,
            maxRpm,
            filterLevel,
          }
        );

        console.log('Analysis results:', {
          rawDataPoints: analysisResults.rawDataPoints,
          binnedResultsCount: analysisResults.binnedResults.length,
          peakPower: analysisResults.statistics.peakPower,
        });

        if (analysisResults.binnedResults.length === 0) {
          setAnalysisError(`No valid data points found. The selected engine "${engine.name}" may not match your telemetry data. For direct-drive karts (X30, Rotax, OK, etc.), select a direct-drive engine. For shifter karts (KZ), select a KZ engine.`);
        } else {
          setResults(analysisResults);
          setActiveView('output');
        }
      } catch (err) {
        console.error('Analysis error:', err);
        setAnalysisError(err instanceof Error ? err.message : 'Analysis failed');
      } finally {
        setIsAnalyzing(false);
      }
    }, 50);
  }, [rawData, laps, selectedLaps, kart, engine, tyre, finalDrive, runConditions, minRpm, maxRpm, filterLevel, setResults, setIsAnalyzing, setAnalysisError]);

  const handleOutput = () => setActiveView('output');
  const handleBack = () => setActiveView('input');
  const handleReset = useCallback(() => {
    clearAcquisitionData();
    clearResults();
    setActiveView('input');
  }, [clearAcquisitionData, clearResults]);
  const handleSave = () => console.log('Save session');
  const handleOpen = () => console.log('Open session');
  const handlePrint = () => window.print();
  const handleLoadFile1 = () => console.log('Load File 1');
  const handleLoadFile2 = () => console.log('Load File 2');
  const handleCompare = () => console.log('Compare');

  // Loading state
  if (configsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-yellow-500" size={48} />
          <p className="text-slate-400">Loading configuration data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (configsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">Failed to load configuration data</p>
          <p className="text-slate-500 text-sm">{configsError}</p>
        </div>
      </div>
    );
  }

  // Helper to build select options with categories
  const kartOptions = karts.map((k) => ({
    value: k.id,
    label: k.name,
    group: (k as unknown as { category?: string }).category || 'Other',
  }));
  const engineOptions = engines.map((e) => ({
    value: e.id,
    label: e.name,
    group: e.category,
  }));
  const tyreOptions = tyres.map((t) => ({
    value: t.id,
    label: t.name,
    group: (t as unknown as { brand?: string }).brand || 'Other',
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        onStart={handleStart}
        onOutput={handleOutput}
        onBack={handleBack}
        onReset={handleReset}
        onSave={handleSave}
        onOpen={handleOpen}
        onPrint={handlePrint}
        onLoadFile1={handleLoadFile1}
        onLoadFile2={handleLoadFile2}
        onCompare={handleCompare}
        isAnalyzing={isAnalyzing}
        hasResults={!!results}
        hasComparison={!!comparisonResults}
        activeView={activeView}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Configuration */}
        <Sidebar>
          {/* Kart Configuration */}
          <KartSection>
            <Select
              label=""
              value={kart.id}
              onChange={(id) => {
                const selected = karts.find((k) => k.id === id);
                if (selected) setKart(selected);
              }}
              options={kartOptions}
              placeholder="Select kart category"
            />
            <FieldGroup>
              <NumberInput
                label="Total Weight"
                value={kart.weight}
                onChange={(v) => setKart({ ...kart, weight: v })}
                unit="kg"
                step={1}
              />
              <NumberInput
                label="Frontal Area"
                value={kart.frontalArea}
                onChange={(v) => setKart({ ...kart, frontalArea: v })}
                unit="m²"
                step={0.001}
              />
              <NumberInput
                label="Drag Coeff."
                value={kart.dragCoefficient}
                onChange={(v) => setKart({ ...kart, dragCoefficient: v })}
                step={0.01}
              />
            </FieldGroup>
          </KartSection>

          {/* Engine Configuration */}
          <EngineSection>
            <Select
              label=""
              value={engine.id}
              onChange={(id) => {
                const selected = engines.find((e) => e.id === id);
                if (selected) setEngine(selected);
              }}
              options={engineOptions}
              placeholder="Select engine"
            />
            <NumberInput
              label="Engine Inertia"
              value={engine.inertia}
              onChange={(v) => setEngine({ ...engine, inertia: v })}
              unit="kgm²"
              step={0.0001}
            />
            <GearInput
              label="Primary"
              inputValue={engine.gearbox.primary.input}
              outputValue={engine.gearbox.primary.output}
              onInputChange={(v) =>
                setEngine({
                  ...engine,
                  gearbox: { ...engine.gearbox, primary: { ...engine.gearbox.primary, input: v } },
                })
              }
              onOutputChange={(v) =>
                setEngine({
                  ...engine,
                  gearbox: { ...engine.gearbox, primary: { ...engine.gearbox.primary, output: v } },
                })
              }
            />
            {engine.gearbox.gears.slice(0, 6).map((gear, i) => (
              <GearInput
                key={i}
                label={`${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}`}
                inputValue={gear.input}
                outputValue={gear.output}
                onInputChange={(v) => {
                  const newGears = [...engine.gearbox.gears];
                  newGears[i] = { ...newGears[i], input: v };
                  setEngine({ ...engine, gearbox: { ...engine.gearbox, gears: newGears } });
                }}
                onOutputChange={(v) => {
                  const newGears = [...engine.gearbox.gears];
                  newGears[i] = { ...newGears[i], output: v };
                  setEngine({ ...engine, gearbox: { ...engine.gearbox, gears: newGears } });
                }}
              />
            ))}
          </EngineSection>

          {/* Final Drive */}
          <FinalDriveSection>
            <FieldGroup columns={2}>
              <NumberInput
                label="Front Sprocket"
                value={finalDrive.frontSprocket}
                onChange={(v) => setFinalDrive({ frontSprocket: v })}
                unit="teeth"
              />
              <NumberInput
                label="Rear Sprocket"
                value={finalDrive.rearSprocket}
                onChange={(v) => setFinalDrive({ rearSprocket: v })}
                unit="teeth"
              />
            </FieldGroup>
          </FinalDriveSection>

          {/* Tyre Configuration */}
          <TyreSection>
            <Select
              label=""
              value={tyre.id}
              onChange={(id) => {
                const selected = tyres.find((t) => t.id === id);
                if (selected) setTyre(selected);
              }}
              options={tyreOptions}
              placeholder="Select tyre"
            />
            <FieldGroup columns={2}>
              <NumberInput
                label="Diameter"
                value={tyre.diameter}
                onChange={(v) => setTyre({ ...tyre, diameter: v })}
                unit="mm"
              />
              <NumberInput
                label="Inertia"
                value={tyre.inertia}
                onChange={(v) => setTyre({ ...tyre, inertia: v })}
                unit="kgm²"
                step={0.001}
              />
            </FieldGroup>
          </TyreSection>

          {/* Run Conditions */}
          <RunConditionsSection>
            <FieldGroup columns={2}>
              <NumberInput
                label="Pressure"
                value={runConditions.pressure}
                onChange={(v) => setRunConditions({ pressure: v })}
                unit="mbar"
              />
              <NumberInput
                label="Temperature"
                value={runConditions.temperature}
                onChange={(v) => setRunConditions({ temperature: v })}
                unit="°C"
              />
              <NumberInput
                label="Humidity"
                value={runConditions.humidity}
                onChange={(v) => setRunConditions({ humidity: v })}
                unit="%"
              />
            </FieldGroup>
            <Slider
              label="Track Grip"
              value={runConditions.trackGrip}
              onChange={(v) => setRunConditions({ trackGrip: v })}
              min={0}
              max={1}
              step={0.1}
            />
          </RunConditionsSection>

          {/* Results Options */}
          <ResultsOptionsSection>
            <FieldGroup columns={2}>
              <NumberInput
                label="Min RPM"
                value={minRpm}
                onChange={setMinRpm}
                step={100}
              />
              <NumberInput
                label="Max RPM"
                value={maxRpm}
                onChange={setMaxRpm}
                step={100}
              />
            </FieldGroup>
            <Slider
              label="Filtering"
              value={filterLevel}
              onChange={setFilterLevel}
              min={0}
              max={100}
            />
          </ResultsOptionsSection>
        </Sidebar>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-slate-900 p-6">
          {activeView === 'input' ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Data Acquisition Section */}
              <div className="card">
                <h2 className="section-title text-cyan-500">
                  <Laptop size={20} />
                  DATA ACQUISITION
                </h2>
                <FileImport />
              </div>

              {/* Channel Mapping */}
              {headers.length > 0 && (
                <div className="card">
                  <h2 className="section-title text-cyan-500">
                    <Settings size={20} />
                    CHANNEL MAPPING
                  </h2>
                  <ChannelMapping />
                </div>
              )}

              {/* Lap Selection */}
              <div className={`card ${!rawData ? 'opacity-50' : ''}`}>
                <h2 className="section-title text-cyan-500">
                  <Flag size={20} />
                  LAP SELECTION
                </h2>
                {rawData ? (
                  <LapSelector />
                ) : (
                  <p className="text-slate-500 text-sm text-center py-4">
                    Import a CSV file to select laps for analysis
                  </p>
                )}
              </div>

              {/* Analysis Error */}
              {analysisError && (
                <div className="card border border-red-500/50 bg-red-500/10">
                  <div className="flex items-center gap-2 text-red-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Analysis Error</span>
                  </div>
                  <p className="mt-2 text-slate-300 text-sm">{analysisError}</p>
                </div>
              )}

              {/* Quick Start Guide */}
              <div className="card bg-slate-800/50">
                <h3 className="text-lg font-semibold text-slate-300 mb-3">Quick Start</h3>
                <ol className="list-decimal list-inside space-y-2 text-slate-400 text-sm">
                  <li>Select your kart category from the dropdown</li>
                  <li>Select your engine and verify gear ratios</li>
                  <li>Enter front/rear sprocket teeth count</li>
                  <li>Select your rear tyre type</li>
                  <li>Import your telemetry CSV file</li>
                  <li>Select the laps you want to analyze (5-6 best laps recommended)</li>
                  <li>Click START to calculate power curves</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-6">
              {results ? (
                <>
                  {/* Results Summary */}
                  <ResultsSummary
                    statistics={results.statistics}
                    configInfo={results.config}
                    timestamp={results.timestamp}
                  />

                  {/* Power Curve Chart */}
                  <div className="card">
                    <h2 className="section-title">
                      <BarChart3 size={20} />
                      POWER & TORQUE CURVE
                    </h2>
                    <PowerCurve
                      data={results.binnedResults}
                      comparison={comparisonResults?.binnedResults}
                    />
                  </div>

                  {/* Data table */}
                  <div className="card">
                    <h2 className="section-title">
                      <BarChart3 size={20} />
                      DATA TABLE
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-700">
                            <th className="text-left p-2">RPM</th>
                            <th className="text-right p-2">Power (CV)</th>
                            <th className="text-right p-2">Torque (N·m)</th>
                            <th className="text-right p-2">Speed (km/h)</th>
                            <th className="text-right p-2">Samples</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.binnedResults.map((row, i) => (
                            <tr
                              key={i}
                              className="border-b border-slate-800 hover:bg-slate-800/50"
                            >
                              <td className="p-2 text-slate-300">{row.rpm}</td>
                              <td className="p-2 text-right text-red-400">{row.avgPower.toFixed(2)}</td>
                              <td className="p-2 text-right text-blue-400">{row.avgTorque.toFixed(2)}</td>
                              <td className="p-2 text-right text-slate-400">{row.avgSpeed.toFixed(1)}</td>
                              <td className="p-2 text-right text-slate-500">{row.sampleCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </>
              ) : (
                <div className="card">
                  <div className="text-center py-12 text-slate-500">
                    <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No results yet. Run an analysis to see power curves.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
