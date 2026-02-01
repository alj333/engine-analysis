import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUserId } from "./users";

// Validators for sensor session types
const calibrationData = v.object({
  gravityVector: v.array(v.number()),
  forwardVector: v.array(v.number()),
  rightVector: v.array(v.number()),
  upVector: v.array(v.number()),
  rotationMatrix: v.array(v.array(v.number())),
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

/**
 * List all sensor sessions for the current user
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);

    return await ctx.db
      .query("sensorSessions")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

/**
 * Get a single sensor session by ID
 */
export const get = query({
  args: { sessionId: v.id("sensorSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const session = await ctx.db.get(args.sessionId);

    if (!session || session.userId !== userId) {
      throw new Error("Sensor session not found");
    }

    return session;
  },
});

/**
 * Get sensor session with raw samples (if stored)
 */
export const getWithSamples = query({
  args: { sessionId: v.id("sensorSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const session = await ctx.db.get(args.sessionId);

    if (!session || session.userId !== userId) {
      throw new Error("Sensor session not found");
    }

    if (!session.hasRawSamples) {
      return { ...session, samples: [] };
    }

    // Fetch all sample chunks in order
    const chunks = await ctx.db
      .query("sensorSamples")
      .withIndex("by_session_chunk", (q) => q.eq("sensorSessionId", args.sessionId))
      .order("asc")
      .collect();

    // Flatten samples from all chunks
    const samples = chunks.flatMap((chunk) => chunk.samples);

    return { ...session, samples };
  },
});

/**
 * Create a new sensor session
 */
export const create = mutation({
  args: {
    name: v.string(),
    kartWeight: v.number(),
    recordingDuration: v.number(),
    calibration: calibrationData,
    speedPowerCurve: v.array(speedPowerPoint),
    statistics: sensorSessionStatistics,
    storeRawSamples: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const now = Date.now();

    const sessionId = await ctx.db.insert("sensorSessions", {
      userId,
      name: args.name,
      createdAt: now,
      updatedAt: now,
      kartWeight: args.kartWeight,
      recordingDuration: args.recordingDuration,
      calibration: args.calibration,
      speedPowerCurve: args.speedPowerCurve,
      statistics: args.statistics,
      hasRawSamples: args.storeRawSamples,
    });

    return sessionId;
  },
});

/**
 * Update sensor session name
 */
export const rename = mutation({
  args: {
    sessionId: v.id("sensorSessions"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const session = await ctx.db.get(args.sessionId);

    if (!session || session.userId !== userId) {
      throw new Error("Sensor session not found");
    }

    await ctx.db.patch(args.sessionId, {
      name: args.name,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a sensor session and its samples
 */
export const remove = mutation({
  args: { sessionId: v.id("sensorSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const session = await ctx.db.get(args.sessionId);

    if (!session || session.userId !== userId) {
      throw new Error("Sensor session not found");
    }

    // Delete sample chunks first
    const chunks = await ctx.db
      .query("sensorSamples")
      .withIndex("by_session_chunk", (q) => q.eq("sensorSessionId", args.sessionId))
      .collect();

    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    // Delete session
    await ctx.db.delete(args.sessionId);
  },
});

/**
 * Delete raw samples to save storage (keep processed curve)
 */
export const deleteRawSamples = mutation({
  args: { sessionId: v.id("sensorSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const session = await ctx.db.get(args.sessionId);

    if (!session || session.userId !== userId) {
      throw new Error("Sensor session not found");
    }

    // Delete sample chunks
    const chunks = await ctx.db
      .query("sensorSamples")
      .withIndex("by_session_chunk", (q) => q.eq("sensorSessionId", args.sessionId))
      .collect();

    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    // Update flag
    await ctx.db.patch(args.sessionId, {
      hasRawSamples: false,
      updatedAt: Date.now(),
    });
  },
});
