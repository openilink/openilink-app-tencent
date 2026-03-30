/**
 * tools/billing.ts 测试
 * Mock 腾讯云客户端验证计费工具的 handler 和定义
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { billingTools } from "../../src/tools/billing.js";
import type { ToolContext } from "../../src/hub/types.js";

/** 创建模拟的腾讯云客户端集合 */
function createMockClients() {
  return {
    cvm: {},
    dnspod: {},
    cdn: {},
    ssl: {},
    clb: {},
    billing: {
      DescribeAccountBalance: vi.fn().mockResolvedValue({
        Balance: 10050,
        RealBalance: 8000,
        CashAccountBalance: 2050,
      }),
      DescribeBillList: vi.fn().mockResolvedValue({
        Total: 1,
        TransactionList: [
          {
            ActionType: "扣费",
            Amount: -500,
            Balance: 9550,
            Detail: "CVM 按量计费",
            Time: "2024-01-15 10:00:00",
          },
        ],
      }),
      DescribeBillSummaryByProduct: vi.fn().mockResolvedValue({
        Ready: 1,
        SummaryTotal: { RealTotalCost: "150.00" },
        SummaryOverview: [
          {
            BusinessCodeName: "云服务器CVM",
            RealTotalCost: "100.00",
            CashPayAmount: "80.00",
            VoucherPayAmount: "20.00",
          },
          {
            BusinessCodeName: "对象存储COS",
            RealTotalCost: "50.00",
            CashPayAmount: "50.00",
            VoucherPayAmount: "0.00",
          },
        ],
      }),
    },
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

describe("billingTools", () => {
  describe("tool definitions 结构", () => {
    it("应包含 3 个计费相关工具定义", () => {
      const { definitions } = billingTools;
      expect(definitions).toHaveLength(3);

      const names = definitions.map((d) => d.name);
      expect(names).toContain("get_balance");
      expect(names).toContain("list_bills");
      expect(names).toContain("get_cost_summary");
    });

    it("list_bills 应要求 month 为必填", () => {
      const billsDef = billingTools.definitions.find((d) => d.name === "list_bills");
      expect(billsDef?.parameters?.required).toContain("month");
    });

    it("get_cost_summary 应要求 month 为必填", () => {
      const summaryDef = billingTools.definitions.find((d) => d.name === "get_cost_summary");
      expect(summaryDef?.parameters?.required).toContain("month");
    });
  });

  describe("createHandlers", () => {
    let clients: ReturnType<typeof createMockClients>;
    let handlers: Map<string, any>;

    beforeEach(() => {
      clients = createMockClients();
      handlers = billingTools.createHandlers(clients);
    });

    describe("get_balance", () => {
      it("应返回格式化的余额信息", async () => {
        const handler = handlers.get("get_balance")!;
        const result = await handler(makeCtx({}));

        expect(result).toContain("腾讯云账户余额");
        expect(result).toContain("¥");
      });

      it("API 出错时应返回错误消息", async () => {
        clients.billing.DescribeAccountBalance.mockRejectedValueOnce(new Error("无权限"));

        const handler = handlers.get("get_balance")!;
        const result = await handler(makeCtx({}));
        expect(result).toContain("查询余额失败");
        expect(result).toContain("无权限");
      });
    });

    describe("list_bills", () => {
      it("应返回格式化的账单列表", async () => {
        const handler = handlers.get("list_bills")!;
        const result = await handler(makeCtx({ month: "2024-01" }));

        expect(result).toContain("2024-01");
        expect(result).toContain("账单记录");
        expect(result).toContain("扣费");
      });

      it("无账单时应返回提示", async () => {
        clients.billing.DescribeBillList.mockResolvedValueOnce({
          Total: 0,
          TransactionList: [],
        });

        const handler = handlers.get("list_bills")!;
        const result = await handler(makeCtx({ month: "2024-06" }));
        expect(result).toContain("暂无账单记录");
      });
    });

    describe("get_cost_summary", () => {
      it("应返回按产品汇总的费用", async () => {
        const handler = handlers.get("get_cost_summary")!;
        const result = await handler(makeCtx({ month: "2024-01" }));

        expect(result).toContain("费用概览");
        expect(result).toContain("云服务器CVM");
        expect(result).toContain("对象存储COS");
        expect(result).toContain("150.00");
      });

      it("数据未生成时应返回提示", async () => {
        clients.billing.DescribeBillSummaryByProduct.mockResolvedValueOnce({
          Ready: 0,
        });

        const handler = handlers.get("get_cost_summary")!;
        const result = await handler(makeCtx({ month: "2024-12" }));
        expect(result).toContain("尚未生成");
      });
    });
  });
});
