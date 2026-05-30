import { VoteArena } from "@/components/VoteArena";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900">Which meme wins?</h1>
        <p className="mt-2 text-zinc-600">Vote head-to-head. Rankings use ELO.</p>
      </div>
      <VoteArena />
    </main>
  );
}
