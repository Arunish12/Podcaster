import { ConvexError, v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

export const getUserById = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), args.clerkId))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    return user;
  },
});

export const getTopUserByPodcastCount = query({
  args: {},
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();

    const userData = await Promise.all(
      users.map(async (u) => {
        const podcasts = await ctx.db
          .query("podcasts")
          .filter((q) => q.eq(q.field("authorId"), u.clerkId))
          .collect();

        const sortedPodcasts = podcasts.sort((a, b) => b.views - a.views);

        return {
          ...u,
          totalPodcasts: podcasts.length,
          podcast: sortedPodcasts.map((p) => ({
            podcastTitle: p.podcastTitle,
            podcastId: p._id,
          })),
        };
      })
    );

    return userData.sort((a, b) => b.totalPodcasts - a.totalPodcasts);
  },
});

export const createUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    imageUrl: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      imageUrl: args.imageUrl,
      name: args.name,
    });
  },
});

export const updateUser = internalMutation({
  args: {
    clerkId: v.string(),
    imageUrl: v.string(),
    email: v.string(),
    name: v.string(),
  },
  async handler(ctx, args) {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), args.clerkId))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Update the user record
    await ctx.db.patch(user._id, {
      imageUrl: args.imageUrl,
      email: args.email,
      name: args.name,
    });

    // Fetch and update all podcasts linked to the user
    const podcasts = await ctx.db
      .query("podcasts")
      .filter((q) => q.eq(q.field("authorId"), args.clerkId))
      .collect();

    await Promise.all(
      podcasts.map(async (p) => {
        await ctx.db.patch(p._id, {
          authorImageUrl: args.imageUrl,
          author: args.name, // Ensure podcast author name is updated
        });
      })
    );
  },
});

export const deleteUser = internalMutation({
  args: { clerkId: v.string() },
  async handler(ctx, args) {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), args.clerkId))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    await ctx.db.delete(user._id);
  },
});
