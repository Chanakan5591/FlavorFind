import type { Prisma } from '@prisma/client';

// Derived type for the Prisma model
export type CanteenWithStores = Prisma.canteensGetPayload<{
  include: { stores: true };
}>;