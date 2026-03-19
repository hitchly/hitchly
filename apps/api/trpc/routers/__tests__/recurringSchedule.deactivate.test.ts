import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { createMockContext } from "../../../lib/tests/mockContext";
import { createMockDb } from "../../../lib/tests/mockDb";
import { recurringScheduleRouter } from "../recurringSchedule";

interface MockDb {
  select: Mock;
  update: Mock;
}

describe("recurringScheduleRouter delete (deactivate)", () => {
  let mockDb: MockDb;

  beforeEach(() => {
    mockDb = createMockDb() as unknown as MockDb;
    vi.clearAllMocks();
  });

  it("sets isActive to false instead of deleting (test-recurring-deactivate-1)", async () => {
    const userId = "driver-123";
    const scheduleId = "sched-1";
    const existing = {
      id: scheduleId,
      userId,
      isActive: true,
    };

    // First select: find existing schedule
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValueOnce([existing]),
      }),
    });

    const updateSpy = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValueOnce([{ ...existing, isActive: false }]),
    });

    mockDb.update.mockReturnValueOnce({
      set: updateSpy,
    });

    const caller = recurringScheduleRouter.createCaller(
      createMockContext(userId, mockDb as unknown)
    );

    const result = await caller.delete({ id: scheduleId });

    expect(updateSpy).toHaveBeenCalledWith({ isActive: false });
    expect(result).toEqual({ success: true });
  });
});
