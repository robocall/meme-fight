import { InsightsDashboard } from "@/components/InsightsDashboard";

export default function InsightsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Insights</h1>
        <p className="mt-2 text-zinc-600">
          Patterns from Box AI analysis of your highest- and lowest-ranked memes.
        </p>
      </div>
      <InsightsDashboard />
    </main>
  );
}
