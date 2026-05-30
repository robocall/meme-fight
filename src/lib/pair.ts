import type { Meme } from "@/lib/db/schema";

export function pickPair(allMemes: Meme[]): [Meme, Meme] | null {
  if (allMemes.length < 2) {
    return null;
  }

  const firstIndex = Math.floor(Math.random() * allMemes.length);
  let secondIndex = Math.floor(Math.random() * (allMemes.length - 1));
  if (secondIndex >= firstIndex) {
    secondIndex += 1;
  }

  return [allMemes[firstIndex], allMemes[secondIndex]];
}
