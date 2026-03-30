/**
 * 通用腾讯云 API 调用工具
 * 可以调用任意腾讯云 Cloud API 3.0 接口，覆盖预置工具未支持的操作。
 * 底层使用 tencentcloud-sdk-nodejs-common 的 CommonClient，支持所有腾讯云服务。
 */
import { CommonClient } from "tencentcloud-sdk-nodejs-common/tencentcloud/index.js";
import { getCurrentCredential } from "../tencent/client.js";
import type { TencentClients } from "../tencent/client.js";
import type { ToolDefinition, ToolHandler } from "../hub/types.js";
import type { ToolModule } from "./index.js";

/**
 * 常见腾讯云服务的 API 版本号映射。
 * 当用户未指定版本号时，根据 service 名称自动匹配。
 */
const VERSION_MAP: Record<string, string> = {
  cvm: "2017-03-12",
  vpc: "2017-03-12",
  cbs: "2017-03-12",
  cdb: "2017-03-20",
  redis: "2018-04-12",
  mongodb: "2019-07-25",
  dnspod: "2021-03-23",
  cdn: "2018-06-06",
  ssl: "2019-12-05",
  clb: "2018-03-17",
  billing: "2018-07-09",
  lighthouse: "2020-03-24",
  scf: "2018-04-16",
  domain: "2018-08-08",
  teo: "2022-09-01",
  cam: "2019-01-16",
  cos: "2018-11-25",
  tke: "2018-05-25",
  as: "2018-04-19",
  monitor: "2018-07-24",
  tcr: "2019-09-24",
  apigateway: "2018-08-08",
  ckafka: "2019-08-19",
  cls: "2020-10-16",
  vod: "2018-07-17",
  sms: "2021-01-11",
  ses: "2020-10-02",
  tat: "2020-10-28",
  waf: "2018-01-25",
  dts: "2021-12-06",
  dcdb: "2018-04-11",
  mariadb: "2017-03-12",
  sqlserver: "2018-03-28",
  postgres: "2017-03-12",
  cynosdb: "2019-01-07",
  emr: "2019-01-03",
  gaap: "2018-05-29",
  ecdn: "2019-10-12",
  privatedns: "2020-10-28",
  tag: "2018-08-13",
  ssm: "2019-09-23",
  kms: "2019-01-18",
};

/** 通用 API 工具定义 */
const definitions: ToolDefinition[] = [
  {
    name: "tencent_api",
    description:
      "通用腾讯云 API 调用 — 可以调用任意腾讯云 Cloud API 3.0 接口。" +
      "传入服务名、Action 和参数即可。支持 CVM、VPC、CDB、CDN、SCF、TEO 等所有腾讯云服务。" +
      "服务名对应腾讯云 API 的产品缩写，如 cvm、vpc、cdb、cdn、scf、lighthouse、dnspod。",
    command: "tencent_api",
    parameters: {
      type: "object",
      properties: {
        service: {
          type: "string",
          description:
            "服务名（产品缩写），如 cvm、vpc、cdb、cos、cdn、scf、teo、lighthouse、dnspod、ssl",
        },
        action: {
          type: "string",
          description: "API Action 名称，如 DescribeInstances、CreateSecurityGroup",
        },
        params: {
          type: "string",
          description:
            '请求参数 JSON 字符串，如 {"Limit":10,"Offset":0}',
        },
        region: {
          type: "string",
          description: "地域（可选，默认使用配置的地域），如 ap-guangzhou、ap-shanghai",
        },
        version: {
          type: "string",
          description: "API 版本号（可选，常见服务会自动匹配）",
        },
      },
      required: ["service", "action"],
    },
  },
];

/** 创建通用 API 工具的 handler 映射 */
function createHandlers(_clients: TencentClients): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("tencent_api", async (ctx) => {
    const service = (ctx.args.service as string).toLowerCase();
    const action = ctx.args.action as string;
    const paramsStr = ctx.args.params as string | undefined;
    const regionOverride = ctx.args.region as string | undefined;
    const versionOverride = ctx.args.version as string | undefined;

    // 校验必填参数
    if (!service || !action) {
      return "缺少必填参数: service 和 action 均为必填";
    }

    // 解析可选的请求参数
    let params: Record<string, unknown> = {};
    if (paramsStr) {
      try {
        params = JSON.parse(paramsStr);
      } catch {
        return `params 参数不是合法的 JSON: ${paramsStr}`;
      }
    }

    // 确定 API 版本号
    const version = versionOverride || VERSION_MAP[service];
    if (!version) {
      return (
        `未知的服务 "${service}"，且未指定 version 参数。` +
        "请通过 version 参数提供该服务的 API 版本号（如 2017-03-12）。"
      );
    }

    // 构造 endpoint
    const endpoint = `${service}.tencentcloudapi.com`;

    try {
      // 从当前 installation 凭证创建 CommonClient
      const cred = getCurrentCredential();
      const region = regionOverride || cred.region;

      const client = new CommonClient(endpoint, version, {
        credential: { secretId: cred.secretId, secretKey: cred.secretKey },
        region,
        profile: {
          httpProfile: { endpoint },
        },
      });

      const data = await client.request(action, params);

      // 格式化输出并限制长度，防止消息过长
      const text = JSON.stringify(data, null, 2);
      if (text.length > 4000) {
        return text.slice(0, 4000) + "\n... (内容已截断，共 " + text.length + " 字符)";
      }
      return text;
    } catch (err: any) {
      return `腾讯云 API 调用失败: ${err.message ?? err}`;
    }
  });

  return handlers;
}

/** 通用 API 工具模块 */
export const apiTools: ToolModule = { definitions, createHandlers };
