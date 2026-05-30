import { VoteArena } from "@/components/VoteArena";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[96rem] flex-1 flex-col gap-6 px-4 py-6 md:px-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-zinc-900 md:text-3xl">Which meme wins?</h1>
        <p className="mt-1 text-sm text-zinc-600 md:text-base">Vote head-to-head. Rankings use ELO.</p>
      </div>
      <VoteArena />
    </main>
  );
}
