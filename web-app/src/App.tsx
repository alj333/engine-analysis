import { useState } from 'react';
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
import { useConfigStore } from '@/stores/configStore';
import { useAcquisitionStore } from '@/stores/acquisitionStore';
import { useResultsStore } from '@/stores/resultsStore';
import { useLoadConfigs } from '@/hooks/useLoadConfigs';
import { Laptop, BarChart3, Loader2 } from 'lucide-react';

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
  const { filterLevel, minRpm, maxRpm, setFilterLevel, setMinRpm, setMaxRpm } =
    useAcquisitionStore();

  // Results store
  const { results, comparisonResults, isAnalyzing } = useResultsStore();

  // Handlers
  const handleStart = () => {
    console.log('Starting analysis...');
    // Will be implemented in Phase 4
  };

  const handleOutput = () => setActiveView('output');
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
        onSave={handleSave}
        onOpen={handleOpen}
        onPrint={handlePrint}
        onLoadFile1={handleLoadFile1}
        onLoadFile2={handleLoadFile2}
        onCompare={handleCompare}
        isAnalyzing={isAnalyzing}
        hasResults={!!results}
        hasComparison={!!comparisonResults}
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

              {/* Lap Selection will go here (Phase 3) */}
              <div className="card opacity-50">
                <h2 className="section-title text-cyan-500">LAP SELECTION</h2>
                <p className="text-slate-500 text-sm">
                  Import a CSV file to select laps for analysis
                </p>
              </div>

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
              {/* Results View */}
              <div className="card">
                <h2 className="section-title">
                  <BarChart3 size={20} />
                  RESULTS
                </h2>
                {results ? (
                  <div className="text-slate-400">
                    {/* Charts will be implemented in Phase 5 */}
                    <p>Power curve and results will be displayed here</p>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No results yet. Run an analysis to see power curves.</p>
                    <button
                      onClick={() => setActiveView('input')}
                      className="btn btn-outline mt-4"
                    >
                      Go to Input
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
