# OpenTelemetry + Apollo Server 集成示例

这是一个展示如何在 Apollo GraphQL Server 中集成 OpenTelemetry 进行可观测性监控的示例项目。

## 项目简介

本项目演示了如何使用 OpenTelemetry 对 Apollo Server 进行完整的可观测性监控，包括：

- ✅ **Traces（追踪）**：追踪 GraphQL 查询的完整链路
- ✅ **Metrics（指标）**：收集 HTTP、GraphQL 等性能指标
- ✅ **自动插桩**：自动追踪 HTTP、Express 等常见 Node.js 库
- ✅ **手动插桩**：在业务逻辑中手动添加自定义 span 和 metric

## 技术栈

- **Apollo Server 3.x** - GraphQL 服务器
- **OpenTelemetry SDK** - 可观测性框架
- **OpenTelemetry Collector** - 数据收集和处理
- **Docker Compose** - 容器化部署
- **TypeScript** - 类型安全

## 项目结构

```
otel-apollo-demo/
├── src/
│   ├── index.ts              # Apollo Server 入口
│   ├── instrumentation.ts    # OpenTelemetry 配置
│   ├── schema.ts             # GraphQL Schema 定义
│   └── resolvers.ts          # GraphQL Resolvers（含手动插桩示例）
├── collector-config.yaml     # OTel Collector 配置
├── docker-compose.yaml       # Docker 编排配置
├── Dockerfile                # Apollo Server 镜像
├── package.json              # 项目依赖
└── tsconfig.json             # TypeScript 配置
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 构建项目

```bash
npm run build
```

### 3. 启动服务（Docker Compose）

```bash
docker-compose up --build
```
或
```bash
auto/dev
```

### 4. 访问 GraphQL Playground

打开浏览器访问：http://localhost:4000

### 5. 发送测试查询

在 GraphQL Playground 中执行：

```graphql
query {
  hello
}
```

## OpenTelemetry 配置说明

### Instrumentation 选项

在 `src/instrumentation.ts` 中提供了两种插桩方式：

#### 方式 1：自动插桩（推荐用于快速开始）

```typescript
instrumentations: [
  getNodeAutoInstrumentations(),
]
```

**特点**：
- ✅ 自动集成常见 Node.js 库（HTTP、Express、MySQL 等）
- ✅ 可以收集 traces 和 metrics
- ✅ 零配置，开箱即用
- ⚠️ 如果安装了 `@opentelemetry/instrumentation-graphql`，会自动启用 GraphQL 追踪

#### 方式 2：手动指定 GraphQL 插桩（推荐用于自定义配置）

```typescript
instrumentations: [
  new GraphQLInstrumentation(),
]
```

**特点**：
- ✅ 专门为 GraphQL 提供更细粒度的追踪
- ✅ 可以自定义配置（如过滤特定操作）
- ⚠️ 只提供 traces，不提供 metrics
- ⚠️ 需要手动配置

#### 方式 3：组合使用（推荐用于生产环境）

```typescript
instrumentations: [
  getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-graphql': { enabled: false }, // 禁用自动的
  }),
  new GraphQLInstrumentation({
    // 自定义配置
    allowValues: true,
  }),
]
```

### Collector 配置

`collector-config.yaml` 配置了 OpenTelemetry Collector 的行为：

#### Receivers（接收器）
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317  # gRPC 协议
      http:
        endpoint: 0.0.0.0:4318  # HTTP 协议
```

#### Processors（处理器）
```yaml
processors:
  batch:
    send_batch_max_size: 10000  # 每批最多 10000 条数据
    timeout: 1s                  # 最多等待 1 秒发送
  memory_limiter:
    check_interval: 1s           # 每秒检查内存
    limit_mib: 4000              # 内存上限 4GB
```

#### Exporters（导出器）
```yaml
exporters:
  debug:
    verbosity: detailed          # 详细日志输出到控制台
```

**提示**：生产环境可以替换为 Prometheus、Jaeger、Grafana Cloud 等后端。

## 进一步学习

### 集成后端存储

将 `collector-config.yaml` 中的 `debug` exporter 替换为实际的后端：

#### Prometheus（Metrics）
```yaml
exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
```

#### Jaeger（Traces）
```yaml
exporters:
  jaeger:
    endpoint: "jaeger:14250"
    tls:
      insecure: true
```

#### OTLP（通用）
```yaml
exporters:
  otlp:
    endpoint: "https://your-backend.com:4317"
    headers:
      authorization: "Bearer YOUR_TOKEN"
```

### 添加数据库追踪

安装数据库插桩包：

```bash
npm install @opentelemetry/instrumentation-pg  # PostgreSQL
# 或
npm install @opentelemetry/instrumentation-mysql  # MySQL
```

`getNodeAutoInstrumentations()` 会自动检测并启用。

## 开发与调试

### 查看 Collector 日志

```bash
docker-compose logs -f otelcol
```

### 查看 Apollo Server 日志

```bash
docker-compose logs -f apollo-server
```

### 停止服务

```bash
docker-compose down
```

## 相关资源

- [OpenTelemetry 官方文档](https://opentelemetry.io/docs/)
- [Apollo Server 文档](https://www.apollographql.com/docs/apollo-server/)
- [OpenTelemetry JavaScript SDK](https://github.com/open-telemetry/opentelemetry-js)
- [OpenTelemetry Collector](https://opentelemetry.io/docs/collector/)
