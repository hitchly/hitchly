import { vi } from "vitest";

/**
 * Creates a mock database instance with proper Drizzle ORM chaining
 */
export const createMockDb = () => {
  const mockDb: any = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  // Setup select chain: select().from().where().orderBy()
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn(),
        limit: vi.fn(),
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn(),
            limit: vi.fn(),
          }),
        }),
      }),
      limit: vi.fn(),
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn(),
          limit: vi.fn(),
        }),
      }),
    }),
  });

  // Setup insert chain: insert().values().returning()
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn(),
      onConflictDoUpdate: vi.fn(),
    }),
  });

  // Setup update chain: update().set().where().returning()
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn(),
      }),
    }),
  });

  // Setup delete chain: delete().where()
  mockDb.delete.mockReturnValue({
    where: vi.fn(),
  });

  return mockDb;
};
