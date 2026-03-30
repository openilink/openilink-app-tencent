/**
 * DNS 解析 Tools（DNSPod）
 * 提供域名和解析记录的管理能力
 */
import type { ToolDefinition, ToolHandler } from "../hub/types.js";
import type { TencentClients } from "../tencent/client.js";
import type { ToolModule } from "./index.js";

/** DNS 模块 tool 定义列表 */
const definitions: ToolDefinition[] = [
  {
    name: "list_domains",
    description: "列出 DNSPod 域名列表",
    command: "list_domains",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "返回数量，默认 20" },
        offset: { type: "number", description: "偏移量，默认 0" },
      },
    },
  },
  {
    name: "list_dns_records",
    description: "列出指定域名的解析记录",
    command: "list_dns_records",
    parameters: {
      type: "object",
      properties: {
        domain: { type: "string", description: "域名，如 example.com" },
        limit: { type: "number", description: "返回数量，默认 20" },
        offset: { type: "number", description: "偏移量，默认 0" },
      },
      required: ["domain"],
    },
  },
  {
    name: "create_dns_record",
    description: "创建 DNS 解析记录",
    command: "create_dns_record",
    parameters: {
      type: "object",
      properties: {
        domain: { type: "string", description: "域名，如 example.com" },
        sub_domain: { type: "string", description: "主机记录，如 www、@" },
        record_type: { type: "string", description: "记录类型，如 A、CNAME、MX、TXT" },
        value: { type: "string", description: "记录值" },
        record_line: { type: "string", description: "解析线路，默认「默认」" },
      },
      required: ["domain", "sub_domain", "record_type", "value"],
    },
  },
  {
    name: "delete_dns_record",
    description: "删除 DNS 解析记录",
    command: "delete_dns_record",
    parameters: {
      type: "object",
      properties: {
        domain: { type: "string", description: "域名" },
        record_id: { type: "number", description: "记录 ID" },
      },
      required: ["domain", "record_id"],
    },
  },
];

/** 创建 DNS 模块的 handler 映射 */
function createHandlers(clients: TencentClients): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  // 列出域名
  handlers.set("list_domains", async (ctx) => {
    const limit = (ctx.args.limit as number) ?? 20;
    const offset = (ctx.args.offset as number) ?? 0;

    try {
      const res = await clients.dnspod.DescribeDomainList({
        Type: "ALL",
        Limit: limit,
        Offset: offset,
      });

      const domains = res.DomainList ?? [];
      const total = res.DomainCountInfo?.AllTotal ?? 0;

      if (domains.length === 0) {
        return "暂无域名";
      }

      const lines = domains.map((d: any, i: number) => {
        const name = d.Name ?? "";
        const status = d.Status === "ENABLE" ? "正常" : (d.Status ?? "未知");
        const records = d.RecordCount ?? 0;
        return `${offset + i + 1}. ${name}\n   状态: ${status} | 记录数: ${records}`;
      });

      return `域名列表（共 ${total} 个，当前显示 ${domains.length} 个）:\n${lines.join("\n")}`;
    } catch (err: any) {
      return `列出域名失败: ${err.message ?? err}`;
    }
  });

  // 列出解析记录
  handlers.set("list_dns_records", async (ctx) => {
    const domain: string = ctx.args.domain ?? "";
    const limit = (ctx.args.limit as number) ?? 20;
    const offset = (ctx.args.offset as number) ?? 0;

    try {
      const res = await clients.dnspod.DescribeRecordList({
        Domain: domain,
        Limit: limit,
        Offset: offset,
      });

      const records = res.RecordList ?? [];
      const total = res.RecordCountInfo?.TotalCount ?? 0;

      if (records.length === 0) {
        return `域名 ${domain} 暂无解析记录`;
      }

      const lines = records.map((r: any, i: number) => {
        const name = r.Name ?? "@";
        const type = r.Type ?? "";
        const value = r.Value ?? "";
        const status = r.Status === "ENABLE" ? "启用" : "暂停";
        const ttl = r.TTL ?? 600;
        return `${offset + i + 1}. ${name}.${domain} ${type} → ${value}\n   状态: ${status} | TTL: ${ttl} | ID: ${r.RecordId ?? ""}`;
      });

      return `${domain} 解析记录（共 ${total} 条，当前显示 ${records.length} 条）:\n${lines.join("\n")}`;
    } catch (err: any) {
      return `列出解析记录失败: ${err.message ?? err}`;
    }
  });

  // 创建解析记录
  handlers.set("create_dns_record", async (ctx) => {
    const domain: string = ctx.args.domain ?? "";
    const subDomain: string = ctx.args.sub_domain ?? "";
    const recordType: string = ctx.args.record_type ?? "";
    const value: string = ctx.args.value ?? "";
    const recordLine: string = ctx.args.record_line ?? "默认";

    try {
      const res = await clients.dnspod.CreateRecord({
        Domain: domain,
        SubDomain: subDomain,
        RecordType: recordType,
        RecordLine: recordLine,
        Value: value,
      });

      const recordId = res.RecordId ?? "";
      return `解析记录创建成功!\n域名: ${subDomain}.${domain}\n类型: ${recordType}\n值: ${value}\n记录ID: ${recordId}`;
    } catch (err: any) {
      return `创建解析记录失败: ${err.message ?? err}`;
    }
  });

  // 删除解析记录
  handlers.set("delete_dns_record", async (ctx) => {
    const domain: string = ctx.args.domain ?? "";
    const recordId = ctx.args.record_id as number;

    try {
      await clients.dnspod.DeleteRecord({
        Domain: domain,
        RecordId: recordId,
      });

      return `已删除域名 ${domain} 的解析记录 (ID: ${recordId})`;
    } catch (err: any) {
      return `删除解析记录失败: ${err.message ?? err}`;
    }
  });

  return handlers;
}

/** DNS Tool 模块 */
export const dnsTools: ToolModule = { definitions, createHandlers };
