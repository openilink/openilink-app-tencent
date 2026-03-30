/**
 * 腾讯云 App 集成测试
 *
 * 测试 Hub <-> App 的完整通信链路：
 * 1. Mock Hub Server 模拟 OpeniLink Hub
 * 2. 创建轻量 App HTTP 服务器（仅含 webhook handler + router）
 * 3. 使用内存 SQLite 存储 + Mock 腾讯云客户端
 * 4. 验证命令路由和工具执行
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import http from "node:http";
import { Store } from "../../src/store.js";
import { handleWebhook } from "../../src/hub/webhook.js";
import { HubClient } from "../../src/hub/client.js";
import { Router } from "../../src/router.js";
import { collectAllTools } from "../../src/tools/index.js";
import {
  startMockHub,
  injectCommand,
  MOCK_HUB_URL,
  MOCK_WEBHOOK_SECRET,
  MOCK_APP_TOKEN,
  MOCK_INSTALLATION_ID,
  MOCK_BOT_ID,
  APP_PORT,
} from "./setup.js";

// ─── Mock 腾讯云客户端 ───

function createMockClients() {
  return {
    cvm: {
      DescribeInstances: vi.fn().mockResolvedValue({
        TotalCount: 1,
        InstanceSet: [
          {
            InstanceName: "测试服务器",
            InstanceId: "ins-test1234",
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
        ],
      }),
      StartInstances: vi.fn().mockResolvedValue({}),
      StopInstances: vi.fn().mockResolvedValue({}),
      RebootInstances: vi.fn().mockResolvedValue({}),
    },
    vpc: {
      DescribeSecurityGroups: vi.fn().mockResolvedValue({
        TotalCount: 1,
        SecurityGroupSet: [
          { SecurityGroupName: "默认安全组", SecurityGroupId: "sg-test1234", SecurityGroupDesc: "默认" },
        ],
      }),
      DescribeSecurityGroupPolicies: vi.fn().mockResolvedValue({
        SecurityGroupPolicySet: {
          Ingress: [
            { Protocol: "TCP", Port: "22", CidrBlock: "0.0.0.0/0", Action: "ACCEPT", PolicyDescription: "SSH" },
          ],
          Egress: [
            { Protocol: "ALL", Port: "ALL", CidrBlock: "0.0.0.0/0", Action: "ACCEPT" },
          ],
        },
      }),
    },
    lighthouse: {
      DescribeInstances: vi.fn().mockResolvedValue({
        TotalCount: 1,
        InstanceSet: [
          {
            InstanceName: "轻量服务器",
            InstanceId: "lhins-test5678",
            InstanceState: "RUNNING",
            Zone: "ap-guangzhou-3",
            OsName: "CentOS 8",
            CPU: 1,
            Memory: 2,
            SystemDisk: { DiskSize: 40 },
            PublicAddresses: ["5.6.7.8"],
            PrivateAddresses: ["10.0.1.1"],
            CreatedTime: "2024-02-01T00:00:00Z",
            ExpiredTime: "2025-02-01T00:00:00Z",
          },
        ],
      }),
    },
    dnspod: {
      DescribeDomainList: vi.fn().mockResolvedValue({
        DomainCountInfo: { AllTotal: 1 },
        DomainList: [{ Name: "example.com", Status: "ENABLE", RecordCount: 5 }],
      }),
      DescribeRecordList: vi.fn().mockResolvedValue({
        RecordCountInfo: { TotalCount: 1 },
        RecordList: [
          { Name: "www", Type: "A", Value: "1.2.3.4", Status: "ENABLE", TTL: 600, RecordId: 101 },
        ],
      }),
      CreateRecord: vi.fn().mockResolvedValue({ RecordId: 201 }),
      DeleteRecord: vi.fn().mockResolvedValue({}),
    },
    cdn: {
      DescribeDomains: vi.fn().mockResolvedValue({
        TotalNumber: 1,
        Domains: [
          { Domain: "cdn.example.com", Status: "online", Cname: "cdn.example.com.cdn.dnsv1.com", ServiceType: "web" },
        ],
      }),
      PurgeUrlsCache: vi.fn().mockResolvedValue({ TaskId: "task-purge-001" }),
      PushUrlsCache: vi.fn().mockResolvedValue({ TaskId: "task-push-001" }),
    },
    ssl: {
      DescribeCertificates: vi.fn().mockResolvedValue({
        TotalCount: 1,
        Certificates: [
          { Alias: "测试证书", CertificateId: "cert-test001", Domain: "*.example.com", Status: 1, CertBeginTime: "2024-01-01", CertEndTime: "2025-01-01" },
        ],
      }),
      DescribeCertificate: vi.fn().mockResolvedValue({
        Alias: "测试证书",
        Domain: "*.example.com",
        Status: 1,
        CertificateType: "SVR",
        ProductZhName: "TrustAsia TLS",
        CertBeginTime: "2024-01-01",
        CertEndTime: "2025-01-01",
        From: "TrustAsia",
        SubjectAltName: ["*.example.com", "example.com"],
      }),
    },
    clb: {
      DescribeLoadBalancers: vi.fn().mockResolvedValue({
        TotalCount: 1,
        LoadBalancerSet: [
          { LoadBalancerName: "测试CLB", LoadBalancerId: "lb-test001", LoadBalancerType: "OPEN", LoadBalancerVips: ["10.0.0.100"], Status: 1 },
        ],
      }),
      DescribeListeners: vi.fn().mockResolvedValue({
        Listeners: [
          { ListenerName: "HTTP监听器", ListenerId: "lbl-test001", Protocol: "HTTP", Port: 80 },
        ],
      }),
    },
    billing: {
      DescribeAccountBalance: vi.fn().mockResolvedValue({
        Balance: 10050,
        RealBalance: 8000,
        CashAccountBalance: 2050,
      }),
      DescribeBillList: vi.fn().mockResolvedValue({
        Total: 1,
        TransactionList: [
          { ActionType: "扣费", Amount: -500, Balance: 9550, Detail: "CVM 按量计费", Time: "2024-01-15 10:00:00" },
        ],
      }),
      DescribeBillSummaryByProduct: vi.fn().mockResolvedValue({
        Ready: 1,
        SummaryTotal: { RealTotalCost: "150.00" },
        SummaryOverview: [
          { BusinessCodeName: "云服务器CVM", RealTotalCost: "100.00", CashPayAmount: "80.00", VoucherPayAmount: "20.00" },
        ],
      }),
    },
  } as any;
}

// ─── 测试主体 ───

describe("腾讯云 App 集成测试", () => {
  let mockHubHandle: { server: http.Server; close: () => Promise<void> };
  let appServer: http.Server;
  let store: Store;
  let router: Router;

  beforeAll(async () => {
    // 1. 启动 Mock Hub Server
    mockHubHandle = await startMockHub();

    // 2. 初始化内存数据库和存储
    store = new Store(":memory:");

    // 3. 注入 installation 记录（模拟已完成 OAuth 安装）
    store.saveInstallation({
      id: MOCK_INSTALLATION_ID,
      hubUrl: MOCK_HUB_URL,
      appId: "tencent-cloud",
      botId: MOCK_BOT_ID,
      appToken: MOCK_APP_TOKEN,
      webhookSecret: MOCK_WEBHOOK_SECRET,
      createdAt: new Date().toISOString(),
    });

    // 4. 使用 Mock 腾讯云客户端收集工具并创建路由
    const mockClients = createMockClients();
    const { handlers } = collectAllTools(mockClients);
    router = new Router(handlers);

    // 5. 启动轻量 App HTTP 服务器
    appServer = http.createServer(async (req, res) => {
      const url = new URL(req.url!, `http://localhost:${APP_PORT}`);

      if (req.method === "POST" && url.pathname === "/hub/webhook") {
        await handleWebhook(req, res, {
          store,
          onCommand: async (event, installation) => {
            if (!event.event) return null;
            const hubClient = new HubClient(installation.hubUrl, installation.appToken);
            return router.handleCommand(event, installation, hubClient);
          },
          getHubClient: (installation) =>
            new HubClient(installation.hubUrl, installation.appToken),
        });
        return;
      }

      if (url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }

      res.writeHead(404);
      res.end("Not Found");
    });

    await new Promise<void>((resolve, reject) => {
      appServer.on("error", reject);
      appServer.listen(APP_PORT, () => {
        console.log(`[test] App Server 已启动，端口 ${APP_PORT}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) =>
      appServer.close(() => {
        console.log("[test] App Server 已关闭");
        resolve();
      }),
    );
    await mockHubHandle.close();
    store.close();
  });

  // ─── 基础健康检查 ───

  it("Mock Hub Server 健康检查", async () => {
    const res = await fetch(`${MOCK_HUB_URL}/health`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toEqual({ status: "ok" });
  });

  it("App Server 健康检查", async () => {
    const res = await fetch(`http://localhost:${APP_PORT}/health`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toEqual({ status: "ok" });
  });

  // ─── 命令执行测试 ───

  it("list_instances 命令应通过 Hub 链路返回 CVM 实例列表", async () => {
    const result = await injectCommand("list_instances", {});

    expect(result.app_response.reply).toBeDefined();
    expect(result.app_response.reply).toContain("测试服务器");
    expect(result.app_response.reply).toContain("ins-test1234");
  });

  it("get_balance 命令应通过 Hub 链路返回余额", async () => {
    const result = await injectCommand("get_balance", {});

    expect(result.app_response.reply).toBeDefined();
    expect(result.app_response.reply).toContain("腾讯云账户余额");
    expect(result.app_response.reply).toContain("¥");
  });

  it("list_domains 命令应返回域名列表", async () => {
    const result = await injectCommand("list_domains", {});

    expect(result.app_response.reply).toBeDefined();
    expect(result.app_response.reply).toContain("example.com");
  });

  it("list_cdn_domains 命令应返回 CDN 域名列表", async () => {
    const result = await injectCommand("list_cdn_domains", {});

    expect(result.app_response.reply).toBeDefined();
    expect(result.app_response.reply).toContain("cdn.example.com");
  });

  it("未知命令应返回错误提示", async () => {
    const result = await injectCommand("nonexistent_command", {});

    expect(result.app_response.reply).toBeDefined();
    expect(result.app_response.reply).toContain("未知命令");
  });

  // ─── Webhook 验证测试 ───

  it("无效签名的 webhook 请求应被拒绝（401）", async () => {
    const hubEvent = {
      v: 1,
      type: "event",
      trace_id: "tr_bad_sig",
      installation_id: MOCK_INSTALLATION_ID,
      bot: { id: MOCK_BOT_ID },
      event: {
        type: "command",
        id: "evt_bad",
        timestamp: Math.floor(Date.now() / 1000),
        data: { command: "list_instances", args: {}, user_id: "hacker" },
      },
    };

    const res = await fetch(`http://localhost:${APP_PORT}/hub/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Timestamp": "12345",
        "X-Signature": "sha256=invalid_signature_here",
      },
      body: JSON.stringify(hubEvent),
    });

    expect(res.status).toBe(401);
  });

  it("url_verification 请求应正确返回 challenge", async () => {
    const verifyEvent = {
      v: 1,
      type: "url_verification",
      challenge: "test_challenge_token_123",
    };

    const res = await fetch(`http://localhost:${APP_PORT}/hub/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(verifyEvent),
    });

    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toEqual({ challenge: "test_challenge_token_123" });
  });

  it("list_security_groups 命令应返回安全组列表", async () => {
    const result = await injectCommand("list_security_groups", {});

    expect(result.app_response.reply).toBeDefined();
    expect(result.app_response.reply).toContain("安全组列表");
    expect(result.app_response.reply).toContain("默认安全组");
  });

  it("list_lighthouse 命令应返回轻量服务器列表", async () => {
    const result = await injectCommand("list_lighthouse", {});

    expect(result.app_response.reply).toBeDefined();
    expect(result.app_response.reply).toContain("轻量服务器");
    expect(result.app_response.reply).toContain("lhins-test5678");
  });
});
