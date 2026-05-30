export type ProgressSnapshot = {
  completed: number;
  total: number;
  percent: number;
  etaLabel: string;
  label: string;
};

export function createProgressReporter(total: number) {
  let completed = 0;
  const startedAt = Date.now();

  return {
    markComplete(): ProgressSnapshot {
      completed += 1;

      const percent = Math.round((completed / total) * 100);
      const elapsedMs = Date.now() - startedAt;
      const remaining = total - completed;
      const etaLabel = formatEta(elapsedMs, completed, remaining);

      return {
        completed,
        total,
        percent,
        etaLabel,
        label: `[${completed}/${total} · ${percent}% · ETA ${etaLabel}]`,
      };
    },
    elapsedLabel(): string {
      return formatDuration(Date.now() - startedAt);
    },
  };
}

function formatEta(elapsedMs: number, completed: number, remaining: number): string {
  if (remaining === 0) {
    return "0s";
  }

  if (completed === 0) {
    return "calculating…";
  }

  const averageMs = elapsedMs / completed;
  return formatDuration(averageMs * remaining);
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(1, Math.round(ms / 1000));

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}
