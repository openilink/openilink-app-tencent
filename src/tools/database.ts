/**
 * 数据库 Tools（MySQL / Redis / MongoDB）
 * 提供数据库实例的列出、查看详情和重启能力
 */
import type { ToolDefinition, ToolHandler } from "../hub/types.js";
import type { TencentClients } from "../tencent/client.js";
import type { ToolModule } from "./index.js";

/** 数据库模块 tool 定义列表 */
const definitions: ToolDefinition[] = [
  {
    name: "list_mysql_instances",
    description: "列出 MySQL（CDB）实例",
    command: "list_mysql_instances",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "返回数量，默认 20" },
        offset: { type: "number", description: "偏移量，默认 0" },
      },
    },
  },
  {
    name: "get_mysql_instance",
    description: "获取指定 MySQL 实例的详细信息",
    command: "get_mysql_instance",
    parameters: {
      type: "object",
      properties: {
        instance_id: { type: "string", description: "实例 ID，如 cdb-xxxxxxxx" },
      },
      required: ["instance_id"],
    },
  },
  {
    name: "list_redis_instances",
    description: "列出 Redis 实例",
    command: "list_redis_instances",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "返回数量，默认 20" },
        offset: { type: "number", description: "偏移量，默认 0" },
      },
    },
  },
  {
    name: "get_redis_instance",
    description: "获取指定 Redis 实例的详细信息",
    command: "get_redis_instance",
    parameters: {
      type: "object",
      properties: {
        instance_id: { type: "string", description: "实例 ID，如 crs-xxxxxxxx" },
      },
      required: ["instance_id"],
    },
  },
  {
    name: "list_mongodb_instances",
    description: "列出 MongoDB 实例",
    command: "list_mongodb_instances",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "返回数量，默认 20" },
        offset: { type: "number", description: "偏移量，默认 0" },
      },
    },
  },
  {
    name: "restart_mysql",
    description: "重启 MySQL（CDB）实例",
    command: "restart_mysql",
    parameters: {
      type: "object",
      properties: {
        instance_id: { type: "string", description: "MySQL 实例 ID，如 cdb-xxxxxxxx" },
      },
      required: ["instance_id"],
    },
  },
];

/** 创建数据库模块的 handler 映射 */
function createHandlers(clients: TencentClients): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  // 列出 MySQL 实例
  handlers.set("list_mysql_instances", async (ctx) => {
    const limit = (ctx.args.limit as number) ?? 20;
    const offset = (ctx.args.offset as number) ?? 0;

    try {
      const res = await clients.cdb.DescribeDBInstances({
        Limit: limit,
        Offset: offset,
      });

      const instances = res.Items ?? [];
      const total = res.TotalCount ?? 0;

      if (instances.length === 0) {
        return "暂无 MySQL 实例";
      }

      const lines = instances.map((inst: any, i: number) => {
        const name = inst.InstanceName ?? "未命名";
        const id = inst.InstanceId ?? "";
        const status = inst.Status !== undefined ? String(inst.Status) : "未知";
        const memory = inst.Memory ?? 0;
        const volume = inst.Volume ?? 0;
        const vip = inst.Vip ?? "无";
        const vport = inst.Vport ?? "";
        return `${offset + i + 1}. ${name} (${id})\n   状态: ${status} | 内存: ${memory}MB | 磁盘: ${volume}GB\n   内网地址: ${vip}:${vport}`;
      });

      return `MySQL 实例列表（共 ${total} 个，当前显示 ${instances.length} 个）:\n${lines.join("\n")}`;
    } catch (err: any) {
      return `列出 MySQL 实例失败: ${err.message ?? err}`;
    }
  });

  // 获取 MySQL 实例详情
  handlers.set("get_mysql_instance", async (ctx) => {
    const instanceId: string = ctx.args.instance_id ?? "";

    try {
      const res = await clients.cdb.DescribeDBInstances({
        InstanceIds: [instanceId],
      });

      const instances = res.Items ?? [];
      if (instances.length === 0) {
        return `未找到 MySQL 实例: ${instanceId}`;
      }

      const inst = instances[0] as any;
      const lines = [
        `实例: ${inst.InstanceName ?? "未命名"} (${inst.InstanceId})`,
        `状态: ${inst.Status !== undefined ? String(inst.Status) : "未知"}`,
        `引擎版本: ${inst.EngineVersion ?? "未知"}`,
        `内存: ${inst.Memory ?? 0} MB | 磁盘: ${inst.Volume ?? 0} GB`,
        `CPU: ${inst.Cpu ?? "未知"} 核`,
        `内网地址: ${inst.Vip ?? "无"}:${inst.Vport ?? ""}`,
        `外网地址: ${inst.WanDomain ?? "无"}:${inst.WanPort ?? ""}`,
        `可用区: ${inst.Zone ?? "未知"}`,
        `创建时间: ${inst.CreateTime ?? "未知"}`,
        `到期时间: ${inst.DeadlineTime ?? "未知"}`,
        `计费模式: ${inst.PayType !== undefined ? String(inst.PayType) : "未知"}`,
      ];

      return lines.join("\n");
    } catch (err: any) {
      return `获取 MySQL 实例详情失败: ${err.message ?? err}`;
    }
  });

  // 列出 Redis 实例
  handlers.set("list_redis_instances", async (ctx) => {
    const limit = (ctx.args.limit as number) ?? 20;
    const offset = (ctx.args.offset as number) ?? 0;

    try {
      const res = await clients.redis.DescribeInstances({
        Limit: limit,
        Offset: offset,
      });

      const instances = res.InstanceSet ?? [];
      const total = res.TotalCount ?? 0;

      if (instances.length === 0) {
        return "暂无 Redis 实例";
      }

      const lines = instances.map((inst: any, i: number) => {
        const name = inst.InstanceName ?? "未命名";
        const id = inst.InstanceId ?? "";
        const status = inst.Status !== undefined ? String(inst.Status) : "未知";
        const size = inst.Size ?? 0;
        const vip = inst.WanIp ?? "无";
        const port = inst.Port ?? "";
        return `${offset + i + 1}. ${name} (${id})\n   状态: ${status} | 容量: ${size}MB\n   内网地址: ${vip}:${port}`;
      });

      return `Redis 实例列表（共 ${total} 个，当前显示 ${instances.length} 个）:\n${lines.join("\n")}`;
    } catch (err: any) {
      return `列出 Redis 实例失败: ${err.message ?? err}`;
    }
  });

  // 获取 Redis 实例详情
  handlers.set("get_redis_instance", async (ctx) => {
    const instanceId: string = ctx.args.instance_id ?? "";

    try {
      const res = await clients.redis.DescribeInstances({
        InstanceId: instanceId,
      });

      const instances = res.InstanceSet ?? [];
      if (instances.length === 0) {
        return `未找到 Redis 实例: ${instanceId}`;
      }

      const inst = instances[0] as any;
      const lines = [
        `实例: ${inst.InstanceName ?? "未命名"} (${inst.InstanceId})`,
        `状态: ${inst.Status !== undefined ? String(inst.Status) : "未知"}`,
        `引擎: ${inst.Engine ?? "未知"} | 版本: ${inst.ProductType ?? "未知"}`,
        `容量: ${inst.Size ?? 0} MB`,
        `内网地址: ${inst.WanIp ?? "无"}:${inst.Port ?? ""}`,
        `可用区: ${inst.ZoneId ?? "未知"}`,
        `创建时间: ${inst.Createtime ?? "未知"}`,
        `到期时间: ${inst.DeadlineTime ?? "未知"}`,
        `计费模式: ${inst.BillingMode !== undefined ? String(inst.BillingMode) : "未知"}`,
        `已用容量: ${inst.UsedCapacity ?? 0} MB`,
        `连接数: ${inst.ClientCount ?? 0}`,
      ];

      return lines.join("\n");
    } catch (err: any) {
      return `获取 Redis 实例详情失败: ${err.message ?? err}`;
    }
  });

  // 列出 MongoDB 实例
  handlers.set("list_mongodb_instances", async (ctx) => {
    const limit = (ctx.args.limit as number) ?? 20;
    const offset = (ctx.args.offset as number) ?? 0;

    try {
      const res = await clients.mongodb.DescribeDBInstances({
        Limit: limit,
        Offset: offset,
      });

      const instances = res.InstanceDetails ?? [];
      const total = res.TotalCount ?? 0;

      if (instances.length === 0) {
        return "暂无 MongoDB 实例";
      }

      const lines = instances.map((inst: any, i: number) => {
        const name = inst.InstanceName ?? "未命名";
        const id = inst.InstanceId ?? "";
        const status = inst.Status !== undefined ? String(inst.Status) : "未知";
        const clusterType = inst.ClusterType ?? "未知";
        const vip = inst.Vip ?? "无";
        const vport = inst.Vport ?? "";
        return `${offset + i + 1}. ${name} (${id})\n   状态: ${status} | 集群类型: ${clusterType}\n   内网地址: ${vip}:${vport}`;
      });

      return `MongoDB 实例列表（共 ${total} 个，当前显示 ${instances.length} 个）:\n${lines.join("\n")}`;
    } catch (err: any) {
      return `列出 MongoDB 实例失败: ${err.message ?? err}`;
    }
  });

  // 重启 MySQL 实例
  handlers.set("restart_mysql", async (ctx) => {
    const instanceId: string = ctx.args.instance_id ?? "";

    if (!instanceId) {
      return "请提供要重启的 MySQL 实例 ID";
    }

    try {
      const res = await clients.cdb.RestartDBInstances({
        InstanceIds: [instanceId],
      });

      const asyncRequestId = (res as any).AsyncRequestId ?? "";
      return `MySQL 实例 ${instanceId} 重启请求已提交${asyncRequestId ? `\n异步任务 ID: ${asyncRequestId}` : ""}`;
    } catch (err: any) {
      return `重启 MySQL 实例失败: ${err.message ?? err}`;
    }
  });

  return handlers;
}

/** 数据库 Tool 模块 */
export const databaseTools: ToolModule = { definitions, createHandlers };
