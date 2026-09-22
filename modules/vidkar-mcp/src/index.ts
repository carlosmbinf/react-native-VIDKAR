import { requireOptionalNativeModule } from "expo";

export type MCPTool = {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
};

type NativeMCPModule = {
  configure: (url: string, token: string) => Promise<void>;
  clearConfiguration: () => Promise<void>;
  getConfiguration: () => Promise<{ url: string | null; configured: boolean }>;
  discoverTools: (forceRefresh?: boolean) => Promise<MCPTool[]>;
  executeTool: (toolName: string, args: Record<string, unknown>) => Promise<unknown>;
};

export const VidkarMCP = requireOptionalNativeModule<NativeMCPModule>("VidkarMCP");
