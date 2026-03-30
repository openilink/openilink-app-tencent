/**
 * SSL 证书 Tools
 * 提供 SSL 证书的列出和查看能力
 */
import type { ToolDefinition, ToolHandler } from "../hub/types.js";
import type { TencentClients } from "../tencent/client.js";
import type { ToolModule } from "./index.js";

/** SSL 模块 tool 定义列表 */
const definitions: ToolDefinition[] = [
  {
    name: "list_certificates",
    description: "列出 SSL 证书",
    command: "list_certificates",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "返回数量，默认 20" },
        offset: { type: "number", description: "偏移量，默认 0" },
      },
    },
  },
  {
    name: "get_certificate",
    description: "获取指定 SSL 证书的详细信息",
    command: "get_certificate",
    parameters: {
      type: "object",
      properties: {
        certificate_id: { type: "string", description: "证书 ID" },
      },
      required: ["certificate_id"],
    },
  },
];

/** 创建 SSL 模块的 handler 映射 */
function createHandlers(clients: TencentClients): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  // 列出证书
  handlers.set("list_certificates", async (ctx) => {
    const limit = (ctx.args.limit as number) ?? 20;
    const offset = (ctx.args.offset as number) ?? 0;

    try {
      const res = await clients.ssl.DescribeCertificates({
        Limit: limit,
        Offset: offset,
      });

      const certs = res.Certificates ?? [];
      const total = res.TotalCount ?? 0;

      if (certs.length === 0) {
        return "暂无 SSL 证书";
      }

      const lines = certs.map((c: any, i: number) => {
        const alias = c.Alias ?? "未命名";
        const id = c.CertificateId ?? "";
        const domain = c.Domain ?? "";
        const status = c.Status !== undefined ? String(c.Status) : "未知";
        const certBeginTime = c.CertBeginTime ?? "";
        const certEndTime = c.CertEndTime ?? "";
        return `${offset + i + 1}. ${alias} (${id})\n   域名: ${domain} | 状态: ${status}\n   有效期: ${certBeginTime} ~ ${certEndTime}`;
      });

      return `SSL 证书列表（共 ${total} 个，当前显示 ${certs.length} 个）:\n${lines.join("\n")}`;
    } catch (err: any) {
      return `列出 SSL 证书失败: ${err.message ?? err}`;
    }
  });

  // 获取证书详情
  handlers.set("get_certificate", async (ctx) => {
    const certificateId: string = ctx.args.certificate_id ?? "";

    try {
      const res = await clients.ssl.DescribeCertificate({
        CertificateId: certificateId,
      });

      const lines = [
        `证书: ${(res as any).Alias ?? "未命名"} (${certificateId})`,
        `域名: ${(res as any).Domain ?? "无"}`,
        `状态: ${(res as any).Status !== undefined ? String((res as any).Status) : "未知"}`,
        `类型: ${(res as any).CertificateType ?? "未知"}`,
        `品牌: ${(res as any).ProductZhName ?? "未知"}`,
        `有效期: ${(res as any).CertBeginTime ?? "未知"} ~ ${(res as any).CertEndTime ?? "未知"}`,
        `签发者: ${(res as any).From ?? "未知"}`,
        `关联域名: ${(res as any).SubjectAltName?.join(", ") ?? "无"}`,
      ];

      return lines.join("\n");
    } catch (err: any) {
      return `获取证书详情失败: ${err.message ?? err}`;
    }
  });

  return handlers;
}

/** SSL Tool 模块 */
export const sslTools: ToolModule = { definitions, createHandlers };
