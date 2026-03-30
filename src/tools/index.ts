/**
 * Tool 注册中心
 * 收集所有 tool 模块的定义和 handler，统一注册到 Hub
 */
import { createClientsProxy, type TencentClients } from "../tencent/client.js";
import type { ToolDefinition, ToolHandler } from "../hub/types.js";

/** Tool 模块接口 */
export interface ToolModule {
  definitions: ToolDefinition[];
  createHandlers: (clients: TencentClients) => Map<string, ToolHandler>;
}

// 导入各 tool 模块
import { cvmTools } from "./cvm.js";
import { lighthouseTools } from "./lighthouse.js";
import { dnsTools } from "./dns.js";
import { cdnTools } from "./cdn.js";
import { sslTools } from "./ssl.js";
import { clbTools } from "./clb.js";
import { billingTools } from "./billing.js";
import { securityTools } from "./security.js";
import { databaseTools } from "./database.js";
import { scfTools } from "./scf.js";
import { domainTools } from "./domain.js";

/** 所有 tool 模块列表 */
const modules: ToolModule[] = [
  cvmTools,
  lighthouseTools,
  dnsTools,
  cdnTools,
  sslTools,
  clbTools,
  billingTools,
  securityTools,
  databaseTools,
  scfTools,
  domainTools,
];

/**
 * 收集所有 tool 的定义和处理函数。
 * 使用代理对象使 handler 闭包自动委托到 getCurrentClients()，
 * 实现 per-installation 凭证隔离。
 *
 * @returns definitions: 全部 tool 定义列表, handlers: 命令名 → 处理函数映射
 */
export function collectAllTools(): {
  definitions: ToolDefinition[];
  handlers: Map<string, ToolHandler>;
} {
  const definitions: ToolDefinition[] = [];
  const handlers = new Map<string, ToolHandler>();

  // 使用代理对象，handler 内部访问 clients.xxx 时自动取当前 installation 的客户端
  const clientsProxy = createClientsProxy();

  for (const mod of modules) {
    // 收集定义
    definitions.push(...mod.definitions);

    // 收集处理函数（传入代理，实际执行时解析到当前 clients）
    const modHandlers = mod.createHandlers(clientsProxy);
    for (const [name, handler] of modHandlers) {
      if (handlers.has(name)) {
        console.warn(`[tools] 工具名称冲突: ${name}，后者将覆盖前者`);
      }
      handlers.set(name, handler);
    }
  }

  console.log(`[tools] 共注册 ${definitions.length} 个工具, ${handlers.size} 个处理函数`);
  return { definitions, handlers };
}
