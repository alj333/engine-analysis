import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUserId } from "./users";

// Validators for session creation
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

/**
 * List all sessions for the current user
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);

    return await ctx.db
      .query("sessions")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

/**
 * Get a single session by ID (with authorization check)
 */
export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const session = await ctx.db.get(args.sessionId);

    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    return session;
  },
});

/**
 * Get session with full data (binned results, telemetry)
 */
export const getWithData = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const session = await ctx.db.get(args.sessionId);

    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    const sessionData = await ctx.db
      .query("sessionData")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    return {
      ...session,
      data: sessionData,
    };
  },
});

/**
 * Create a new analysis session with results
 */
export const create = mutation({
  args: {
    name: v.string(),
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
    sourceFileName: v.string(),
    selectedLaps: v.array(v.number()),
    channelMapping: channelMapping,
    filterLevel: v.number(),
    minRpm: v.number(),
    maxRpm: v.number(),
    // Results data
    statistics: analysisStatistics,
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const now = Date.now();

    // Create session metadata
    const sessionId = await ctx.db.insert("sessions", {
      userId,
      name: args.name,
      createdAt: now,
      updatedAt: now,
      kartId: args.kartId,
      kartCustom: args.kartCustom,
      engineId: args.engineId,
      engineCustom: args.engineCustom,
      tyreId: args.tyreId,
      tyreCustom: args.tyreCustom,
      finalDrive: args.finalDrive,
      runConditions: args.runConditions,
      sourceFileName: args.sourceFileName,
      selectedLaps: args.selectedLaps,
      channelMapping: args.channelMapping,
      filterLevel: args.filterLevel,
      minRpm: args.minRpm,
      maxRpm: args.maxRpm,
      statistics: args.statistics,
    });

    // Create session data (separate for performance)
    await ctx.db.insert("sessionData", {
      sessionId,
      binnedResults: args.binnedResults,
      lapTelemetry: args.lapTelemetry,
      rawDataPoints: args.rawDataPoints,
      timestamp: args.timestamp,
      config: args.config,
    });

    return sessionId;
  },
});

/**
 * Update session name
 */
export const rename = mutation({
  args: {
    sessionId: v.id("sessions"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const session = await ctx.db.get(args.sessionId);

    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.sessionId, {
      name: args.name,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a session and its data
 */
export const remove = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const session = await ctx.db.get(args.sessionId);

    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    // Delete session data first
    const sessionData = await ctx.db
      .query("sessionData")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const data of sessionData) {
      await ctx.db.delete(data._id);
    }

    // Delete session
    await ctx.db.delete(args.sessionId);
  },
});
