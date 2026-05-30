import Image from "next/image";

import type { Meme } from "@/lib/db/schema";

type MemeCardProps = {
  meme: Meme;
  disabled?: boolean;
  onVote: (memeId: string) => void;
};

function getMemeImageSrc(meme: Meme): string {
  return `/api/memes/${meme.id}/image`;
}

export function MemeCard({ meme, disabled = false, onVote }: MemeCardProps) {
  const imageSrc = getMemeImageSrc(meme);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onVote(meme.id)}
      className="group flex w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm transition hover:border-zinc-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="relative aspect-square w-full bg-zinc-100">
        <Image
          src={imageSrc}
          alt={meme.title}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 400px"
        />
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h2 className="text-lg font-semibold text-zinc-900">{meme.title}</h2>
        <p className="text-sm text-zinc-500">ELO {meme.elo}</p>
      </div>
    </button>
  );
}
