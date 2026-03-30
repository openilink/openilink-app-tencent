/**
 * CDN Tools
 * 提供 CDN 域名列出、URL 刷新和预热能力
 */
import type { ToolDefinition, ToolHandler } from "../hub/types.js";
import type { TencentClients } from "../tencent/client.js";
import type { ToolModule } from "./index.js";

/** CDN 模块 tool 定义列表 */
const definitions: ToolDefinition[] = [
  {
    name: "list_cdn_domains",
    description: "列出 CDN 加速域名",
    command: "list_cdn_domains",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "返回数量，默认 20" },
        offset: { type: "number", description: "偏移量，默认 0" },
      },
    },
  },
  {
    name: "purge_urls",
    description: "刷新 CDN 缓存 URL",
    command: "purge_urls",
    parameters: {
      type: "object",
      properties: {
        urls: {
          type: "array",
          items: { type: "string" },
          description: "要刷新的 URL 列表",
        },
      },
      required: ["urls"],
    },
  },
  {
    name: "push_urls",
    description: "预热 CDN URL（提前将内容缓存到 CDN 节点）",
    command: "push_urls",
    parameters: {
      type: "object",
      properties: {
        urls: {
          type: "array",
          items: { type: "string" },
          description: "要预热的 URL 列表",
        },
      },
      required: ["urls"],
    },
  },
];

/** 创建 CDN 模块的 handler 映射 */
function createHandlers(clients: TencentClients): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  // 列出 CDN 域名
  handlers.set("list_cdn_domains", async (ctx) => {
    const limit = (ctx.args.limit as number) ?? 20;
    const offset = (ctx.args.offset as number) ?? 0;

    try {
      const res = await clients.cdn.DescribeDomains({
        Limit: limit,
        Offset: offset,
      });

      const domains = res.Domains ?? [];
      const total = res.TotalNumber ?? 0;

      if (domains.length === 0) {
        return "暂无 CDN 加速域名";
      }

      const lines = domains.map((d: any, i: number) => {
        const domain = d.Domain ?? "";
        const status = d.Status ?? "未知";
        const cname = d.Cname ?? "";
        const serviceType = d.ServiceType ?? "";
        return `${offset + i + 1}. ${domain}\n   状态: ${status} | 类型: ${serviceType}\n   CNAME: ${cname}`;
      });

      return `CDN 域名列表（共 ${total} 个，当前显示 ${domains.length} 个）:\n${lines.join("\n")}`;
    } catch (err: any) {
      return `列出 CDN 域名失败: ${err.message ?? err}`;
    }
  });

  // 刷新 URL 缓存
  handlers.set("purge_urls", async (ctx) => {
    const urls: string[] = ctx.args.urls ?? [];

    if (urls.length === 0) {
      return "请提供要刷新的 URL 列表";
    }

    try {
      const res = await clients.cdn.PurgeUrlsCache({
        Urls: urls,
      });

      const taskId = res.TaskId ?? "";
      return `URL 刷新任务已提交!\n任务ID: ${taskId}\n刷新 URL 数量: ${urls.length}`;
    } catch (err: any) {
      return `URL 刷新失败: ${err.message ?? err}`;
    }
  });

  // 预热 URL
  handlers.set("push_urls", async (ctx) => {
    const urls: string[] = ctx.args.urls ?? [];

    if (urls.length === 0) {
      return "请提供要预热的 URL 列表";
    }

    try {
      const res = await clients.cdn.PushUrlsCache({
        Urls: urls,
      });

      const taskId = res.TaskId ?? "";
      return `URL 预热任务已提交!\n任务ID: ${taskId}\n预热 URL 数量: ${urls.length}`;
    } catch (err: any) {
      return `URL 预热失败: ${err.message ?? err}`;
    }
  });

  return handlers;
}

/** CDN Tool 模块 */
export const cdnTools: ToolModule = { definitions, createHandlers };
