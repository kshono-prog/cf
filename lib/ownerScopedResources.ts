import { toAddressOrNull } from "@/lib/api/guards";
import { prisma } from "@/lib/prisma";

type OwnerLookupResult = {
  found: boolean;
  ownerAddress: string | null;
};

function toOwnerLookupResult(ownerAddress: unknown): OwnerLookupResult {
  return {
    found: true,
    ownerAddress: toAddressOrNull(ownerAddress),
  };
}

export async function resolveProjectOwnerAddress(
  projectId: bigint
): Promise<OwnerLookupResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerAddress: true },
  });

  if (!project) {
    return { found: false, ownerAddress: null };
  }

  return toOwnerLookupResult(project.ownerAddress);
}

export async function resolvePurposeOwnerAddress(
  purposeId: bigint
): Promise<OwnerLookupResult> {
  const purpose = await prisma.purpose.findUnique({
    where: { id: purposeId },
    select: {
      project: {
        select: { ownerAddress: true },
      },
    },
  });

  if (!purpose) {
    return { found: false, ownerAddress: null };
  }

  return toOwnerLookupResult(purpose.project?.ownerAddress);
}

export async function resolveAllocationOwnerAddress(
  allocationId: bigint
): Promise<OwnerLookupResult> {
  const allocation = await prisma.allocation.findUnique({
    where: { id: allocationId },
    select: {
      Purpose: {
        select: {
          project: {
            select: { ownerAddress: true },
          },
        },
      },
    },
  });

  if (!allocation) {
    return { found: false, ownerAddress: null };
  }

  return toOwnerLookupResult(allocation.Purpose?.project?.ownerAddress);
}

export async function resolveCreatorOwnerAddressByUsername(
  username: string
): Promise<OwnerLookupResult> {
  const creator = await prisma.creatorProfile.findUnique({
    where: { username },
    select: { walletAddress: true },
  });

  if (!creator) {
    return { found: false, ownerAddress: null };
  }

  return toOwnerLookupResult(creator.walletAddress);
}
