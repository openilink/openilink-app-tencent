/**
 * 应用配置 - 从环境变量加载
 */
export interface Config {
  /** HTTP 监听端口 */
  port: string;
  /** OpeniLink Hub 地址 */
  hubUrl: string;
  /** 本 App 的公网地址 */
  baseUrl: string;
  /** SQLite 数据库路径 */
  dbPath: string;
  /** 腾讯云 SecretId（必填） */
  tencentSecretId: string;
  /** 腾讯云 SecretKey（必填） */
  tencentSecretKey: string;
  /** 腾讯云地域（默认 ap-guangzhou） */
  tencentRegion: string;
}

function env(key: string, fallback = ""): string {
  return process.env[key] || fallback;
}

export function loadConfig(): Config {
  const cfg: Config = {
    port: env("PORT", "8101"),
    hubUrl: env("HUB_URL"),
    baseUrl: env("BASE_URL"),
    dbPath: env("DB_PATH", "data/tencent.db"),
    tencentSecretId: env("TENCENT_SECRET_ID"),
    tencentSecretKey: env("TENCENT_SECRET_KEY"),
    tencentRegion: env("TENCENT_REGION", "ap-guangzhou"),
  };

  const missing: string[] = [];
  if (!cfg.hubUrl) missing.push("HUB_URL");
  if (!cfg.baseUrl) missing.push("BASE_URL");
  if (!cfg.tencentSecretId) missing.push("TENCENT_SECRET_ID");
  if (!cfg.tencentSecretKey) missing.push("TENCENT_SECRET_KEY");

  if (missing.length > 0) {
    throw new Error(`缺少必填环境变量: ${missing.join(", ")}`);
  }

  return cfg;
}
