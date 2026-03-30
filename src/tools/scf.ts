/**
 * SCF 云函数 Tools
 * 提供云函数的列出、查看详情、调用和删除能力
 */
import type { ToolDefinition, ToolHandler } from "../hub/types.js";
import type { TencentClients } from "../tencent/client.js";
import type { ToolModule } from "./index.js";

/** SCF 模块 tool 定义列表 */
const definitions: ToolDefinition[] = [
  {
    name: "list_functions",
    description: "列出云函数",
    command: "list_functions",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "返回数量，默认 20" },
        offset: { type: "number", description: "偏移量，默认 0" },
        namespace: { type: "string", description: "命名空间，默认 default" },
      },
    },
  },
  {
    name: "get_function",
    description: "获取指定云函数的详细信息",
    command: "get_function",
    parameters: {
      type: "object",
      properties: {
        function_name: { type: "string", description: "函数名称" },
        namespace: { type: "string", description: "命名空间，默认 default" },
      },
      required: ["function_name"],
    },
  },
  {
    name: "invoke_function",
    description: "调用云函数",
    command: "invoke_function",
    parameters: {
      type: "object",
      properties: {
        function_name: { type: "string", description: "函数名称" },
        invocation_type: {
          type: "string",
          description: "调用类型: RequestResponse（同步）或 Event（异步），默认 RequestResponse",
        },
        payload: { type: "string", description: "函数入参 JSON 字符串" },
        namespace: { type: "string", description: "命名空间，默认 default" },
      },
      required: ["function_name"],
    },
  },
  {
    name: "delete_function",
    description: "删除云函数",
    command: "delete_function",
    parameters: {
      type: "object",
      properties: {
        function_name: { type: "string", description: "函数名称" },
        namespace: { type: "string", description: "命名空间，默认 default" },
      },
      required: ["function_name"],
    },
  },
];

/** 创建 SCF 模块的 handler 映射 */
function createHandlers(clients: TencentClients): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  // 列出云函数
  handlers.set("list_functions", async (ctx) => {
    const limit = (ctx.args.limit as number) ?? 20;
    const offset = (ctx.args.offset as number) ?? 0;
    const namespace: string = ctx.args.namespace ?? "default";

    try {
      const res = await clients.scf.ListFunctions({
        Limit: limit,
        Offset: offset,
        Namespace: namespace,
      });

      const functions = res.Functions ?? [];
      const total = res.TotalCount ?? 0;

      if (functions.length === 0) {
        return "暂无云函数";
      }

      const lines = functions.map((fn: any, i: number) => {
        const name = fn.FunctionName ?? "未命名";
        const runtime = fn.Runtime ?? "未知";
        const status = fn.Status ?? "未知";
        const modTime = fn.ModTime ?? "未知";
        return `${offset + i + 1}. ${name}\n   运行时: ${runtime} | 状态: ${status} | 更新时间: ${modTime}`;
      });

      return `云函数列表（共 ${total} 个，当前显示 ${functions.length} 个）:\n${lines.join("\n")}`;
    } catch (err: any) {
      return `列出云函数失败: ${err.message ?? err}`;
    }
  });

  // 获取云函数详情
  handlers.set("get_function", async (ctx) => {
    const functionName: string = ctx.args.function_name ?? "";
    const namespace: string = ctx.args.namespace ?? "default";

    try {
      const res = await clients.scf.GetFunction({
        FunctionName: functionName,
        Namespace: namespace,
      });

      const lines = [
        `函数: ${res.FunctionName ?? "未知"}`,
        `状态: ${res.Status ?? "未知"}`,
        `运行时: ${res.Runtime ?? "未知"}`,
        `Handler: ${res.Handler ?? "未知"}`,
        `描述: ${res.Description ?? "无"}`,
        `内存: ${res.MemorySize ?? 0} MB | 超时: ${res.Timeout ?? 0} 秒`,
        `命名空间: ${res.Namespace ?? "default"}`,
        `创建时间: ${res.AddTime ?? "未知"}`,
        `更新时间: ${res.ModTime ?? "未知"}`,
        `代码大小: ${res.CodeSize ?? 0} 字节`,
      ];

      return lines.join("\n");
    } catch (err: any) {
      return `获取云函数详情失败: ${err.message ?? err}`;
    }
  });

  // 调用云函数
  handlers.set("invoke_function", async (ctx) => {
    const functionName: string = ctx.args.function_name ?? "";
    const invocationType: string = ctx.args.invocation_type ?? "RequestResponse";
    const payload: string = ctx.args.payload ?? "";
    const namespace: string = ctx.args.namespace ?? "default";

    try {
      const res = await clients.scf.Invoke({
        FunctionName: functionName,
        InvocationType: invocationType,
        ClientContext: payload,
        Namespace: namespace,
      });

      const result = res.Result as any;
      if (!result) {
        return `函数 ${functionName} 调用已提交`;
      }

      const lines = [
        `函数: ${functionName}`,
        `调用结果: ${result.InvokeResult === 0 ? "成功" : "失败"}`,
        `执行耗时: ${result.Duration ?? 0} ms`,
        `内存用量: ${result.MemUsage ?? 0} 字节`,
        `日志: ${result.Log ?? "无"}`,
        `返回值: ${result.RetMsg ?? "无"}`,
      ];

      return lines.join("\n");
    } catch (err: any) {
      return `调用云函数失败: ${err.message ?? err}`;
    }
  });

  // 删除云函数
  handlers.set("delete_function", async (ctx) => {
    const functionName: string = ctx.args.function_name ?? "";
    const namespace: string = ctx.args.namespace ?? "default";

    if (!functionName) {
      return "请提供要删除的函数名称";
    }

    try {
      await clients.scf.DeleteFunction({
        FunctionName: functionName,
        Namespace: namespace,
      });

      return `云函数 ${functionName} 已删除（命名空间: ${namespace}）`;
    } catch (err: any) {
      return `删除云函数失败: ${err.message ?? err}`;
    }
  });

  return handlers;
}

/** SCF Tool 模块 */
export const scfTools: ToolModule = { definitions, createHandlers };
