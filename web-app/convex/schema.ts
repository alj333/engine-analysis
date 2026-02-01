import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Reusable validators for complex types
const gearPair = v.object({
  input: v.number(),
  output: v.number(),
});

const gearbox = v.object({
  primary: gearPair,
  gears: v.array(gearPair),
});

const finalDrive = v.object({
  frontSprocket: v.number(),
  rearSprocket: v.number(),
});

const runConditions = v.object({
  pressure: v.number(),
  temperature: v.number(),
  humidity: v.number(),
  trackGrip: v.number(),
});

const channelMapping = v.record(
  v.string(),
  v.object({
    header: v.union(v.string(), v.null()),
    status: v.union(v.literal("matched"), v.literal("unmatched"), v.literal("manual")),
    multiplier: v.optional(v.number()),
  })
);

// Analysis results types
const binnedResult = v.object({
  rpm: v.number(),
  avgSpeed: v.number(),
  avgPower: v.number(),
  avgTorque: v.number(),
  avgTempHead: v.number(),
  avgTempCool: v.number(),
  avgTempExhaust: v.number(),
  avgLambda: v.number(),
  sampleCount: v.number(),
});

const lapTelemetryResult = v.object({
  lapIndex: v.number(),
  lapTime: v.number(),
  time: v.array(v.number()),
  speed: v.array(v.number()),
  rpm: v.array(v.number()),
  lonAcc: v.array(v.number()),
  latAcc: v.array(v.number()),
  throttle: v.array(v.number()),
  power: v.array(v.number()),
  gear: v.array(v.number()),
  tempHead: v.array(v.number()),
  tempCool: v.array(v.number()),
  tempExhaust: v.array(v.number()),
});

const analysisStatistics = v.object({
  peakPower: v.object({
    rpm: v.number(),
    power: v.number(),
  }),
  peakTorque: v.object({
    rpm: v.number(),
    torque: v.number(),
  }),
  avgPower: v.number(),
  avgTorque: v.number(),
  rpmRange: v.object({
    min: v.number(),
    max: v.number(),
  }),
  totalSamples: v.number(),
});

// Sensor types
const calibrationData = v.object({
  gravityVector: v.array(v.number()), // [x, y, z]
  forwardVector: v.array(v.number()),
  rightVector: v.array(v.number()),
  upVector: v.array(v.number()),
  rotationMatrix: v.array(v.array(v.number())), // 3x3 matrix
  qualityScore: v.number(),
  calibratedAt: v.number(),
});

const speedPowerPoint = v.object({
  speedKmh: v.number(),
  speedMs: v.number(),
  avgPower: v.number(),
  avgPowerWatts: v.number(),
  avgForwardAccel: v.number(),
  sampleCount: v.number(),
});

const sensorSessionStatistics = v.object({
  peakPower: v.number(),
  peakPowerSpeed: v.number(),
  maxSpeed: v.number(),
  maxAcceleration: v.number(),
  maxDeceleration: v.number(),
  totalSamples: v.number(),
  validSpeedSamples: v.number(),
});

const sensorSample = v.object({
  timestamp: v.number(),
  accelX: v.number(),
  accelY: v.number(),
  accelZ: v.number(),
  gpsSpeed: v.union(v.number(), v.null()),
  gpsAccuracy: v.union(v.number(), v.null()),
  latitude: v.union(v.number(), v.null()),
  longitude: v.union(v.number(), v.null()),
});

export default defineSchema({
  // User accounts (linked to Clerk)
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  // Analysis sessions (CSV import results)
  // Metadata stored here, full results in sessionData
  sessions: defineTable({
    userId: v.id("users"),
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),

    // Configuration references
    kartId: v.string(),
    kartCustom: v.optional(v.object({
      name: v.optional(v.string()),
      weight: v.optional(v.number()),
      frontalArea: v.optional(v.number()),
      dragCoefficient: v.optional(v.number()),
    })),
    engineId: v.string(),
    engineCustom: v.optional(v.object({
      name: v.optional(v.string()),
      category: v.optional(v.string()),
      inertia: v.optional(v.number()),
      gearbox: v.optional(gearbox),
    })),
    tyreId: v.string(),
    tyreCustom: v.optional(v.object({
      name: v.optional(v.string()),
      diameter: v.optional(v.number()),
      inertia: v.optional(v.number()),
      rollingCoeff1: v.optional(v.number()),
      rollingCoeff2: v.optional(v.number()),
      rimType: v.optional(v.union(v.literal("aluminum"), v.literal("magnesium"))),
    })),
    finalDrive: finalDrive,
    runConditions: runConditions,

    // Source data info
    sourceFileName: v.string(),
    selectedLaps: v.array(v.number()),
    channelMapping: channelMapping,
    filterLevel: v.number(),
    minRpm: v.number(),
    maxRpm: v.number(),

    // Summary statistics (for list display without loading full data)
    statistics: analysisStatistics,
  })
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_user", ["userId"]),

  // Session data (large binned results stored separately)
  sessionData: defineTable({
    sessionId: v.id("sessions"),
    binnedResults: v.array(binnedResult),
    lapTelemetry: v.optional(v.array(lapTelemetryResult)),
    rawDataPoints: v.number(),
    timestamp: v.string(),
    config: v.object({
      kartName: v.string(),
      engineName: v.string(),
      tyreName: v.string(),
      finalRatio: v.number(),
      selectedLaps: v.array(v.number()),
    }),
  }).index("by_session", ["sessionId"]),

  // Sensor recording sessions
  sensorSessions: defineTable({
    userId: v.id("users"),
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),

    // Recording parameters
    kartWeight: v.number(),
    recordingDuration: v.number(),

    // Calibration data
    calibration: calibrationData,

    // Processed results (always stored)
    speedPowerCurve: v.array(speedPowerPoint),
    statistics: sensorSessionStatistics,

    // Whether raw samples are stored (optional - storage cost)
    hasRawSamples: v.boolean(),
  })
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_user", ["userId"]),

  // Raw sensor samples (chunked for 1MB doc limit)
  // Each chunk contains ~1000 samples
  sensorSamples: defineTable({
    sensorSessionId: v.id("sensorSessions"),
    chunkIndex: v.number(),
    samples: v.array(sensorSample),
  }).index("by_session_chunk", ["sensorSessionId", "chunkIndex"]),

  // Custom kart configurations
  customKarts: defineTable({
    userId: v.id("users"),
    name: v.string(),
    weight: v.number(),
    frontalArea: v.number(),
    dragCoefficient: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_name", ["userId", "name"]),

  // Custom engine configurations
  customEngines: defineTable({
    userId: v.id("users"),
    name: v.string(),
    category: v.string(),
    inertia: v.number(),
    gearbox: gearbox,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_name", ["userId", "name"]),

  // Custom tyre configurations
  customTyres: defineTable({
    userId: v.id("users"),
    name: v.string(),
    diameter: v.number(),
    inertia: v.number(),
    rollingCoeff1: v.number(),
    rollingCoeff2: v.number(),
    rimType: v.union(v.literal("aluminum"), v.literal("magnesium")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_name", ["userId", "name"]),
});
