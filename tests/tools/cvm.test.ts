/**
 * tools/cvm.ts 测试
 * Mock 腾讯云客户端验证 CVM 工具的 handler 和定义
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cvmTools } from "../../src/tools/cvm.js";
import type { ToolContext } from "../../src/hub/types.js";

/** 创建模拟的腾讯云客户端集合 */
function createMockClients() {
  return {
    cvm: {
      DescribeInstances: vi.fn().mockResolvedValue({
        TotalCount: 2,
        InstanceSet: [
          {
            InstanceName: "测试服务器1",
            InstanceId: "ins-aaaa1111",
            InstanceState: "RUNNING",
            InstanceType: "S5.MEDIUM2",
            PublicIpAddresses: ["1.2.3.4"],
            PrivateIpAddresses: ["10.0.0.1"],
            Placement: { Zone: "ap-guangzhou-3" },
            OsName: "Ubuntu 22.04",
            CPU: 2,
            Memory: 4,
            CreatedTime: "2024-01-01T00:00:00Z",
            ExpiredTime: "2025-01-01T00:00:00Z",
            InstanceChargeType: "PREPAID",
          },
          {
            InstanceName: "测试服务器2",
            InstanceId: "ins-bbbb2222",
            InstanceState: "STOPPED",
            InstanceType: "S5.LARGE4",
            PublicIpAddresses: [],
            PrivateIpAddresses: ["10.0.0.2"],
          },
        ],
      }),
      StartInstances: vi.fn().mockResolvedValue({}),
      StopInstances: vi.fn().mockResolvedValue({}),
      RebootInstances: vi.fn().mockResolvedValue({}),
    },
    dnspod: {},
    cdn: {},
    ssl: {},
    clb: {},
    billing: {},
    lighthouse: {},
    vpc: {},
  } as any;
}

/** 创建测试用 ToolContext */
function makeCtx(args: Record<string, any>): ToolContext {
  return {
    installationId: "inst-001",
    botId: "bot-456",
    userId: "user-001",
    traceId: "trace-001",
    args,
  };
}

describe("cvmTools", () => {
  describe("tool definitions 结构", () => {
    it("应包含 5 个 CVM 相关工具定义", () => {
      const { definitions } = cvmTools;
      expect(definitions).toHaveLength(5);

      const names = definitions.map((d) => d.name);
      expect(names).toContain("list_instances");
      expect(names).toContain("get_instance");
      expect(names).toContain("start_instances");
      expect(names).toContain("stop_instances");
      expect(names).toContain("reboot_instances");
    });

    it("每个定义应包含 name, description, command 字段", () => {
      for (const def of cvmTools.definitions) {
        expect(def.name).toBeTruthy();
        expect(def.description).toBeTruthy();
        expect(def.command).toBeTruthy();
      }
    });

    it("get_instance 应要求 instance_id 为必填", () => {
      const getDef = cvmTools.definitions.find((d) => d.name === "get_instance");
      expect(getDef?.parameters?.required).toContain("instance_id");
    });

    it("start_instances 应要求 instance_ids 为必填", () => {
      const startDef = cvmTools.definitions.find((d) => d.name === "start_instances");
      expect(startDef?.parameters?.required).toContain("instance_ids");
    });
  });

  describe("createHandlers", () => {
    let clients: ReturnType<typeof createMockClients>;
    let handlers: Map<string, any>;

    beforeEach(() => {
      clients = createMockClients();
      handlers = cvmTools.createHandlers(clients);
    });

    it("应创建与 definitions 对应的 handler", () => {
      for (const def of cvmTools.definitions) {
        expect(handlers.has(def.command)).toBe(true);
      }
    });

    describe("list_instances", () => {
      it("应返回格式化的实例列表", async () => {
        const handler = handlers.get("list_instances")!;
        const result = await handler(makeCtx({}));

        expect(clients.cvm.DescribeInstances).toHaveBeenCalledOnce();
        expect(result).toContain("CVM 实例列表");
        expect(result).toContain("测试服务器1");
        expect(result).toContain("ins-aaaa1111");
        expect(result).toContain("RUNNING");
      });

      it("无实例时应返回提示", async () => {
        clients.cvm.DescribeInstances.mockResolvedValueOnce({
          TotalCount: 0,
          InstanceSet: [],
        });

        const handler = handlers.get("list_instances")!;
        const result = await handler(makeCtx({}));
        expect(result).toContain("暂无 CVM 实例");
      });
    });

    describe("get_instance", () => {
      it("应返回实例详细信息", async () => {
        const handler = handlers.get("get_instance")!;
        const result = await handler(makeCtx({ instance_id: "ins-aaaa1111" }));

        expect(result).toContain("测试服务器1");
        expect(result).toContain("ins-aaaa1111");
        expect(result).toContain("Ubuntu 22.04");
        expect(result).toContain("2 核");
      });

      it("未找到实例时应返回提示", async () => {
        clients.cvm.DescribeInstances.mockResolvedValueOnce({
          TotalCount: 0,
          InstanceSet: [],
        });

        const handler = handlers.get("get_instance")!;
        const result = await handler(makeCtx({ instance_id: "ins-notfound" }));
        expect(result).toContain("未找到实例");
      });

      it("API 出错时应返回错误消息", async () => {
        clients.cvm.DescribeInstances.mockRejectedValueOnce(new Error("认证失败"));

        const handler = handlers.get("get_instance")!;
        const result = await handler(makeCtx({ instance_id: "ins-aaaa1111" }));
        expect(result).toContain("获取实例详情失败");
        expect(result).toContain("认证失败");
      });
    });

    describe("start_instances", () => {
      it("应成功发起启动请求", async () => {
        const handler = handlers.get("start_instances")!;
        const result = await handler(makeCtx({ instance_ids: ["ins-aaaa1111"] }));

        expect(clients.cvm.StartInstances).toHaveBeenCalledOnce();
        expect(result).toContain("已发起启动请求");
        expect(result).toContain("ins-aaaa1111");
      });

      it("空 ID 列表应返回提示", async () => {
        const handler = handlers.get("start_instances")!;
        const result = await handler(makeCtx({ instance_ids: [] }));
        expect(result).toContain("请提供要启动的实例 ID 列表");
      });
    });

    describe("stop_instances", () => {
      it("应成功发起停止请求", async () => {
        const handler = handlers.get("stop_instances")!;
        const result = await handler(makeCtx({ instance_ids: ["ins-aaaa1111"] }));

        expect(clients.cvm.StopInstances).toHaveBeenCalledOnce();
        expect(result).toContain("已发起停止请求");
      });
    });

    describe("reboot_instances", () => {
      it("应成功发起重启请求", async () => {
        const handler = handlers.get("reboot_instances")!;
        const result = await handler(makeCtx({ instance_ids: ["ins-aaaa1111", "ins-bbbb2222"] }));

        expect(clients.cvm.RebootInstances).toHaveBeenCalledOnce();
        expect(result).toContain("已发起重启请求");
        expect(result).toContain("ins-aaaa1111");
      });

      it("API 出错时应返回错误消息", async () => {
        clients.cvm.RebootInstances.mockRejectedValueOnce(new Error("操作频率超限"));

        const handler = handlers.get("reboot_instances")!;
        const result = await handler(makeCtx({ instance_ids: ["ins-aaaa1111"] }));
        expect(result).toContain("重启实例失败");
        expect(result).toContain("操作频率超限");
      });
    });
  });
});
