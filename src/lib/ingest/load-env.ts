import { config } from "dotenv";
import { existsSync } from "fs";
import path from "path";

export function loadLocalEnv(): void {
  const localPath = path.join(process.cwd(), ".env.local");
  const envPath = path.join(process.cwd(), ".env");

  if (existsSync(localPath)) {
    config({ path: localPath });
  } else if (existsSync(envPath)) {
    config({ path: envPath });
  }
}
