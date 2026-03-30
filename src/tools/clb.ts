/**
 * CLB 负载均衡 Tools
 * 提供负载均衡器和监听器的列出、创建、删除能力
 */
import type { ToolDefinition, ToolHandler } from "../hub/types.js";
import type { TencentClients } from "../tencent/client.js";
import type { ToolModule } from "./index.js";

/** CLB 模块 tool 定义列表 */
const definitions: ToolDefinition[] = [
  {
    name: "list_load_balancers",
    description: "列出 CLB 负载均衡实例",
    command: "list_load_balancers",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "返回数量，默认 20" },
        offset: { type: "number", description: "偏移量，默认 0" },
      },
    },
  },
  {
    name: "list_listeners",
    description: "列出负载均衡器的监听器",
    command: "list_listeners",
    parameters: {
      type: "object",
      properties: {
        load_balancer_id: { type: "string", description: "负载均衡实例 ID" },
      },
      required: ["load_balancer_id"],
    },
  },
  {
    name: "create_load_balancer",
    description: "创建 CLB 负载均衡实例",
    command: "create_load_balancer",
    parameters: {
      type: "object",
      properties: {
        load_balancer_type: {
          type: "string",
          description: "类型: OPEN（公网）或 INTERNAL（内网），默认 OPEN",
        },
        load_balancer_name: { type: "string", description: "负载均衡名称" },
        vpc_id: { type: "string", description: "VPC ID（内网 CLB 必填）" },
        subnet_id: { type: "string", description: "子网 ID（内网 CLB 必填）" },
      },
    },
  },
  {
    name: "delete_load_balancer",
    description: "删除 CLB 负载均衡实例",
    command: "delete_load_balancer",
    parameters: {
      type: "object",
      properties: {
        load_balancer_ids: {
          type: "array",
          items: { type: "string" },
          description: "要删除的负载均衡实例 ID 列表",
        },
      },
      required: ["load_balancer_ids"],
    },
  },
];

/** 创建 CLB 模块的 handler 映射 */
function createHandlers(clients: TencentClients): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  // 列出负载均衡实例
  handlers.set("list_load_balancers", async (ctx) => {
    const limit = (ctx.args.limit as number) ?? 20;
    const offset = (ctx.args.offset as number) ?? 0;

    try {
      const res = await clients.clb.DescribeLoadBalancers({
        Limit: limit,
        Offset: offset,
      });

      const lbs = res.LoadBalancerSet ?? [];
      const total = res.TotalCount ?? 0;

      if (lbs.length === 0) {
        return "暂无 CLB 负载均衡实例";
      }

      const lines = lbs.map((lb: any, i: number) => {
        const name = lb.LoadBalancerName ?? "未命名";
        const id = lb.LoadBalancerId ?? "";
        const type = lb.LoadBalancerType ?? "未知";
        const vips = lb.LoadBalancerVips?.join(", ") ?? "无";
        const status = lb.Status !== undefined ? String(lb.Status) : "未知";
        return `${offset + i + 1}. ${name} (${id})\n   类型: ${type} | 状态: ${status}\n   VIP: ${vips}`;
      });

      return `CLB 负载均衡列表（共 ${total} 个，当前显示 ${lbs.length} 个）:\n${lines.join("\n")}`;
    } catch (err: any) {
      return `列出负载均衡失败: ${err.message ?? err}`;
    }
  });

  // 列出监听器
  handlers.set("list_listeners", async (ctx) => {
    const loadBalancerId: string = ctx.args.load_balancer_id ?? "";

    try {
      const res = await clients.clb.DescribeListeners({
        LoadBalancerId: loadBalancerId,
      });

      const listeners = res.Listeners ?? [];

      if (listeners.length === 0) {
        return `负载均衡 ${loadBalancerId} 暂无监听器`;
      }

      const lines = listeners.map((l: any, i: number) => {
        const name = l.ListenerName ?? "未命名";
        const id = l.ListenerId ?? "";
        const protocol = l.Protocol ?? "";
        const port = l.Port ?? "";
        return `${i + 1}. ${name} (${id})\n   协议: ${protocol} | 端口: ${port}`;
      });

      return `负载均衡 ${loadBalancerId} 的监听器列表（共 ${listeners.length} 个）:\n${lines.join("\n")}`;
    } catch (err: any) {
      return `列出监听器失败: ${err.message ?? err}`;
    }
  });

  // 创建负载均衡实例
  handlers.set("create_load_balancer", async (ctx) => {
    const loadBalancerType: string = ctx.args.load_balancer_type ?? "OPEN";
    const loadBalancerName: string = ctx.args.load_balancer_name ?? "";
    const vpcId: string = ctx.args.vpc_id ?? "";
    const subnetId: string = ctx.args.subnet_id ?? "";

    try {
      const params: any = {
        LoadBalancerType: loadBalancerType,
      };

      if (loadBalancerName) {
        params.LoadBalancerName = loadBalancerName;
      }

      if (vpcId) {
        params.VpcId = vpcId;
      }

      if (subnetId) {
        params.SubnetId = subnetId;
      }

      const res = await clients.clb.CreateLoadBalancer(params);
      const lbIds = res.LoadBalancerIds ?? [];
      return `CLB 负载均衡创建成功!\n实例 ID: ${lbIds.join(", ")}\n类型: ${loadBalancerType}${loadBalancerName ? `\n名称: ${loadBalancerName}` : ""}`;
    } catch (err: any) {
      return `创建负载均衡失败: ${err.message ?? err}`;
    }
  });

  // 删除负载均衡实例
  handlers.set("delete_load_balancer", async (ctx) => {
    const loadBalancerIds: string[] = ctx.args.load_balancer_ids ?? [];

    if (loadBalancerIds.length === 0) {
      return "请提供要删除的负载均衡实例 ID 列表";
    }

    try {
      await clients.clb.DeleteLoadBalancer({
        LoadBalancerIds: loadBalancerIds,
      });

      return `已删除负载均衡实例: ${loadBalancerIds.join(", ")}`;
    } catch (err: any) {
      return `删除负载均衡失败: ${err.message ?? err}`;
    }
  });

  return handlers;
}

/** CLB Tool 模块 */
export const clbTools: ToolModule = { definitions, createHandlers };
