"use client";

import { useCallback, useEffect, useState } from "react";

import { MemeCard } from "@/components/MemeCard";
import type { Meme } from "@/lib/db/schema";

type PairResponse = {
  memeA: Meme;
  memeB: Meme;
};

export function VoteArena() {
  const [pair, setPair] = useState<PairResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPair = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/pair");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load a meme pair.");
      }

      setPair(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load a meme pair.");
      setPair(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPair();
  }, [loadPair]);

  async function handleVote(winnerId: string) {
    if (!pair || voting) {
      return;
    }

    const loserId = winnerId === pair.memeA.id ? pair.memeB.id : pair.memeA.id;

    setVoting(true);
    setError(null);

    try {
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winnerId, loserId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to record vote.");
      }

      await loadPair();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record vote.");
    } finally {
      setVoting(false);
    }
  }

  if (loading) {
    return <p className="text-center text-zinc-600">Loading next matchup...</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
        {error}
      </div>
    );
  }

  if (!pair) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <p className="text-center text-zinc-600">Click the meme you think is better.</p>
      <div className="grid gap-6 md:grid-cols-2">
        <MemeCard meme={pair.memeA} disabled={voting} onVote={handleVote} />
        <div className="flex items-center justify-center md:hidden">
          <span className="rounded-full bg-zinc-900 px-3 py-1 text-sm font-semibold text-white">
            VS
          </span>
        </div>
        <MemeCard meme={pair.memeB} disabled={voting} onVote={handleVote} />
      </div>
      {voting ? (
        <p className="text-center text-sm text-zinc-500">Recording your vote...</p>
      ) : null}
    </div>
  );
}
