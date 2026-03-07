import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoist mocks to be available before module loading
const { mockDbQuery, mockDbSelect, mockDbInsert } = vi.hoisted(() => {
  return {
    mockDbQuery: {
      trips: { findFirst: vi.fn() },
      reviews: { findFirst: vi.fn() },
    },
    mockDbSelect: vi.fn(),
    mockDbInsert: vi.fn(),
  };
});

vi.mock("@hitchly/db/client", () => ({
  db: {
    query: mockDbQuery,
    select: mockDbSelect,
    insert: mockDbInsert,
  },
}));

vi.mock("@hitchly/db/schema", () => ({
  reviews: {
    reviewerId: "reviewerId",
    targetUserId: "targetUserId",
    tripId: "tripId",
    rating: "rating",
  },
  trips: { id: "id", status: "status" },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: unknown[]) => args),
  eq: vi.fn((_col: unknown, val: unknown) => ({ _type: "eq", val })),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

import { reviewsRouter } from "../reviews";

// The reviews router uses `db` directly (not ctx.db), but the context
// still needs userId for the protected procedure auth check.
function createReviewContext(userId?: string) {
  return {
    req: {} as unknown,
    resHeaders: new Headers(),
    db: {
      query: mockDbQuery,
      select: mockDbSelect,
      insert: mockDbInsert,
    },
    userId,
  } as unknown as Parameters<typeof reviewsRouter.createCaller>[0];
}

describe("Reviews Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submitRating", () => {
    it("should persist a valid rating (test-ut-review-1)", async () => {
      const userId = "user-reviewer";

      // Mock trip lookup via db.query.trips.findFirst
      mockDbQuery.trips.findFirst.mockResolvedValueOnce({
        id: "trip-1",
        status: "completed",
      });

      // Mock existing review check (none)
      mockDbQuery.reviews.findFirst.mockResolvedValueOnce(undefined);

      // Mock insert
      mockDbInsert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValueOnce(undefined),
      });

      const caller = reviewsRouter.createCaller(createReviewContext(userId));
      const result = await caller.submitRating({
        tripId: "trip-1",
        targetUserId: "user-target",
        rating: 4,
      });

      expect(result.success).toBe(true);
    });

    it("should reject self-rating (test-ut-review-1)", async () => {
      const userId = "user-same";

      mockDbQuery.trips.findFirst.mockResolvedValueOnce({
        id: "trip-1",
        status: "completed",
      });

      const caller = reviewsRouter.createCaller(createReviewContext(userId));

      await expect(
        caller.submitRating({
          tripId: "trip-1",
          targetUserId: "user-same",
          rating: 5,
        })
      ).rejects.toThrow(/BAD_REQUEST|You cannot rate yourself/);
    });

    it("should reject duplicate ratings (test-ut-review-1)", async () => {
      const userId = "user-reviewer";

      mockDbQuery.trips.findFirst.mockResolvedValueOnce({
        id: "trip-1",
        status: "completed",
      });

      // Found an existing review
      mockDbQuery.reviews.findFirst.mockResolvedValueOnce({
        id: "existing-review",
        reviewerId: userId,
        targetUserId: "user-target",
        tripId: "trip-1",
      });

      const caller = reviewsRouter.createCaller(createReviewContext(userId));

      await expect(
        caller.submitRating({
          tripId: "trip-1",
          targetUserId: "user-target",
          rating: 4,
        })
      ).rejects.toThrow(/CONFLICT|You already rated this user/);
    });
  });

  describe("getUserScore", () => {
    it("should return correct average and count (test-ut-review-2)", async () => {
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([{ average: 4.3333, count: 3 }]),
        }),
      });

      const caller = reviewsRouter.createCaller(
        createReviewContext("user-any")
      );
      const result = await caller.getUserScore({ userId: "user-target" });

      expect(result.average).toBe("4.3");
      expect(result.count).toBe(3);
    });

    it("should return 'New' for users with no reviews (test-ut-review-2)", async () => {
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([{ average: null, count: 0 }]),
        }),
      });

      const caller = reviewsRouter.createCaller(
        createReviewContext("user-any")
      );
      const result = await caller.getUserScore({ userId: "user-new" });

      expect(result.average).toBe("New");
      expect(result.count).toBe(0);
    });
  });
});
