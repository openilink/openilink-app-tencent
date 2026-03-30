import type { Config } from "../config.js";
import type { ToolDefinition } from "./types.js";

/** Manifest 结构（注册到 Hub 的 App 描述） */
export interface Manifest {
  slug: string;
  name: string;
  description: string;
  icon: string;
  events: string[];
  scopes: string[];
  tools: ToolDefinition[];
  oauth_setup_url: string;
  oauth_redirect_url: string;
  webhook_url: string;
  /** 配置表单 JSON Schema */
  config_schema?: Record<string, unknown>;
  /** 安装引导说明（Markdown） */
  guide?: string;
}

/**
 * 生成完整的 App Manifest，用于向 Hub 注册
 * @param config 应用配置
 * @param toolDefinitions 工具定义列表
 */
export function getManifest(
  config: Config,
  toolDefinitions: ToolDefinition[] = [],
): Manifest {
  const baseUrl = config.baseUrl;

  return {
    slug: "tencent-cloud",
    name: "腾讯云",
    description: "通过微信管理腾讯云资源（CVM/轻量/DNS/CDN/SSL/CLB/账单/安全组）",
    icon: "🟦",
    events: ["command"],
    scopes: ["tools:write"],
    tools: toolDefinitions,
    oauth_setup_url: `${baseUrl}/oauth/setup`,
    oauth_redirect_url: `${baseUrl}/oauth/redirect`,
    webhook_url: `${baseUrl}/hub/webhook`,
    config_schema: {
      type: "object",
      properties: {
        tencent_secret_id: {
          type: "string",
          title: "腾讯云 SecretId",
          description: "在腾讯云控制台 → 访问管理 → API 密钥管理 中获取",
        },
        tencent_secret_key: {
          type: "string",
          title: "腾讯云 SecretKey",
          description: "与 SecretId 配套的密钥",
        },
        tencent_region: {
          type: "string",
          title: "地域",
          description: "腾讯云地域（如 ap-guangzhou、ap-beijing），可选",
        },
      },
      required: ["tencent_secret_id", "tencent_secret_key"],
    },
    guide:
      "## 腾讯云安装指南\n### 第 1 步\n访问 [腾讯云控制台 - API 密钥管理](https://console.cloud.tencent.com/cam/capi)\n### 第 2 步\n创建或复制 SecretId 和 SecretKey\n### 第 3 步\n将 SecretId 和 SecretKey 填入上方配置并安装",
  };
}
