/**
 * 封装各产品 client 的统一创建
 * 使用腾讯云 Cloud API 3.0 SDK（按产品拆分的轻量包）
 */
import * as tencentCvm from "tencentcloud-sdk-nodejs-cvm";
import * as tencentDnspod from "tencentcloud-sdk-nodejs-dnspod";
import * as tencentCdn from "tencentcloud-sdk-nodejs-cdn";
import * as tencentSsl from "tencentcloud-sdk-nodejs-ssl";
import * as tencentClb from "tencentcloud-sdk-nodejs-clb";
import * as tencentBilling from "tencentcloud-sdk-nodejs-billing";
import * as tencentLighthouse from "tencentcloud-sdk-nodejs-lighthouse";
import * as tencentVpc from "tencentcloud-sdk-nodejs-vpc";

/** 统一的认证参数 */
export interface TencentCredential {
  secretId: string;
  secretKey: string;
  region: string;
}

/** 创建 CVM 客户端 */
export function createCvmClient(cred: TencentCredential) {
  const CvmClient = tencentCvm.cvm.v20170312.Client;
  return new CvmClient({
    credential: { secretId: cred.secretId, secretKey: cred.secretKey },
    region: cred.region,
    profile: { httpProfile: { endpoint: "cvm.tencentcloudapi.com" } },
  });
}

/** 创建 DNSPod 客户端（DNSPod 是全局服务，不区分地域） */
export function createDnspodClient(cred: TencentCredential) {
  const DnspodClient = tencentDnspod.dnspod.v20210323.Client;
  return new DnspodClient({
    credential: { secretId: cred.secretId, secretKey: cred.secretKey },
    region: "",
    profile: { httpProfile: { endpoint: "dnspod.tencentcloudapi.com" } },
  });
}

/** 创建 CDN 客户端（CDN 是全局服务） */
export function createCdnClient(cred: TencentCredential) {
  const CdnClient = tencentCdn.cdn.v20180606.Client;
  return new CdnClient({
    credential: { secretId: cred.secretId, secretKey: cred.secretKey },
    region: "",
    profile: { httpProfile: { endpoint: "cdn.tencentcloudapi.com" } },
  });
}

/** 创建 SSL 证书客户端（全局服务） */
export function createSslClient(cred: TencentCredential) {
  const SslClient = tencentSsl.ssl.v20191205.Client;
  return new SslClient({
    credential: { secretId: cred.secretId, secretKey: cred.secretKey },
    region: "",
    profile: { httpProfile: { endpoint: "ssl.tencentcloudapi.com" } },
  });
}

/** 创建 CLB（负载均衡）客户端 */
export function createClbClient(cred: TencentCredential) {
  const ClbClient = tencentClb.clb.v20180317.Client;
  return new ClbClient({
    credential: { secretId: cred.secretId, secretKey: cred.secretKey },
    region: cred.region,
    profile: { httpProfile: { endpoint: "clb.tencentcloudapi.com" } },
  });
}

/** 创建计费客户端（全局服务） */
export function createBillingClient(cred: TencentCredential) {
  const BillingClient = tencentBilling.billing.v20180709.Client;
  return new BillingClient({
    credential: { secretId: cred.secretId, secretKey: cred.secretKey },
    region: "",
    profile: { httpProfile: { endpoint: "billing.tencentcloudapi.com" } },
  });
}

/** 创建轻量应用服务器客户端 */
export function createLighthouseClient(cred: TencentCredential) {
  const LighthouseClient = tencentLighthouse.lighthouse.v20200324.Client;
  return new LighthouseClient({
    credential: { secretId: cred.secretId, secretKey: cred.secretKey },
    region: cred.region,
    profile: { httpProfile: { endpoint: "lighthouse.tencentcloudapi.com" } },
  });
}

/** 创建 VPC 客户端（安全组相关 API） */
export function createVpcClient(cred: TencentCredential) {
  const VpcClient = tencentVpc.vpc.v20170312.Client;
  return new VpcClient({
    credential: { secretId: cred.secretId, secretKey: cred.secretKey },
    region: cred.region,
    profile: { httpProfile: { endpoint: "vpc.tencentcloudapi.com" } },
  });
}

/** 创建所有产品客户端的集合 */
export interface TencentClients {
  cvm: ReturnType<typeof createCvmClient>;
  dnspod: ReturnType<typeof createDnspodClient>;
  cdn: ReturnType<typeof createCdnClient>;
  ssl: ReturnType<typeof createSslClient>;
  clb: ReturnType<typeof createClbClient>;
  billing: ReturnType<typeof createBillingClient>;
  lighthouse: ReturnType<typeof createLighthouseClient>;
  vpc: ReturnType<typeof createVpcClient>;
}

/** 一次性创建所有产品客户端 */
export function createAllClients(cred: TencentCredential): TencentClients {
  return {
    cvm: createCvmClient(cred),
    dnspod: createDnspodClient(cred),
    cdn: createCdnClient(cred),
    ssl: createSslClient(cred),
    clb: createClbClient(cred),
    billing: createBillingClient(cred),
    lighthouse: createLighthouseClient(cred),
    vpc: createVpcClient(cred),
  };
}

// ─── 模块级变量：per-installation 凭证隔离 ───

/** 当前请求使用的客户端实例（由 onCommand 在每次请求前设置） */
let _currentClients: TencentClients;

/** 设置当前请求的客户端实例 */
export function setCurrentClients(c: TencentClients): void {
  _currentClients = c;
}

/** 获取当前请求的客户端实例 */
export function getCurrentClients(): TencentClients {
  return _currentClients;
}

/**
 * 创建一个代理对象，所有属性访问都委托给 getCurrentClients()。
 * 这样 handler 闭包中引用的 clients 会自动使用当前 installation 的客户端。
 */
export function createClientsProxy(): TencentClients {
  return new Proxy({} as TencentClients, {
    get(_target, prop: string) {
      const real = getCurrentClients();
      return real[prop as keyof TencentClients];
    },
  });
}
