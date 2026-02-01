import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUserId } from "./users";

// Validators
const gearPair = v.object({
  input: v.number(),
  output: v.number(),
});

const gearbox = v.object({
  primary: gearPair,
  gears: v.array(gearPair),
});

// ============== CUSTOM KARTS ==============

/**
 * List all custom karts for the current user
 */
export const listKarts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);

    return await ctx.db
      .query("customKarts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

/**
 * Get a custom kart by ID
 */
export const getKart = query({
  args: { kartId: v.id("customKarts") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const kart = await ctx.db.get(args.kartId);

    if (!kart || kart.userId !== userId) {
      throw new Error("Kart not found");
    }

    return kart;
  },
});

/**
 * Create a custom kart
 */
export const createKart = mutation({
  args: {
    name: v.string(),
    weight: v.number(),
    frontalArea: v.number(),
    dragCoefficient: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const now = Date.now();

    return await ctx.db.insert("customKarts", {
      userId,
      name: args.name,
      weight: args.weight,
      frontalArea: args.frontalArea,
      dragCoefficient: args.dragCoefficient,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a custom kart
 */
export const updateKart = mutation({
  args: {
    kartId: v.id("customKarts"),
    name: v.optional(v.string()),
    weight: v.optional(v.number()),
    frontalArea: v.optional(v.number()),
    dragCoefficient: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const kart = await ctx.db.get(args.kartId);

    if (!kart || kart.userId !== userId) {
      throw new Error("Kart not found");
    }

    const { kartId, ...updates } = args;
    await ctx.db.patch(kartId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a custom kart
 */
export const deleteKart = mutation({
  args: { kartId: v.id("customKarts") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const kart = await ctx.db.get(args.kartId);

    if (!kart || kart.userId !== userId) {
      throw new Error("Kart not found");
    }

    await ctx.db.delete(args.kartId);
  },
});

// ============== CUSTOM ENGINES ==============

/**
 * List all custom engines for the current user
 */
export const listEngines = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);

    return await ctx.db
      .query("customEngines")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

/**
 * Get a custom engine by ID
 */
export const getEngine = query({
  args: { engineId: v.id("customEngines") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const engine = await ctx.db.get(args.engineId);

    if (!engine || engine.userId !== userId) {
      throw new Error("Engine not found");
    }

    return engine;
  },
});

/**
 * Create a custom engine
 */
export const createEngine = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    inertia: v.number(),
    gearbox: gearbox,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const now = Date.now();

    return await ctx.db.insert("customEngines", {
      userId,
      name: args.name,
      category: args.category,
      inertia: args.inertia,
      gearbox: args.gearbox,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a custom engine
 */
export const updateEngine = mutation({
  args: {
    engineId: v.id("customEngines"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    inertia: v.optional(v.number()),
    gearbox: v.optional(gearbox),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const engine = await ctx.db.get(args.engineId);

    if (!engine || engine.userId !== userId) {
      throw new Error("Engine not found");
    }

    const { engineId, ...updates } = args;
    await ctx.db.patch(engineId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a custom engine
 */
export const deleteEngine = mutation({
  args: { engineId: v.id("customEngines") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const engine = await ctx.db.get(args.engineId);

    if (!engine || engine.userId !== userId) {
      throw new Error("Engine not found");
    }

    await ctx.db.delete(args.engineId);
  },
});

// ============== CUSTOM TYRES ==============

/**
 * List all custom tyres for the current user
 */
export const listTyres = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);

    return await ctx.db
      .query("customTyres")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

/**
 * Get a custom tyre by ID
 */
export const getTyre = query({
  args: { tyreId: v.id("customTyres") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const tyre = await ctx.db.get(args.tyreId);

    if (!tyre || tyre.userId !== userId) {
      throw new Error("Tyre not found");
    }

    return tyre;
  },
});

/**
 * Create a custom tyre
 */
export const createTyre = mutation({
  args: {
    name: v.string(),
    diameter: v.number(),
    inertia: v.number(),
    rollingCoeff1: v.number(),
    rollingCoeff2: v.number(),
    rimType: v.union(v.literal("aluminum"), v.literal("magnesium")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const now = Date.now();

    return await ctx.db.insert("customTyres", {
      userId,
      name: args.name,
      diameter: args.diameter,
      inertia: args.inertia,
      rollingCoeff1: args.rollingCoeff1,
      rollingCoeff2: args.rollingCoeff2,
      rimType: args.rimType,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a custom tyre
 */
export const updateTyre = mutation({
  args: {
    tyreId: v.id("customTyres"),
    name: v.optional(v.string()),
    diameter: v.optional(v.number()),
    inertia: v.optional(v.number()),
    rollingCoeff1: v.optional(v.number()),
    rollingCoeff2: v.optional(v.number()),
    rimType: v.optional(v.union(v.literal("aluminum"), v.literal("magnesium"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const tyre = await ctx.db.get(args.tyreId);

    if (!tyre || tyre.userId !== userId) {
      throw new Error("Tyre not found");
    }

    const { tyreId, ...updates } = args;
    await ctx.db.patch(tyreId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a custom tyre
 */
export const deleteTyre = mutation({
  args: { tyreId: v.id("customTyres") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const tyre = await ctx.db.get(args.tyreId);

    if (!tyre || tyre.userId !== userId) {
      throw new Error("Tyre not found");
    }

    await ctx.db.delete(args.tyreId);
  },
});

// ============== BULK OPERATIONS ==============

/**
 * Get all custom configs for the current user
 * Useful for initial load
 */
export const getAllCustomConfigs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);

    const [karts, engines, tyres] = await Promise.all([
      ctx.db.query("customKarts").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("customEngines").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("customTyres").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    ]);

    return { karts, engines, tyres };
  },
});
