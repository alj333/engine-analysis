import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Get or create user from Clerk authentication
 * Called automatically when user signs in
 */
export const ensureUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      // Update email/name if changed
      if (existingUser.email !== args.email || existingUser.name !== args.name) {
        await ctx.db.patch(existingUser._id, {
          email: args.email,
          name: args.name,
        });
      }
      return existingUser._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      createdAt: Date.now(),
    });

    return userId;
  },
});

/**
 * Get current user by Clerk ID
 */
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

/**
 * Get current user (for authenticated requests)
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

/**
 * Helper to get authenticated user ID (for use in other mutations/queries)
 */
export async function getAuthenticatedUserId(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    throw new Error("User not found");
  }

  return user._id;
}

/**
 * Delete user account and all associated data
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);

    // Delete all user data in order (respecting foreign keys)

    // 1. Delete sensor samples (via sensor sessions)
    const sensorSessions = await ctx.db
      .query("sensorSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const session of sensorSessions) {
      const samples = await ctx.db
        .query("sensorSamples")
        .withIndex("by_session_chunk", (q) => q.eq("sensorSessionId", session._id))
        .collect();
      for (const sample of samples) {
        await ctx.db.delete(sample._id);
      }
      await ctx.db.delete(session._id);
    }

    // 2. Delete session data and sessions
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const session of sessions) {
      const sessionData = await ctx.db
        .query("sessionData")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const data of sessionData) {
        await ctx.db.delete(data._id);
      }
      await ctx.db.delete(session._id);
    }

    // 3. Delete custom configs
    const customKarts = await ctx.db
      .query("customKarts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const kart of customKarts) {
      await ctx.db.delete(kart._id);
    }

    const customEngines = await ctx.db
      .query("customEngines")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const engine of customEngines) {
      await ctx.db.delete(engine._id);
    }

    const customTyres = await ctx.db
      .query("customTyres")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const tyre of customTyres) {
      await ctx.db.delete(tyre._id);
    }

    // 4. Delete user
    await ctx.db.delete(userId);
  },
});
