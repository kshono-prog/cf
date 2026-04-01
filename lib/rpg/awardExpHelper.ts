// lib/rpg/awardExpHelper.ts
import { awardExp, type ExpEventInput } from "./expService";

export function awardExpFireAndForget(input: ExpEventInput): void {
  awardExp(input).catch((err) => {
    console.warn("[RPG] awardExp failed (non-fatal)", input.eventType, err);
  });
}
