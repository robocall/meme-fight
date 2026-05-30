"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { Meme } from "@/lib/db/schema";

function getMemeImageSrc(memeId: string): string {
  return `/api/memes/${memeId}/image`;
}

function MemeNameCell({ meme }: { meme: Meme }) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewPosition, setPreviewPosition] = useState({ top: 0, left: 0 });

  function showPreview() {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    setPreviewPosition({ top: rect.bottom + 8, left: rect.left });
    setPreviewVisible(true);
  }

  return (
    <>
      <span
        ref={anchorRef}
        className="cursor-default underline decoration-transparent decoration-dotted underline-offset-2 hover:decoration-zinc-400"
        onMouseEnter={showPreview}
        onMouseLeave={() => setPreviewVisible(false)}
      >
        {meme.title}
      </span>
      {previewVisible && (
        <div
          className="pointer-events-none fixed z-50 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg"
          style={{ top: previewPosition.top, left: previewPosition.left }}
        >
          <div className="relative aspect-square w-full bg-zinc-100">
            <Image
              src={getMemeImageSrc(meme.id)}
              alt={meme.title}
              fill
              className="object-contain"
              sizes="192px"
            />
          </div>
        </div>
      )}
    </>
  );
}

export function LeaderboardTable() {
  const [leaderboard, setLeaderboard] = useState<Meme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const response = await fetch("/api/leaderboard");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load leaderboard.");
        }

        setLeaderboard(data.leaderboard);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load leaderboard.");
      } finally {
        setLoading(false);
      }
    }

    void loadLeaderboard();
  }, []);

  if (loading) {
    return <p className="text-zinc-600">Loading leaderboard...</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-4 py-3 font-medium">Rank</th>
            <th className="px-4 py-3 font-medium">Meme</th>
            <th className="px-4 py-3 font-medium">ELO</th>
            <th className="px-4 py-3 font-medium">W-L</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((meme, index) => (
            <tr key={meme.id} className="border-b border-zinc-100 last:border-b-0">
              <td className="px-4 py-3 font-medium text-zinc-900">{index + 1}</td>
              <td className="px-4 py-3 text-zinc-900">
                <MemeNameCell meme={meme} />
              </td>
              <td className="px-4 py-3 text-zinc-700">{meme.elo}</td>
              <td className="px-4 py-3 text-zinc-700">
                {meme.wins}-{meme.losses}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
