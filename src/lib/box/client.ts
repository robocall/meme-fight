import {
  BoxClient,
  BoxCcgAuth,
  BoxDeveloperTokenAuth,
  CcgConfig,
} from "box-node-sdk/sdk-gen";

import {
  getBoxAuthMode,
  isBoxConfigured,
  requireBoxEnv,
  requireDeveloperToken,
} from "@/lib/box/config";

const globalForBox = globalThis as typeof globalThis & {
  __boxClient?: BoxClient;
};

export function getBoxClient(): BoxClient {
  if (!isBoxConfigured()) {
    throw new Error(
      "Box is not configured. Set CCG credentials (BOX_CLIENT_ID, BOX_CLIENT_SECRET, BOX_ENTERPRISE_ID) or BOX_DEVELOPER_TOKEN in .env.local.",
    );
  }

  if (!globalForBox.__boxClient) {
    const authMode = getBoxAuthMode();

    if (authMode === "ccg") {
      const ccgConfig = new CcgConfig({
        clientId: requireBoxEnv("BOX_CLIENT_ID"),
        clientSecret: requireBoxEnv("BOX_CLIENT_SECRET"),
        enterpriseId: requireBoxEnv("BOX_ENTERPRISE_ID"),
      });
      globalForBox.__boxClient = new BoxClient({ auth: new BoxCcgAuth({ config: ccgConfig }) });
    } else {
      globalForBox.__boxClient = new BoxClient({
        auth: new BoxDeveloperTokenAuth({ token: requireDeveloperToken() }),
      });
    }
  }

  return globalForBox.__boxClient;
}
