import { LeaderboardTable } from "@/components/LeaderboardTable";

export default function LeaderboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Leaderboard</h1>
        <p className="mt-2 text-zinc-600">Memes ranked by ELO rating.</p>
      </div>
      <LeaderboardTable />
    </main>
  );
}
