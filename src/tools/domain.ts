/**
 * 域名注册 Tools（Domain）
 * 提供域名注册信息的查询能力
 */
import type { ToolDefinition, ToolHandler } from "../hub/types.js";
import type { TencentClients } from "../tencent/client.js";
import type { ToolModule } from "./index.js";

/** 域名模块 tool 定义列表 */
const definitions: ToolDefinition[] = [
  {
    name: "list_registered_domains",
    description: "列出已注册的域名",
    command: "list_registered_domains",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "返回数量，默认 20" },
        offset: { type: "number", description: "偏移量，默认 0" },
      },
    },
  },
  {
    name: "get_domain_info",
    description: "获取域名注册详情",
    command: "get_domain_info",
    parameters: {
      type: "object",
      properties: {
        domain_name: { type: "string", description: "域名，如 example.com" },
      },
      required: ["domain_name"],
    },
  },
];

/** 创建域名模块的 handler 映射 */
function createHandlers(clients: TencentClients): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  // 列出已注册的域名
  handlers.set("list_registered_domains", async (ctx) => {
    const limit = (ctx.args.limit as number) ?? 20;
    const offset = (ctx.args.offset as number) ?? 0;

    try {
      const res = await clients.domain.DescribeDomainNameList({
        Limit: limit,
        Offset: offset,
      });

      const domains = res.DomainSet ?? [];
      const total = res.TotalCount ?? 0;

      if (domains.length === 0) {
        return "暂无已注册的域名";
      }

      const lines = domains.map((d: any, i: number) => {
        const name = d.DomainName ?? "";
        const expDate = d.ExpirationDate ?? "未知";
        const autoRenew = d.AutoRenew ? "是" : "否";
        return `${offset + i + 1}. ${name}\n   到期时间: ${expDate} | 自动续费: ${autoRenew}`;
      });

      return `已注册域名列表（共 ${total} 个，当前显示 ${domains.length} 个）:\n${lines.join("\n")}`;
    } catch (err: any) {
      return `列出已注册域名失败: ${err.message ?? err}`;
    }
  });

  // 获取域名注册详情
  handlers.set("get_domain_info", async (ctx) => {
    const domainName: string = ctx.args.domain_name ?? "";

    try {
      const res = await clients.domain.DescribeDomainBaseInfo({
        Domain: domainName,
      }) as any;

      const info = res.DomainInfo ?? res;
      const lines = [
        `域名: ${info.DomainName ?? domainName}`,
        `注册商: ${info.RegistrarType ?? "未知"}`,
        `状态: ${info.DomainStatus ?? "未知"}`,
        `DNS 服务器: ${(info.NameServer ?? []).join(", ") || "未知"}`,
        `注册日期: ${info.RegistrationDate ?? "未知"}`,
        `到期日期: ${info.ExpirationDate ?? "未知"}`,
        `自动续费: ${info.AutoRenew ? "是" : "否"}`,
      ];

      return lines.join("\n");
    } catch (err: any) {
      return `获取域名详情失败: ${err.message ?? err}`;
    }
  });

  return handlers;
}

/** 域名 Tool 模块 */
export const domainTools: ToolModule = { definitions, createHandlers };
