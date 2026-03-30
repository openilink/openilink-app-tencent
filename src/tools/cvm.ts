/**
 * CVM 云服务器 Tools
 * 提供 CVM 实例的列出、查看、启动、停止、重启能力
 */
import type { ToolDefinition, ToolHandler } from "../hub/types.js";
import type { TencentClients } from "../tencent/client.js";
import type { ToolModule } from "./index.js";

/** CVM 模块 tool 定义列表 */
const definitions: ToolDefinition[] = [
  {
    name: "list_instances",
    description: "列出 CVM 云服务器实例",
    command: "list_instances",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "返回数量，默认 20" },
        offset: { type: "number", description: "偏移量，默认 0" },
      },
    },
  },
  {
    name: "get_instance",
    description: "获取指定 CVM 实例的详细信息",
    command: "get_instance",
    parameters: {
      type: "object",
      properties: {
        instance_id: { type: "string", description: "实例 ID，如 ins-xxxxxxxx" },
      },
      required: ["instance_id"],
    },
  },
  {
    name: "start_instances",
    description: "启动一个或多个 CVM 实例",
    command: "start_instances",
    parameters: {
      type: "object",
      properties: {
        instance_ids: {
          type: "array",
          items: { type: "string" },
          description: "实例 ID 列表",
        },
      },
      required: ["instance_ids"],
    },
  },
  {
    name: "stop_instances",
    description: "停止一个或多个 CVM 实例",
    command: "stop_instances",
    parameters: {
      type: "object",
      properties: {
        instance_ids: {
          type: "array",
          items: { type: "string" },
          description: "实例 ID 列表",
        },
      },
      required: ["instance_ids"],
    },
  },
  {
    name: "reboot_instances",
    description: "重启一个或多个 CVM 实例",
    command: "reboot_instances",
    parameters: {
      type: "object",
      properties: {
        instance_ids: {
          type: "array",
          items: { type: "string" },
          description: "实例 ID 列表",
        },
      },
      required: ["instance_ids"],
    },
  },
];

/** 创建 CVM 模块的 handler 映射 */
function createHandlers(clients: TencentClients): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  // 列出 CVM 实例
  handlers.set("list_instances", async (ctx) => {
    const limit = (ctx.args.limit as number) ?? 20;
    const offset = (ctx.args.offset as number) ?? 0;

    try {
      const res = await clients.cvm.DescribeInstances({
        Limit: limit,
        Offset: offset,
      });

      const instances = res.InstanceSet ?? [];
      const total = res.TotalCount ?? 0;

      if (instances.length === 0) {
        return "暂无 CVM 实例";
      }

      const lines = instances.map((inst: any, i: number) => {
        const name = inst.InstanceName ?? "未命名";
        const id = inst.InstanceId ?? "";
        const state = inst.InstanceState ?? "未知";
        const type = inst.InstanceType ?? "";
        const publicIp = inst.PublicIpAddresses?.join(", ") ?? "无";
        const privateIp = inst.PrivateIpAddresses?.join(", ") ?? "无";
        return `${offset + i + 1}. ${name} (${id})\n   状态: ${state} | 机型: ${type}\n   公网IP: ${publicIp} | 内网IP: ${privateIp}`;
      });

      return `CVM 实例列表（共 ${total} 个，当前显示 ${instances.length} 个）:\n${lines.join("\n")}`;
    } catch (err: any) {
      return `列出 CVM 实例失败: ${err.message ?? err}`;
    }
  });

  // 获取 CVM 实例详情
  handlers.set("get_instance", async (ctx) => {
    const instanceId: string = ctx.args.instance_id ?? "";

    try {
      const res = await clients.cvm.DescribeInstances({
        InstanceIds: [instanceId],
      });

      const instances = res.InstanceSet ?? [];
      if (instances.length === 0) {
        return `未找到实例: ${instanceId}`;
      }

      const inst = instances[0] as any;
      const lines = [
        `实例: ${inst.InstanceName ?? "未命名"} (${inst.InstanceId})`,
        `状态: ${inst.InstanceState ?? "未知"}`,
        `机型: ${inst.InstanceType ?? "未知"}`,
        `可用区: ${inst.Placement?.Zone ?? "未知"}`,
        `操作系统: ${inst.OsName ?? "未知"}`,
        `CPU: ${inst.CPU ?? 0} 核 | 内存: ${inst.Memory ?? 0} GB`,
        `公网IP: ${inst.PublicIpAddresses?.join(", ") ?? "无"}`,
        `内网IP: ${inst.PrivateIpAddresses?.join(", ") ?? "无"}`,
        `创建时间: ${inst.CreatedTime ?? "未知"}`,
        `到期时间: ${inst.ExpiredTime ?? "未知"}`,
        `计费模式: ${inst.InstanceChargeType ?? "未知"}`,
      ];

      return lines.join("\n");
    } catch (err: any) {
      return `获取实例详情失败: ${err.message ?? err}`;
    }
  });

  // 启动 CVM 实例
  handlers.set("start_instances", async (ctx) => {
    const instanceIds: string[] = ctx.args.instance_ids ?? [];

    if (instanceIds.length === 0) {
      return "请提供要启动的实例 ID 列表";
    }

    try {
      await clients.cvm.StartInstances({
        InstanceIds: instanceIds,
      });

      return `已发起启动请求，实例: ${instanceIds.join(", ")}`;
    } catch (err: any) {
      return `启动实例失败: ${err.message ?? err}`;
    }
  });

  // 停止 CVM 实例
  handlers.set("stop_instances", async (ctx) => {
    const instanceIds: string[] = ctx.args.instance_ids ?? [];

    if (instanceIds.length === 0) {
      return "请提供要停止的实例 ID 列表";
    }

    try {
      await clients.cvm.StopInstances({
        InstanceIds: instanceIds,
      });

      return `已发起停止请求，实例: ${instanceIds.join(", ")}`;
    } catch (err: any) {
      return `停止实例失败: ${err.message ?? err}`;
    }
  });

  // 重启 CVM 实例
  handlers.set("reboot_instances", async (ctx) => {
    const instanceIds: string[] = ctx.args.instance_ids ?? [];

    if (instanceIds.length === 0) {
      return "请提供要重启的实例 ID 列表";
    }

    try {
      await clients.cvm.RebootInstances({
        InstanceIds: instanceIds,
      });

      return `已发起重启请求，实例: ${instanceIds.join(", ")}`;
    } catch (err: any) {
      return `重启实例失败: ${err.message ?? err}`;
    }
  });

  return handlers;
}

/** CVM Tool 模块 */
export const cvmTools: ToolModule = { definitions, createHandlers };
