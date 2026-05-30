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
      className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm transition hover:border-zinc-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="relative min-h-[50vh] w-full flex-1 bg-zinc-100 md:min-h-[70vh]">
        <Image
          src={imageSrc}
          alt={meme.title}
          fill
          unoptimized
          priority
          className="object-contain p-2 transition group-hover:scale-[1.01]"
          sizes="(max-width: 768px) 100vw, 45vw"
        />
      </div>
      <div className="flex shrink-0 flex-col gap-0.5 border-t border-zinc-100 px-4 py-3">
        <h2 className="line-clamp-2 text-base font-semibold text-zinc-900">{meme.title}</h2>
        <p className="text-xs text-zinc-500">ELO {meme.elo}</p>
      </div>
    </button>
  );
}
