const fs = require('fs');
const path = require('path');

// Read the original esempio.csv as the base (real telemetry data)
const basePath = path.join(__dirname, '../public/samples/esempio.csv');
const baseContent = fs.readFileSync(basePath, 'utf-8');
const lines = baseContent.split('\n');

// Find where data starts (after headers)
let dataStartIndex = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].match(/^\d+\.\d+,/)) {
    dataStartIndex = i;
    break;
  }
}

// Parse header and data
const headerLines = lines.slice(0, dataStartIndex);
const dataLines = lines.slice(dataStartIndex).filter(line => line.trim());

// Parse data into arrays
const data = dataLines.map(line => {
  const parts = line.split(',');
  return {
    time: parseFloat(parts[0]),
    distance: parseFloat(parts[1]),
    rpm: parseFloat(parts[2]),
    speed: parseFloat(parts[3]),
    latAcc: parseFloat(parts[4]),
    lonAcc: parseFloat(parts[5])
  };
});

// Get RPM and speed ranges from original data
const rpmValues = data.map(d => d.rpm).filter(r => !isNaN(r));
const speedValues = data.map(d => d.speed).filter(s => !isNaN(s));
const origMinRpm = Math.min(...rpmValues);
const origMaxRpm = Math.max(...rpmValues);
const origMinSpeed = Math.min(...speedValues);
const origMaxSpeed = Math.max(...speedValues);

console.log('Original data ranges:');
console.log('  RPM:', origMinRpm.toFixed(0), '-', origMaxRpm.toFixed(0));
console.log('  Speed:', origMinSpeed.toFixed(1), '-', origMaxSpeed.toFixed(1), 'km/h');

function generateScaledSample(config) {
  const {
    outputName,
    venue,
    vehicle,
    user,
    comment,
    date,
    targetMinRpm,
    targetMaxRpm,
    targetMinSpeed,
    targetMaxSpeed,
    accScale
  } = config;

  // Calculate scaling factors
  const rpmScale = (targetMaxRpm - targetMinRpm) / (origMaxRpm - origMinRpm);
  const rpmOffset = targetMinRpm - origMinRpm * rpmScale;
  const speedScale = (targetMaxSpeed - targetMinSpeed) / (origMaxSpeed - origMinSpeed);
  const speedOffset = targetMinSpeed - origMinSpeed * speedScale;

  // Create new header
  const newHeader = [
    '"Format","AIM CSV File"',
    '"Venue","' + venue + '"',
    '"Vehicle","' + vehicle + '"',
    '"User","' + user + '"',
    '"Data Source","AIM Data Logger"',
    '"Comment","' + comment + '"',
    '"Date","' + date + '"',
    '"Time","10:00:00"',
    '"Sample Rate","10"',
  ];

  // Copy duration and segment info from original (adjusted)
  for (const line of headerLines) {
    if (line.startsWith('"Duration"') ||
        line.startsWith('"Segment"') ||
        line.startsWith('"Beacon Markers"') ||
        line.startsWith('"Segment Times"')) {
      newHeader.push(line);
    }
  }

  newHeader.push('');
  newHeader.push('"Time","Distance","RPM","GPS_Speed","GPS_LatAcc","GPS_LonAcc",');
  newHeader.push('"Time","Distance","RPM","GPS_Speed","GPS_LatAcc","GPS_LonAcc",');
  newHeader.push('"sec","km","rpm","km/h","g","g",');
  newHeader.push('"","","1","2","3","4",');
  newHeader.push('');

  // Scale the data
  const newDataLines = data.map(d => {
    const newRpm = d.rpm * rpmScale + rpmOffset;
    const newSpeed = d.speed * speedScale + speedOffset;
    const newLonAcc = d.lonAcc * accScale;

    return [
      d.time.toFixed(3),
      d.distance.toFixed(6),
      newRpm.toFixed(3),
      newSpeed.toFixed(3),
      d.latAcc.toFixed(6),
      newLonAcc.toFixed(6)
    ].join(',');
  });

  const output = [...newHeader, ...newDataLines].join('\n');
  const outputPath = path.join(__dirname, '../public/samples/', outputName);
  fs.writeFileSync(outputPath, output);

  console.log('Generated', outputName, '- RPM:', targetMinRpm, '-', targetMaxRpm, ', Speed:', targetMinSpeed, '-', targetMaxSpeed);
}

// X30 Senior - similar to original but slightly adjusted
// Original data is already good for X30 (8000-15000 RPM typical)
generateScaledSample({
  outputName: 'x30_senior.csv',
  venue: 'Adria Karting Raceway',
  vehicle: '42',
  user: 'Driver1',
  comment: 'X30 Senior Practice',
  date: '05/15/24',
  targetMinRpm: 8500,
  targetMaxRpm: 15200,
  targetMinSpeed: 42,
  targetMaxSpeed: 118,
  accScale: 1.0
});

// Rotax Senior - lower RPM range (6500-11500)
generateScaledSample({
  outputName: 'rotax_senior.csv',
  venue: 'South Garda Karting',
  vehicle: '17',
  user: 'Driver2',
  comment: 'Rotax Senior Max Practice',
  date: '06/20/24',
  targetMinRpm: 6800,
  targetMaxRpm: 11600,
  targetMinSpeed: 38,
  targetMaxSpeed: 98,
  accScale: 0.9
});

// KZ Shifter - wider RPM range, higher speeds
generateScaledSample({
  outputName: 'kz_shifter.csv',
  venue: 'Franciacorta Karting Track',
  vehicle: '7',
  user: 'Driver3',
  comment: 'KZ2 Practice - TM KZ10C',
  date: '07/08/24',
  targetMinRpm: 5000,
  targetMaxRpm: 15500,
  targetMinSpeed: 45,
  targetMaxSpeed: 148,
  accScale: 1.3
});

// Mini 60 - higher RPM, lower speeds
generateScaledSample({
  outputName: 'mini_60.csv',
  venue: 'Circuito Internazionale Napoli',
  vehicle: '88',
  user: 'Driver4',
  comment: 'Mini 60 Practice - Iame Miniswift',
  date: '04/12/24',
  targetMinRpm: 11000,
  targetMaxRpm: 16500,
  targetMinSpeed: 32,
  targetMaxSpeed: 72,
  accScale: 0.7
});

console.log('\nAll sample files generated from real telemetry data!');
