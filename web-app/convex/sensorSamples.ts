import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUserId } from "./users";

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

const CHUNK_SIZE = 1000; // Samples per chunk (keeps docs under 1MB)

/**
 * Upload a chunk of sensor samples
 * Call this multiple times for large recordings
 */
export const uploadChunk = mutation({
  args: {
    sensorSessionId: v.id("sensorSessions"),
    chunkIndex: v.number(),
    samples: v.array(sensorSample),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);

    // Verify session ownership
    const session = await ctx.db.get(args.sensorSessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Sensor session not found");
    }

    // Check if chunk already exists (for idempotent uploads)
    const existingChunk = await ctx.db
      .query("sensorSamples")
      .withIndex("by_session_chunk", (q) =>
        q.eq("sensorSessionId", args.sensorSessionId).eq("chunkIndex", args.chunkIndex)
      )
      .first();

    if (existingChunk) {
      // Replace existing chunk (for retry scenarios)
      await ctx.db.patch(existingChunk._id, {
        samples: args.samples,
      });
      return existingChunk._id;
    }

    // Insert new chunk
    return await ctx.db.insert("sensorSamples", {
      sensorSessionId: args.sensorSessionId,
      chunkIndex: args.chunkIndex,
      samples: args.samples,
    });
  },
});

/**
 * Get a specific chunk of samples
 */
export const getChunk = query({
  args: {
    sensorSessionId: v.id("sensorSessions"),
    chunkIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);

    // Verify session ownership
    const session = await ctx.db.get(args.sensorSessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Sensor session not found");
    }

    return await ctx.db
      .query("sensorSamples")
      .withIndex("by_session_chunk", (q) =>
        q.eq("sensorSessionId", args.sensorSessionId).eq("chunkIndex", args.chunkIndex)
      )
      .first();
  },
});

/**
 * Get total number of chunks for a session
 */
export const getChunkCount = query({
  args: { sensorSessionId: v.id("sensorSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);

    // Verify session ownership
    const session = await ctx.db.get(args.sensorSessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Sensor session not found");
    }

    const chunks = await ctx.db
      .query("sensorSamples")
      .withIndex("by_session_chunk", (q) => q.eq("sensorSessionId", args.sensorSessionId))
      .collect();

    return chunks.length;
  },
});

/**
 * Upload all samples for a sensor session (chunks automatically)
 * Use this for client-side convenience
 */
export const uploadAllSamples = mutation({
  args: {
    sensorSessionId: v.id("sensorSessions"),
    samples: v.array(sensorSample),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);

    // Verify session ownership
    const session = await ctx.db.get(args.sensorSessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Sensor session not found");
    }

    // Delete any existing chunks
    const existingChunks = await ctx.db
      .query("sensorSamples")
      .withIndex("by_session_chunk", (q) => q.eq("sensorSessionId", args.sensorSessionId))
      .collect();

    for (const chunk of existingChunks) {
      await ctx.db.delete(chunk._id);
    }

    // Chunk and upload
    const totalChunks = Math.ceil(args.samples.length / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, args.samples.length);
      const chunkSamples = args.samples.slice(start, end);

      await ctx.db.insert("sensorSamples", {
        sensorSessionId: args.sensorSessionId,
        chunkIndex: i,
        samples: chunkSamples,
      });
    }

    // Update session to indicate samples are stored
    await ctx.db.patch(args.sensorSessionId, {
      hasRawSamples: true,
      updatedAt: Date.now(),
    });

    return totalChunks;
  },
});

// Re-export chunk size for client use
export { CHUNK_SIZE };
