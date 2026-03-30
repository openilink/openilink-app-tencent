# OpeniLink 腾讯云 App

通过微信管理腾讯云资源 -- 23 个 Tools，管理 CVM / 轻量服务器 / DNS / CDN / SSL / CLB / 账单 / 安全组。

## 功能概览

### CVM 云服务器 (5 Tools)
- `list_instances` - 列出 CVM 实例
- `get_instance` - 获取实例详情
- `start_instances` - 启动实例
- `stop_instances` - 停止实例
- `reboot_instances` - 重启实例

### 轻量应用服务器 (2 Tools)
- `list_lighthouse` - 列出轻量服务器
- `get_lighthouse` - 获取轻量服务器详情

### DNS 解析 (4 Tools)
- `list_domains` - 列出域名
- `list_dns_records` - 列出解析记录
- `create_dns_record` - 创建解析记录
- `delete_dns_record` - 删除解析记录

### CDN (3 Tools)
- `list_cdn_domains` - 列出 CDN 域名
- `purge_urls` - 刷新 URL 缓存
- `push_urls` - 预热 URL

### SSL 证书 (2 Tools)
- `list_certificates` - 列出证书
- `get_certificate` - 获取证书详情

### CLB 负载均衡 (2 Tools)
- `list_load_balancers` - 列出 CLB 实例
- `list_listeners` - 列出监听器

### 账单 (3 Tools)
- `get_balance` - 查询余额
- `list_bills` - 账单明细
- `get_cost_summary` - 按产品汇总费用

### 安全组 (2 Tools)
- `list_security_groups` - 列出安全组
- `get_security_group_rules` - 获取安全组规则

## 快速开始

```bash
# 安装依赖
npm install

# 设置环境变量
export HUB_URL=http://your-hub-url
export BASE_URL=http://your-app-url
export TENCENT_SECRET_ID=your_secret_id
export TENCENT_SECRET_KEY=your_secret_key

# 开发模式
npm run dev

# 构建并运行
npm run build
npm start
```

## Docker 部署

```bash
docker compose up -d
```

## 认证方式

使用腾讯云 SecretId + SecretKey 认证（Cloud API 3.0）。

在 [腾讯云控制台 - API 密钥管理](https://console.cloud.tencent.com/cam/capi) 获取密钥。

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `HUB_URL` | 是 | - | OpeniLink Hub 地址 |
| `BASE_URL` | 是 | - | 本 App 公网地址 |
| `TENCENT_SECRET_ID` | 是 | - | 腾讯云 SecretId |
| `TENCENT_SECRET_KEY` | 是 | - | 腾讯云 SecretKey |
| `TENCENT_REGION` | 否 | ap-guangzhou | 腾讯云地域 |
| `PORT` | 否 | 8101 | HTTP 监听端口 |
| `DB_PATH` | 否 | data/tencent.db | SQLite 数据库路径 |

## 使用方式

安装到 Bot 后，支持三种方式调用：

### 自然语言（推荐）

直接用微信跟 Bot 对话，Hub AI 会自动识别意图并调用对应功能：

- "看看我的云服务器有哪些"
- "查一下腾讯云余额"
- "帮我给 example.com 添加一条 A 记录指向 1.2.3.4"

### 命令调用

也可以使用 `/命令名 参数` 的格式直接调用：

- `/list_instances`
- `/get_balance`
- `/create_dns_record --domain example.com --sub_domain www --record_type A --value 1.2.3.4`

### AI 自动调用

Hub AI 在多轮对话中会自动判断是否需要调用本 App 的功能，无需手动触发。

## 安全与隐私

### 数据处理说明

- **无状态工具**：本 App 为纯工具型应用，请求即响应，**不存储任何用户数据**
- **第三方 API 调用**：您的请求会通过腾讯云 API 处理，请参阅其隐私政策
- **API Key 安全**：您的密钥仅存储在服务端环境变量或 Installation 配置中，不会暴露给其他用户

### 应用市场安装（托管模式）

通过 OpeniLink Hub 应用市场安装时，您的请求将通过我们的服务器转发至第三方 API。我们承诺：

- 不会记录、存储或分析您的请求内容和返回结果
- 您的 API Key 加密存储，仅用于调用对应的第三方服务
- 所有 App 代码完全开源，接受社区审查

### 自部署（推荐注重隐私的用户）

如果您对数据隐私有更高要求，建议自行部署：

```bash
docker compose up -d
```

自部署后 API Key 和所有请求数据仅在您自己的服务器上。

## License

MIT
