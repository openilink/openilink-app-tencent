/**
 * 安全组 Tools
 * 提供安全组列出、查看规则、创建安全组、添加/删除规则能力（通过 VPC API）
 */
import type { ToolDefinition, ToolHandler } from "../hub/types.js";
import type { TencentClients } from "../tencent/client.js";
import type { ToolModule } from "./index.js";

/** 安全组模块 tool 定义列表 */
const definitions: ToolDefinition[] = [
  {
    name: "list_security_groups",
    description: "列出安全组",
    command: "list_security_groups",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "返回数量，默认 20" },
        offset: { type: "number", description: "偏移量，默认 0" },
      },
    },
  },
  {
    name: "get_security_group_rules",
    description: "获取安全组的入站和出站规则",
    command: "get_security_group_rules",
    parameters: {
      type: "object",
      properties: {
        security_group_id: { type: "string", description: "安全组 ID，如 sg-xxxxxxxx" },
      },
      required: ["security_group_id"],
    },
  },
  {
    name: "create_security_group",
    description: "创建安全组",
    command: "create_security_group",
    parameters: {
      type: "object",
      properties: {
        group_name: { type: "string", description: "安全组名称" },
        group_description: { type: "string", description: "安全组描述" },
      },
      required: ["group_name"],
    },
  },
  {
    name: "add_ingress_rule",
    description: "添加安全组入站规则",
    command: "add_ingress_rule",
    parameters: {
      type: "object",
      properties: {
        security_group_id: { type: "string", description: "安全组 ID" },
        protocol: { type: "string", description: "协议: TCP、UDP、ICMP、ICMPv6、ALL" },
        port: { type: "string", description: "端口，如 80、80-443、ALL" },
        cidr_block: { type: "string", description: "来源 CIDR，如 0.0.0.0/0" },
        action: { type: "string", description: "策略: ACCEPT（放通）或 DROP（拒绝），默认 ACCEPT" },
        description: { type: "string", description: "规则描述" },
      },
      required: ["security_group_id", "protocol", "port", "cidr_block"],
    },
  },
  {
    name: "delete_ingress_rule",
    description: "删除安全组入站规则",
    command: "delete_ingress_rule",
    parameters: {
      type: "object",
      properties: {
        security_group_id: { type: "string", description: "安全组 ID" },
        protocol: { type: "string", description: "协议: TCP、UDP、ICMP、ICMPv6、ALL" },
        port: { type: "string", description: "端口，如 80、80-443、ALL" },
        cidr_block: { type: "string", description: "来源 CIDR，如 0.0.0.0/0" },
        action: { type: "string", description: "策略: ACCEPT 或 DROP" },
      },
      required: ["security_group_id", "protocol", "port", "cidr_block", "action"],
    },
  },
];

/** 创建安全组模块的 handler 映射 */
function createHandlers(clients: TencentClients): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  // 列出安全组
  handlers.set("list_security_groups", async (ctx) => {
    const limit = (ctx.args.limit as number) ?? 20;
    const offset = (ctx.args.offset as number) ?? 0;

    try {
      const res = await clients.vpc.DescribeSecurityGroups({
        Limit: String(limit),
        Offset: String(offset),
      });

      const groups = res.SecurityGroupSet ?? [];
      const total = res.TotalCount ?? 0;

      if (groups.length === 0) {
        return "暂无安全组";
      }

      const lines = groups.map((g: any, i: number) => {
        const name = g.SecurityGroupName ?? "未命名";
        const id = g.SecurityGroupId ?? "";
        const desc = g.SecurityGroupDesc ?? "无描述";
        return `${offset + i + 1}. ${name} (${id})\n   描述: ${desc}`;
      });

      return `安全组列表（共 ${total} 个，当前显示 ${groups.length} 个）:\n${lines.join("\n")}`;
    } catch (err: any) {
      return `列出安全组失败: ${err.message ?? err}`;
    }
  });

  // 获取安全组规则
  handlers.set("get_security_group_rules", async (ctx) => {
    const securityGroupId: string = ctx.args.security_group_id ?? "";

    try {
      const res = await clients.vpc.DescribeSecurityGroupPolicies({
        SecurityGroupId: securityGroupId,
      });

      const policySet = res.SecurityGroupPolicySet as any;
      if (!policySet) {
        return `未找到安全组 ${securityGroupId} 的规则`;
      }

      const result: string[] = [`安全组 ${securityGroupId} 的规则:`];

      // 入站规则
      const ingress = policySet.Ingress ?? [];
      result.push(`\n--- 入站规则（${ingress.length} 条）---`);
      for (let i = 0; i < ingress.length; i++) {
        const rule = ingress[i];
        const protocol = rule.Protocol ?? "ALL";
        const port = rule.Port ?? "ALL";
        const cidr = rule.CidrBlock ?? rule.Ipv6CidrBlock ?? "ALL";
        const action = rule.Action ?? "ACCEPT";
        const desc = rule.PolicyDescription ?? "";
        result.push(`${i + 1}. ${action} ${protocol}:${port} ← ${cidr}${desc ? ` (${desc})` : ""}`);
      }

      // 出站规则
      const egress = policySet.Egress ?? [];
      result.push(`\n--- 出站规则（${egress.length} 条）---`);
      for (let i = 0; i < egress.length; i++) {
        const rule = egress[i];
        const protocol = rule.Protocol ?? "ALL";
        const port = rule.Port ?? "ALL";
        const cidr = rule.CidrBlock ?? rule.Ipv6CidrBlock ?? "ALL";
        const action = rule.Action ?? "ACCEPT";
        const desc = rule.PolicyDescription ?? "";
        result.push(`${i + 1}. ${action} ${protocol}:${port} → ${cidr}${desc ? ` (${desc})` : ""}`);
      }

      return result.join("\n");
    } catch (err: any) {
      return `获取安全组规则失败: ${err.message ?? err}`;
    }
  });

  // 创建安全组
  handlers.set("create_security_group", async (ctx) => {
    const groupName: string = ctx.args.group_name ?? "";
    const groupDescription: string = ctx.args.group_description ?? "";

    try {
      const res = await clients.vpc.CreateSecurityGroup({
        GroupName: groupName,
        GroupDescription: groupDescription,
      });

      const sg = res.SecurityGroup as any;
      const sgId = sg?.SecurityGroupId ?? "未知";
      return `安全组创建成功!\nID: ${sgId}\n名称: ${groupName}${groupDescription ? `\n描述: ${groupDescription}` : ""}`;
    } catch (err: any) {
      return `创建安全组失败: ${err.message ?? err}`;
    }
  });

  // 添加安全组入站规则
  handlers.set("add_ingress_rule", async (ctx) => {
    const securityGroupId: string = ctx.args.security_group_id ?? "";
    const protocol: string = ctx.args.protocol ?? "";
    const port: string = ctx.args.port ?? "";
    const cidrBlock: string = ctx.args.cidr_block ?? "";
    const action: string = ctx.args.action ?? "ACCEPT";
    const description: string = ctx.args.description ?? "";

    try {
      const policy: any = {
        Protocol: protocol,
        Port: port,
        CidrBlock: cidrBlock,
        Action: action,
      };

      if (description) {
        policy.PolicyDescription = description;
      }

      await clients.vpc.CreateSecurityGroupPolicies({
        SecurityGroupId: securityGroupId,
        SecurityGroupPolicySet: {
          Ingress: [policy],
        },
      });

      return `入站规则添加成功!\n安全组: ${securityGroupId}\n${action} ${protocol}:${port} ← ${cidrBlock}${description ? ` (${description})` : ""}`;
    } catch (err: any) {
      return `添加入站规则失败: ${err.message ?? err}`;
    }
  });

  // 删除安全组入站规则
  handlers.set("delete_ingress_rule", async (ctx) => {
    const securityGroupId: string = ctx.args.security_group_id ?? "";
    const protocol: string = ctx.args.protocol ?? "";
    const port: string = ctx.args.port ?? "";
    const cidrBlock: string = ctx.args.cidr_block ?? "";
    const action: string = ctx.args.action ?? "";

    try {
      await clients.vpc.DeleteSecurityGroupPolicies({
        SecurityGroupId: securityGroupId,
        SecurityGroupPolicySet: {
          Ingress: [
            {
              Protocol: protocol,
              Port: port,
              CidrBlock: cidrBlock,
              Action: action,
            },
          ],
        },
      });

      return `入站规则已删除!\n安全组: ${securityGroupId}\n${action} ${protocol}:${port} ← ${cidrBlock}`;
    } catch (err: any) {
      return `删除入站规则失败: ${err.message ?? err}`;
    }
  });

  return handlers;
}

/** 安全组 Tool 模块 */
export const securityTools: ToolModule = { definitions, createHandlers };
