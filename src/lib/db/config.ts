export function getTursoConfig() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error("Missing TURSO_DATABASE_URL. Add it to .env.local.");
  }

  return {
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  };
}
