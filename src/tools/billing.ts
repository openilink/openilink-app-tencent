/**
 * 计费 Tools
 * 提供余额查询、账单列表和费用概览能力
 */
import type { ToolDefinition, ToolHandler } from "../hub/types.js";
import type { TencentClients } from "../tencent/client.js";
import type { ToolModule } from "./index.js";

/** 计费模块 tool 定义列表 */
const definitions: ToolDefinition[] = [
  {
    name: "get_balance",
    description: "查询腾讯云账户余额",
    command: "get_balance",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_bills",
    description: "查询账单明细列表",
    command: "list_bills",
    parameters: {
      type: "object",
      properties: {
        month: {
          type: "string",
          description: "账单月份，格式 YYYY-MM，如 2024-01",
        },
        limit: { type: "number", description: "返回数量，默认 20" },
        offset: { type: "number", description: "偏移量，默认 0" },
      },
      required: ["month"],
    },
  },
  {
    name: "get_cost_summary",
    description: "按产品汇总费用概览",
    command: "get_cost_summary",
    parameters: {
      type: "object",
      properties: {
        month: {
          type: "string",
          description: "账单月份，格式 YYYY-MM，如 2024-01",
        },
      },
      required: ["month"],
    },
  },
];

/** 创建计费模块的 handler 映射 */
function createHandlers(clients: TencentClients): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  // 查询余额
  handlers.set("get_balance", async () => {
    try {
      const res = await clients.billing.DescribeAccountBalance({});

      const balance = res.Balance !== undefined ? (Number(res.Balance) / 100).toFixed(2) : "未知";
      const cashAccount = res.CashAccountBalance !== undefined ? (Number(res.CashAccountBalance) / 100).toFixed(2) : "未知";
      const realBalance = res.RealBalance !== undefined ? (Number(res.RealBalance) / 100).toFixed(2) : "未知";

      const lines = [
        `腾讯云账户余额`,
        `可用余额: ¥${balance}`,
        `现金账户余额: ¥${cashAccount}`,
        `真实可用余额: ¥${realBalance}`,
      ];

      return lines.join("\n");
    } catch (err: any) {
      return `查询余额失败: ${err.message ?? err}`;
    }
  });

  // 查询账单列表
  handlers.set("list_bills", async (ctx) => {
    const month: string = ctx.args.month ?? "";
    const limit = (ctx.args.limit as number) ?? 20;
    const offset = (ctx.args.offset as number) ?? 0;

    try {
      // DescribeBillList 需要时间范围格式: yyyy-MM-dd HH:mm:ss
      const startTime = `${month}-01 00:00:00`;
      // 计算月末最后一天
      const [y, m] = month.split("-").map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const endTime = `${month}-${String(lastDay).padStart(2, "0")} 23:59:59`;

      const res = await clients.billing.DescribeBillList({
        StartTime: startTime,
        EndTime: endTime,
        Limit: limit,
        Offset: offset,
      });

      const bills = res.TransactionList ?? [];
      const total = res.Total ?? 0;

      if (bills.length === 0) {
        return `${month} 暂无账单记录`;
      }

      const lines = bills.map((b: any, i: number) => {
        const actionType = b.ActionType ?? "";
        const amount = b.Amount !== undefined ? (Number(b.Amount) / 100).toFixed(2) : "0.00";
        const balance = b.Balance !== undefined ? (Number(b.Balance) / 100).toFixed(2) : "0.00";
        const detail = b.Detail ?? "";
        const time = b.Time ?? "";
        return `${offset + i + 1}. ${actionType} ¥${amount}\n   ${detail}\n   时间: ${time} | 余额: ¥${balance}`;
      });

      return `${month} 账单记录（共 ${total} 条，当前显示 ${bills.length} 条）:\n${lines.join("\n")}`;
    } catch (err: any) {
      return `查询账单失败: ${err.message ?? err}`;
    }
  });

  // 按产品汇总费用
  handlers.set("get_cost_summary", async (ctx) => {
    const month: string = ctx.args.month ?? "";

    try {
      const res = await clients.billing.DescribeBillSummaryByProduct({
        BeginTime: month,
        EndTime: month,
      });

      const ready = res.Ready ?? 0;
      if (!ready) {
        return `${month} 的费用汇总数据尚未生成`;
      }

      const items = res.SummaryOverview ?? [];

      if (items.length === 0) {
        return `${month} 无费用产生`;
      }

      const lines = items.map((item: any, i: number) => {
        const name = item.BusinessCodeName ?? "未知";
        const realCost = item.RealTotalCost ?? "0";
        const cashPay = item.CashPayAmount ?? "0";
        const voucherPay = item.VoucherPayAmount ?? "0";
        return `${i + 1}. ${name}\n   实际费用: ¥${realCost} | 现金: ¥${cashPay} | 代金券: ¥${voucherPay}`;
      });

      const totalCost = res.SummaryTotal?.RealTotalCost ?? "0";
      return `${month} 费用概览（总计: ¥${totalCost}）:\n${lines.join("\n")}`;
    } catch (err: any) {
      return `查询费用概览失败: ${err.message ?? err}`;
    }
  });

  return handlers;
}

/** 计费 Tool 模块 */
export const billingTools: ToolModule = { definitions, createHandlers };
