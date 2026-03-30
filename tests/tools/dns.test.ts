/**
 * tools/dns.ts 测试
 * Mock 腾讯云客户端验证 DNS 工具的 handler 和定义
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { dnsTools } from "../../src/tools/dns.js";
import type { ToolContext } from "../../src/hub/types.js";

/** 创建模拟的腾讯云客户端集合 */
function createMockClients() {
  return {
    cvm: {},
    dnspod: {
      DescribeDomainList: vi.fn().mockResolvedValue({
        DomainCountInfo: { AllTotal: 2 },
        DomainList: [
          { Name: "example.com", Status: "ENABLE", RecordCount: 10 },
          { Name: "test.cn", Status: "ENABLE", RecordCount: 5 },
        ],
      }),
      DescribeRecordList: vi.fn().mockResolvedValue({
        RecordCountInfo: { TotalCount: 2 },
        RecordList: [
          { Name: "www", Type: "A", Value: "1.2.3.4", Status: "ENABLE", TTL: 600, RecordId: 101 },
          { Name: "@", Type: "MX", Value: "mx.example.com", Status: "ENABLE", TTL: 3600, RecordId: 102 },
        ],
      }),
      CreateRecord: vi.fn().mockResolvedValue({ RecordId: 201 }),
      DeleteRecord: vi.fn().mockResolvedValue({}),
    },
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

describe("dnsTools", () => {
  describe("tool definitions 结构", () => {
    it("应包含 4 个 DNS 相关工具定义", () => {
      const { definitions } = dnsTools;
      expect(definitions).toHaveLength(4);

      const names = definitions.map((d) => d.name);
      expect(names).toContain("list_domains");
      expect(names).toContain("list_dns_records");
      expect(names).toContain("create_dns_record");
      expect(names).toContain("delete_dns_record");
    });

    it("create_dns_record 应要求 domain, sub_domain, record_type, value 为必填", () => {
      const createDef = dnsTools.definitions.find((d) => d.name === "create_dns_record");
      expect(createDef?.parameters?.required).toContain("domain");
      expect(createDef?.parameters?.required).toContain("sub_domain");
      expect(createDef?.parameters?.required).toContain("record_type");
      expect(createDef?.parameters?.required).toContain("value");
    });
  });

  describe("createHandlers", () => {
    let clients: ReturnType<typeof createMockClients>;
    let handlers: Map<string, any>;

    beforeEach(() => {
      clients = createMockClients();
      handlers = dnsTools.createHandlers(clients);
    });

    describe("list_domains", () => {
      it("应返回格式化的域名列表", async () => {
        const handler = handlers.get("list_domains")!;
        const result = await handler(makeCtx({}));

        expect(result).toContain("域名列表");
        expect(result).toContain("example.com");
        expect(result).toContain("test.cn");
      });

      it("无域名时应返回提示", async () => {
        clients.dnspod.DescribeDomainList.mockResolvedValueOnce({
          DomainCountInfo: { AllTotal: 0 },
          DomainList: [],
        });

        const handler = handlers.get("list_domains")!;
        const result = await handler(makeCtx({}));
        expect(result).toContain("暂无域名");
      });
    });

    describe("list_dns_records", () => {
      it("应返回格式化的解析记录", async () => {
        const handler = handlers.get("list_dns_records")!;
        const result = await handler(makeCtx({ domain: "example.com" }));

        expect(result).toContain("example.com");
        expect(result).toContain("www");
        expect(result).toContain("1.2.3.4");
        expect(result).toContain("MX");
      });
    });

    describe("create_dns_record", () => {
      it("应成功创建解析记录", async () => {
        const handler = handlers.get("create_dns_record")!;
        const result = await handler(makeCtx({
          domain: "example.com",
          sub_domain: "api",
          record_type: "A",
          value: "5.6.7.8",
        }));

        expect(clients.dnspod.CreateRecord).toHaveBeenCalledOnce();
        expect(result).toContain("创建成功");
        expect(result).toContain("api.example.com");
        expect(result).toContain("201");
      });

      it("API 出错时应返回错误消息", async () => {
        clients.dnspod.CreateRecord.mockRejectedValueOnce(new Error("记录已存在"));

        const handler = handlers.get("create_dns_record")!;
        const result = await handler(makeCtx({
          domain: "example.com",
          sub_domain: "www",
          record_type: "A",
          value: "1.1.1.1",
        }));
        expect(result).toContain("创建解析记录失败");
        expect(result).toContain("记录已存在");
      });
    });

    describe("delete_dns_record", () => {
      it("应成功删除解析记录", async () => {
        const handler = handlers.get("delete_dns_record")!;
        const result = await handler(makeCtx({ domain: "example.com", record_id: 101 }));

        expect(clients.dnspod.DeleteRecord).toHaveBeenCalledOnce();
        expect(result).toContain("已删除");
        expect(result).toContain("101");
      });
    });
  });
});
