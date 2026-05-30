import {
  generateByteStreamFromBuffer,
  readByteStream,
} from "box-node-sdk/sdk-gen/internal";

import { getMemesFolderId } from "@/lib/box/config";
import { getBoxClient } from "@/lib/box/client";

export type UploadedMemeFile = {
  boxFileId: string;
  sharedLinkUrl: string;
};

export async function uploadMemeFile(
  fileName: string,
  content: Buffer,
  contentType?: string,
): Promise<UploadedMemeFile> {
  const client = getBoxClient();

  const uploaded = await client.uploads.uploadFile({
    attributes: {
      name: fileName,
      parent: { id: getMemesFolderId() },
    },
    file: generateByteStreamFromBuffer(content),
    fileFileName: fileName,
    fileContentType: contentType,
  });

  const file = uploaded.entries?.[0];
  if (!file?.id) {
    throw new Error("Box upload succeeded but no file ID was returned.");
  }

  const sharedLinkUrl = await createOpenSharedLink(file.id);

  return {
    boxFileId: file.id,
    sharedLinkUrl,
  };
}

export async function createOpenSharedLink(fileId: string): Promise<string> {
  const client = getBoxClient();

  const file = await client.sharedLinksFiles.addShareLinkToFile(
    fileId,
    {
      sharedLink: {
        access: "open",
      },
    },
    { fields: "shared_link" },
  );

  const url = file.sharedLink?.url;
  if (!url) {
    throw new Error("Box shared link was not returned.");
  }

  return url;
}

export async function downloadMemeFile(fileId: string): Promise<{
  content: Buffer;
  contentType: string | null;
}> {
  const client = getBoxClient();
  const file = await client.files.getFileById(fileId);
  const stream = await client.downloads.downloadFile(fileId);

  if (!stream) {
    throw new Error("Box download returned no content.");
  }

  return {
    content: await readByteStream(stream),
    contentType: file.extension ? mimeTypeFromExtension(file.extension) : null,
  };
}

function mimeTypeFromExtension(extension: string): string {
  const normalized = extension.toLowerCase();

  switch (normalized) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}
