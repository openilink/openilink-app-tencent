/**
 * CVM 云服务器 Tools
 * 提供 CVM 实例的列出、查看、启动、停止、重启、创建、销毁、改名、重置密码能力
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
  {
    name: "list_images",
    description: "列出可用镜像",
    command: "list_images",
    parameters: {
      type: "object",
      properties: {
        image_type: {
          type: "string",
          description: "镜像类型: PUBLIC_IMAGE（公共）、PRIVATE_IMAGE（自定义）、SHARED_IMAGE（共享），默认 PRIVATE_IMAGE",
        },
        limit: { type: "number", description: "返回数量，默认 20" },
        offset: { type: "number", description: "偏移量，默认 0" },
      },
    },
  },
  {
    name: "list_key_pairs",
    description: "列出 SSH 密钥对",
    command: "list_key_pairs",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "返回数量，默认 20" },
        offset: { type: "number", description: "偏移量，默认 0" },
      },
    },
  },
  {
    name: "list_disks",
    description: "列出实例的磁盘信息（系统盘和数据盘）",
    command: "list_disks",
    parameters: {
      type: "object",
      properties: {
        instance_id: { type: "string", description: "实例 ID，如 ins-xxxxxxxx" },
      },
      required: ["instance_id"],
    },
  },
  {
    name: "create_instance",
    description: "创建 CVM 实例（参数较复杂，建议通过控制台创建。此处仅提供基础快速创建）",
    command: "create_instance",
    parameters: {
      type: "object",
      properties: {
        zone: { type: "string", description: "可用区，如 ap-guangzhou-3" },
        instance_type: { type: "string", description: "实例机型，如 S5.MEDIUM2" },
        image_id: { type: "string", description: "镜像 ID，如 img-xxxxxxxx" },
        instance_name: { type: "string", description: "实例名称" },
        instance_charge_type: {
          type: "string",
          description: "计费模式: POSTPAID_BY_HOUR（按量）或 PREPAID（包年包月），默认 POSTPAID_BY_HOUR",
        },
        system_disk_type: { type: "string", description: "系统盘类型，如 CLOUD_PREMIUM、CLOUD_SSD，默认 CLOUD_PREMIUM" },
        system_disk_size: { type: "number", description: "系统盘大小(GB)，默认 50" },
        vpc_id: { type: "string", description: "VPC ID" },
        subnet_id: { type: "string", description: "子网 ID" },
        security_group_ids: {
          type: "array",
          items: { type: "string" },
          description: "安全组 ID 列表",
        },
        password: { type: "string", description: "实例登录密码" },
      },
      required: ["zone", "instance_type", "image_id"],
    },
  },
  {
    name: "terminate_instance",
    description: "退还/销毁 CVM 实例（按量计费立即销毁，包年包月退还）",
    command: "terminate_instance",
    parameters: {
      type: "object",
      properties: {
        instance_ids: {
          type: "array",
          items: { type: "string" },
          description: "要销毁的实例 ID 列表",
        },
      },
      required: ["instance_ids"],
    },
  },
  {
    name: "modify_instance_name",
    description: "修改 CVM 实例名称",
    command: "modify_instance_name",
    parameters: {
      type: "object",
      properties: {
        instance_id: { type: "string", description: "实例 ID" },
        instance_name: { type: "string", description: "新的实例名称" },
      },
      required: ["instance_id", "instance_name"],
    },
  },
  {
    name: "reset_instance_password",
    description: "重置 CVM 实例密码（需要实例处于关机状态或操作后重启生效）",
    command: "reset_instance_password",
    parameters: {
      type: "object",
      properties: {
        instance_ids: {
          type: "array",
          items: { type: "string" },
          description: "实例 ID 列表",
        },
        password: { type: "string", description: "新密码" },
        username: { type: "string", description: "用户名，Linux 默认 root，Windows 默认 Administrator" },
        force_stop: { type: "boolean", description: "是否强制关机后重置，默认 false" },
      },
      required: ["instance_ids", "password"],
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

  // 列出镜像
  handlers.set("list_images", async (ctx) => {
    const imageType: string = ctx.args.image_type ?? "PRIVATE_IMAGE";
    const limit = (ctx.args.limit as number) ?? 20;
    const offset = (ctx.args.offset as number) ?? 0;

    try {
      const res = await clients.cvm.DescribeImages({
        Filters: [
          { Name: "image-type", Values: [imageType] },
        ],
        Limit: limit,
        Offset: offset,
      });

      const images = res.ImageSet ?? [];
      const total = res.TotalCount ?? 0;

      if (images.length === 0) {
        return "暂无镜像";
      }

      const lines = images.map((img: any, i: number) => {
        const name = img.ImageName ?? "未命名";
        const id = img.ImageId ?? "";
        const state = img.ImageState ?? "未知";
        const size = img.ImageSize ?? 0;
        const os = img.OsName ?? "未知";
        return `${offset + i + 1}. ${name} (${id})\n   状态: ${state} | 大小: ${size}GB | 系统: ${os}`;
      });

      return `镜像列表（共 ${total} 个，当前显示 ${images.length} 个）:\n${lines.join("\n")}`;
    } catch (err: any) {
      return `列出镜像失败: ${err.message ?? err}`;
    }
  });

  // 列出密钥对
  handlers.set("list_key_pairs", async (ctx) => {
    const limit = (ctx.args.limit as number) ?? 20;
    const offset = (ctx.args.offset as number) ?? 0;

    try {
      const res = await clients.cvm.DescribeKeyPairs({
        Limit: limit,
        Offset: offset,
      });

      const keyPairs = res.KeyPairSet ?? [];
      const total = res.TotalCount ?? 0;

      if (keyPairs.length === 0) {
        return "暂无密钥对";
      }

      const lines = keyPairs.map((kp: any, i: number) => {
        const name = kp.KeyName ?? "未命名";
        const id = kp.KeyId ?? "";
        const bindCount = kp.AssociatedInstanceIds?.length ?? 0;
        const createTime = kp.CreatedTime ?? "未知";
        return `${offset + i + 1}. ${name} (${id})\n   绑定实例数: ${bindCount} | 创建时间: ${createTime}`;
      });

      return `密钥对列表（共 ${total} 个，当前显示 ${keyPairs.length} 个）:\n${lines.join("\n")}`;
    } catch (err: any) {
      return `列出密钥对失败: ${err.message ?? err}`;
    }
  });

  // 列出实例磁盘信息
  handlers.set("list_disks", async (ctx) => {
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
      const lines: string[] = [`实例 ${inst.InstanceName ?? "未命名"} (${instanceId}) 磁盘信息:`];

      // 系统盘
      const sysDisk = inst.SystemDisk;
      if (sysDisk) {
        lines.push(`\n系统盘:`);
        lines.push(`  类型: ${sysDisk.DiskType ?? "未知"} | 大小: ${sysDisk.DiskSize ?? 0}GB | ID: ${sysDisk.DiskId ?? "无"}`);
      }

      // 数据盘
      const dataDisks = inst.DataDisks ?? [];
      if (dataDisks.length > 0) {
        lines.push(`\n数据盘（${dataDisks.length} 块）:`);
        dataDisks.forEach((disk: any, i: number) => {
          lines.push(`  ${i + 1}. 类型: ${disk.DiskType ?? "未知"} | 大小: ${disk.DiskSize ?? 0}GB | ID: ${disk.DiskId ?? "无"}`);
        });
      } else {
        lines.push(`\n无数据盘`);
      }

      return lines.join("\n");
    } catch (err: any) {
      return `获取磁盘信息失败: ${err.message ?? err}`;
    }
  });

  // 创建 CVM 实例
  handlers.set("create_instance", async (ctx) => {
    const zone: string = ctx.args.zone ?? "";
    const instanceType: string = ctx.args.instance_type ?? "";
    const imageId: string = ctx.args.image_id ?? "";
    const instanceName: string = ctx.args.instance_name ?? "未命名实例";
    const chargeType: string = ctx.args.instance_charge_type ?? "POSTPAID_BY_HOUR";
    const sysDiskType: string = ctx.args.system_disk_type ?? "CLOUD_PREMIUM";
    const sysDiskSize = (ctx.args.system_disk_size as number) ?? 50;
    const vpcId: string = ctx.args.vpc_id ?? "";
    const subnetId: string = ctx.args.subnet_id ?? "";
    const securityGroupIds: string[] = ctx.args.security_group_ids ?? [];
    const password: string = ctx.args.password ?? "";

    try {
      const params: any = {
        Placement: { Zone: zone },
        InstanceType: instanceType,
        ImageId: imageId,
        InstanceName: instanceName,
        InstanceChargeType: chargeType,
        SystemDisk: { DiskType: sysDiskType, DiskSize: sysDiskSize },
      };

      if (vpcId) {
        params.VirtualPrivateCloud = {
          VpcId: vpcId,
          SubnetId: subnetId,
        };
      }

      if (securityGroupIds.length > 0) {
        params.SecurityGroupIds = securityGroupIds;
      }

      if (password) {
        params.LoginSettings = { Password: password };
      }

      const res = await clients.cvm.RunInstances(params);
      const instanceIds = res.InstanceIdSet ?? [];
      return `CVM 实例创建成功!\n实例 ID: ${instanceIds.join(", ")}\n名称: ${instanceName}\n可用区: ${zone}\n机型: ${instanceType}\n\n提示: 创建 CVM 涉及大量参数（网络、磁盘、镜像、安全组等），建议在腾讯云控制台进行复杂配置。`;
    } catch (err: any) {
      return `创建 CVM 实例失败: ${err.message ?? err}`;
    }
  });

  // 退还/销毁 CVM 实例
  handlers.set("terminate_instance", async (ctx) => {
    const instanceIds: string[] = ctx.args.instance_ids ?? [];

    if (instanceIds.length === 0) {
      return "请提供要销毁的实例 ID 列表";
    }

    try {
      await clients.cvm.TerminateInstances({
        InstanceIds: instanceIds,
      });

      return `已发起销毁请求，实例: ${instanceIds.join(", ")}\n按量计费实例将立即销毁，包年包月实例将退还。`;
    } catch (err: any) {
      return `销毁实例失败: ${err.message ?? err}`;
    }
  });

  // 修改 CVM 实例名称
  handlers.set("modify_instance_name", async (ctx) => {
    const instanceId: string = ctx.args.instance_id ?? "";
    const instanceName: string = ctx.args.instance_name ?? "";

    try {
      await clients.cvm.ModifyInstancesAttribute({
        InstanceIds: [instanceId],
        InstanceName: instanceName,
      });

      return `实例 ${instanceId} 名称已修改为: ${instanceName}`;
    } catch (err: any) {
      return `修改实例名称失败: ${err.message ?? err}`;
    }
  });

  // 重置 CVM 实例密码
  handlers.set("reset_instance_password", async (ctx) => {
    const instanceIds: string[] = ctx.args.instance_ids ?? [];
    const password: string = ctx.args.password ?? "";
    const username: string = ctx.args.username ?? "";
    const forceStop: boolean = ctx.args.force_stop ?? false;

    if (instanceIds.length === 0) {
      return "请提供要重置密码的实例 ID 列表";
    }

    try {
      const params: any = {
        InstanceIds: instanceIds,
        Password: password,
        ForceStop: forceStop,
      };

      if (username) {
        params.UserName = username;
      }

      await clients.cvm.ResetInstancesPassword(params);

      return `已发起密码重置请求，实例: ${instanceIds.join(", ")}\n${forceStop ? "将强制关机后重置密码" : "请确保实例已关机，或在重启后生效"}`;
    } catch (err: any) {
      return `重置密码失败: ${err.message ?? err}`;
    }
  });

  return handlers;
}

/** CVM Tool 模块 */
export const cvmTools: ToolModule = { definitions, createHandlers };
