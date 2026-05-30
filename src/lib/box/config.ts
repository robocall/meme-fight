const CCG_ENV_VARS = [
  "BOX_CLIENT_ID",
  "BOX_CLIENT_SECRET",
  "BOX_ENTERPRISE_ID",
] as const;

export type BoxCcgEnvVar = (typeof CCG_ENV_VARS)[number];
export type BoxAuthMode = "ccg" | "developer_token";

export function getMissingCcgEnvVars(): BoxCcgEnvVar[] {
  return CCG_ENV_VARS.filter((name) => !process.env[name]);
}

export function isCcgConfigured(): boolean {
  return getMissingCcgEnvVars().length === 0;
}

export function isDeveloperTokenConfigured(): boolean {
  return Boolean(process.env.BOX_DEVELOPER_TOKEN);
}

export function isBoxConfigured(): boolean {
  return isCcgConfigured() || isDeveloperTokenConfigured();
}

export function getBoxAuthMode(): BoxAuthMode | null {
  if (isCcgConfigured()) {
    return "ccg";
  }

  if (isDeveloperTokenConfigured()) {
    return "developer_token";
  }

  return null;
}

export function requireBoxEnv(name: BoxCcgEnvVar): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function requireDeveloperToken(): string {
  const value = process.env.BOX_DEVELOPER_TOKEN;
  if (!value) {
    throw new Error("Missing required environment variable: BOX_DEVELOPER_TOKEN");
  }
  return value;
}

export function getMemesFolderId(): string {
  return process.env.BOX_MEMES_FOLDER_ID ?? "0";
}
