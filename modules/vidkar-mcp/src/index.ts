import { requireOptionalNativeModule } from "expo";

export type MCPTool = {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  permissions?: string[];
  dataClass?: string;
  readOnly: boolean;
  requiresConfirmation: boolean;
  security?: Record<string, unknown>;
};

type NativeMCPModule = {
  configure: (url: string, token: string, ownerId: string) => Promise<void>;
  clearConfiguration: () => Promise<void>;
  getConfiguration: () => Promise<{ url: string | null; ownerId: string | null; configured: boolean }>;
  discoverTools: (forceRefresh?: boolean) => Promise<MCPTool[]>;
  executeTool: (toolName: string, args: Record<string, unknown>) => Promise<unknown>;
  authorizePlayback: (entityType: string, entityId: string) => Promise<void>;
  consumePlaybackAuthorization: (entityType: string, entityId: string) => Promise<boolean>;
  consumeSiriSearchResults: (query: string) => Promise<{ found: boolean; output?: string }>;
};

export const VidkarMCP = requireOptionalNativeModule<NativeMCPModule>("VidkarMCP");
