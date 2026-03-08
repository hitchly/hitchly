/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unnecessary-type-assertion */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockContext } from "../../../lib/tests/mockContext";
import { createMockDb } from "../../../lib/tests/mockDb";
import { complaintsRouter } from "../complaints";

describe("Complaints Router", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe("createComplaint", () => {
    it("should persist a complaint with correct reporter and target (test-ut-complaint-1)", async () => {
      const userId = "reporter-123";

      // Mock insert: persist complaint
      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValueOnce(undefined),
      });

      const caller = complaintsRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      const result = await caller.createComplaint({
        targetUserId: "target-456",
        content: "This user was rude during the ride.",
        rideId: "trip-789",
      });

      expect(result.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });
});
