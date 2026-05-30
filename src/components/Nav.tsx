import Link from "next/link";

export function Nav() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold text-zinc-900">
          Meme Fight
        </Link>
        <nav className="flex gap-4 text-sm font-medium">
          <Link href="/" className="text-zinc-700 hover:text-zinc-900">
            Vote
          </Link>
          <Link href="/leaderboard" className="text-zinc-700 hover:text-zinc-900">
            Leaderboard
          </Link>
          <Link href="/insights" className="text-zinc-700 hover:text-zinc-900">
            Insights
          </Link>
        </nav>
      </div>
    </header>
  );
}
