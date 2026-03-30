/**
 * 轻量应用服务器 Tools
 * 提供 Lighthouse 实例的列出和查看能力
 */
import type { ToolDefinition, ToolHandler } from "../hub/types.js";
import type { TencentClients } from "../tencent/client.js";
import type { ToolModule } from "./index.js";

/** 轻量服务器模块 tool 定义列表 */
const definitions: ToolDefinition[] = [
  {
    name: "list_lighthouse",
    description: "列出轻量应用服务器实例",
    command: "list_lighthouse",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "返回数量，默认 20" },
        offset: { type: "number", description: "偏移量，默认 0" },
      },
    },
  },
  {
    name: "get_lighthouse",
    description: "获取指定轻量应用服务器的详细信息",
    command: "get_lighthouse",
    parameters: {
      type: "object",
      properties: {
        instance_id: { type: "string", description: "实例 ID，如 lhins-xxxxxxxx" },
      },
      required: ["instance_id"],
    },
  },
];

/** 创建 Lighthouse 模块的 handler 映射 */
function createHandlers(clients: TencentClients): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  // 列出轻量服务器实例
  handlers.set("list_lighthouse", async (ctx) => {
    const limit = (ctx.args.limit as number) ?? 20;
    const offset = (ctx.args.offset as number) ?? 0;

    try {
      const res = await clients.lighthouse.DescribeInstances({
        Limit: limit,
        Offset: offset,
      });

      const instances = res.InstanceSet ?? [];
      const total = res.TotalCount ?? 0;

      if (instances.length === 0) {
        return "暂无轻量应用服务器实例";
      }

      const lines = instances.map((inst: any, i: number) => {
        const name = inst.InstanceName ?? "未命名";
        const id = inst.InstanceId ?? "";
        const state = inst.InstanceState ?? "未知";
        const publicIp = inst.PublicAddresses?.join(", ") ?? "无";
        const privateIp = inst.PrivateAddresses?.join(", ") ?? "无";
        return `${offset + i + 1}. ${name} (${id})\n   状态: ${state}\n   公网IP: ${publicIp} | 内网IP: ${privateIp}`;
      });

      return `轻量应用服务器列表（共 ${total} 个，当前显示 ${instances.length} 个）:\n${lines.join("\n")}`;
    } catch (err: any) {
      return `列出轻量服务器失败: ${err.message ?? err}`;
    }
  });

  // 获取轻量服务器详情
  handlers.set("get_lighthouse", async (ctx) => {
    const instanceId: string = ctx.args.instance_id ?? "";

    try {
      const res = await clients.lighthouse.DescribeInstances({
        InstanceIds: [instanceId],
      });

      const instances = res.InstanceSet ?? [];
      if (instances.length === 0) {
        return `未找到轻量服务器实例: ${instanceId}`;
      }

      const inst = instances[0] as any;
      const lines = [
        `实例: ${inst.InstanceName ?? "未命名"} (${inst.InstanceId})`,
        `状态: ${inst.InstanceState ?? "未知"}`,
        `可用区: ${inst.Zone ?? "未知"}`,
        `操作系统: ${inst.OsName ?? "未知"}`,
        `CPU: ${inst.CPU ?? 0} 核 | 内存: ${inst.Memory ?? 0} GB`,
        `系统盘: ${inst.SystemDisk?.DiskSize ?? 0} GB`,
        `公网IP: ${inst.PublicAddresses?.join(", ") ?? "无"}`,
        `内网IP: ${inst.PrivateAddresses?.join(", ") ?? "无"}`,
        `创建时间: ${inst.CreatedTime ?? "未知"}`,
        `到期时间: ${inst.ExpiredTime ?? "未知"}`,
      ];

      return lines.join("\n");
    } catch (err: any) {
      return `获取轻量服务器详情失败: ${err.message ?? err}`;
    }
  });

  return handlers;
}

/** Lighthouse Tool 模块 */
export const lighthouseTools: ToolModule = { definitions, createHandlers };
