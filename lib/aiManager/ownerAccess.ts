import { prisma } from "@/lib/prisma";

export async function findCreatorByOwnerAddress(address: string) {
  return prisma.creatorProfile.findUnique({
    where: {
      walletAddress: address.toLowerCase(),
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      walletAddress: true,
    },
  });
}
