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
  {
    name: "get_cdn_domain_detail",
    description: "获取 CDN 域名详细配置",
    command: "get_cdn_domain_detail",
    parameters: {
      type: "object",
      properties: {
        domain: { type: "string", description: "CDN 加速域名" },
      },
      required: ["domain"],
    },
  },
  {
    name: "get_cdn_usage",
    description: "查询 CDN 用量统计数据（带宽或流量）",
    command: "get_cdn_usage",
    parameters: {
      type: "object",
      properties: {
        start_time: { type: "string", description: "起始时间，格式 YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss" },
        end_time: { type: "string", description: "结束时间，格式 YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss" },
        metric: { type: "string", description: "指标: bandwidth（带宽）或 flux（流量），默认 bandwidth" },
      },
      required: ["start_time", "end_time"],
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

  // 获取 CDN 域名详细配置
  handlers.set("get_cdn_domain_detail", async (ctx) => {
    const domain: string = ctx.args.domain ?? "";

    try {
      const res = await clients.cdn.DescribeDomainsConfig({
        Filters: [
          { Name: "domain", Value: [domain] },
        ],
      });

      const domains = res.Domains ?? [];
      if (domains.length === 0) {
        return `未找到 CDN 域名: ${domain}`;
      }

      const d = domains[0] as any;
      const lines = [
        `域名: ${d.Domain ?? domain}`,
        `状态: ${d.Status ?? "未知"}`,
        `CNAME: ${d.Cname ?? "无"}`,
        `业务类型: ${d.ServiceType ?? "未知"}`,
        `创建时间: ${d.CreateTime ?? "未知"}`,
        `更新时间: ${d.UpdateTime ?? "未知"}`,
        `源站类型: ${d.Origin?.OriginType ?? "未知"}`,
        `源站地址: ${(d.Origin?.Origins ?? []).join(", ") || "无"}`,
        `HTTPS: ${d.Https?.Switch ?? "未知"}`,
      ];

      return lines.join("\n");
    } catch (err: any) {
      return `获取 CDN 域名详情失败: ${err.message ?? err}`;
    }
  });

  // 查询 CDN 用量统计
  handlers.set("get_cdn_usage", async (ctx) => {
    const startTime: string = ctx.args.start_time ?? "";
    const endTime: string = ctx.args.end_time ?? "";
    const metric: string = ctx.args.metric ?? "bandwidth";

    try {
      const res = await clients.cdn.DescribeCdnData({
        StartTime: startTime,
        EndTime: endTime,
        Metric: metric,
      });

      const data = res.Data ?? [];
      if (data.length === 0) {
        return "暂无用量数据";
      }

      const metricName = metric === "bandwidth" ? "带宽" : "流量";
      const lines: string[] = [`CDN ${metricName}统计 (${startTime} ~ ${endTime}):`];

      for (const item of data) {
        const resource = (item as any).Resource ?? "全部";
        const details = (item as any).CdnData ?? [];
        lines.push(`\n资源: ${resource}`);
        for (const detail of details) {
          const metricLabel = detail.Metric ?? metric;
          const values = detail.DetailData ?? [];
          if (values.length > 0) {
            // 只显示汇总信息，避免过长
            const nums = values.map((v: any) => v.Value ?? 0);
            const max = Math.max(...nums);
            const avg = nums.reduce((a: number, b: number) => a + b, 0) / nums.length;
            lines.push(`  ${metricLabel}: 峰值 ${max.toFixed(2)} | 均值 ${avg.toFixed(2)} | 数据点 ${nums.length} 个`);
          }
        }
      }

      return lines.join("\n");
    } catch (err: any) {
      return `查询 CDN 用量失败: ${err.message ?? err}`;
    }
  });

  return handlers;
}

/** CDN Tool 模块 */
export const cdnTools: ToolModule = { definitions, createHandlers };
