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

## OpenTelemetry Collector 配置详解

### 1. Receivers（接收器）

#### OTLP Receiver
接收来自应用的 OpenTelemetry 数据，支持 gRPC 和 HTTP 两种协议：

```yaml
otlp:
  protocols:
    grpc:
      endpoint: 0.0.0.0:4317           # gRPC 端口
      max_recv_msg_size_mib: 16        # 最大消息大小 16MB
    http:
      endpoint: 0.0.0.0:4318           # HTTP 端口
      cors:                            # CORS 跨域配置
        allowed_origins:
          - http://localhost:4000
          - https://*.example.com
```

**协议关系说明**：
- **OTLP (OpenTelemetry Protocol)**：是 OpenTelemetry 的标准传输协议
- **gRPC**：OTLP 的底层传输方式之一，基于 HTTP/2，性能更高，适合高吞吐场景
- **HTTP**：OTLP 的另一种传输方式，使用 HTTP/1.1 或 HTTP/2，更易于调试和防火墙穿透

#### Host Metrics Receiver
收集主机系统指标：

```yaml
hostmetrics:
  collection_interval: 30s           # 每 30 秒收集一次
  scrapers:                          # 收集磁盘、文件系统、负载、网络
    - disk
    - filesystem
    - load
    - network

hostmetrics/frequent:
  collection_interval: 10s           # CPU 和内存每 10 秒收集
  scrapers:
    - cpu
    - memory
```

#### Prometheus Receiver
从 Prometheus 格式的 metrics 端点拉取数据：

```yaml
prometheus_simple:
  collection_interval: 10s
  endpoint: "host.docker.internal:8080"
  metrics_path: '/metrics'
```

#### File Log Receiver
从日志文件读取并解析日志：

```yaml
filelog:
  include:
    - /var/log/*.log                 # 监控的日志文件路径
  start_at: end                      # 从文件末尾开始读取（不读历史）
  operators:
    - type: regex_parser
      regex: '^(?P<time>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (?P<sev>[A-Z]*) (?P<msg>.*)$'
      timestamp:
        parse_from: attributes.time  # 从哪个字段解析时间戳
        layout: '%Y-%m-%d %H:%M:%S'  # 时间格式
      severity:
        parse_from: attributes.sev   # 从哪个字段解析日志级别
```

**日志解析说明**：
- `regex` 捕获组会自动创建 attributes（如 `attributes.time`, `attributes.sev`, `attributes.msg`）
- `parse_from: attributes.time` 将捕获的时间字符串解析为标准的 timestamp 字段
- `parse_from: attributes.sev` 将捕获的级别映射到 severity 字段
- 如果 severity 和 message 没有显示，可能是：
  1. 日志格式不匹配正则表达式
  2. 后续的 processor 或 exporter 过滤掉了这些字段
  3. 需要检查实际的日志输出格式

### 2. Processors（处理器）

#### Memory Limiter
防止内存溢出：

```yaml
memory_limiter:
  check_interval: 1s                 # 每秒检查一次
  limit_mib: 400                     # 内存上限 400MB
  spike_limit_mib: 100               # 突发流量额外 100MB
```

#### Batch Processor
批量发送数据，提高性能：

```yaml
batch:
  timeout: 2s                        # 2 秒超时自动发送
  send_batch_size: 1024              # 达到 1024 条立即发送
  send_batch_max_size: 2048          # 批次最大 2048 条
```

#### Resource Processor
**操作 Resource 级别的属性**（描述服务本身的静态元数据）：

```yaml
resource:
  attributes:
    - key: service.namespace
      value: node-apollo_from_config
      action: upsert                 # 添加或更新
    - key: deployment.environment
      value: local_from_config
      action: upsert
    - key: service.name
      action: delete                 # 删除某个 resource 属性
```

**特点**：
- 作用于整个服务的元数据
- 适用于所有 telemetry 数据（traces、metrics、logs）
- 通常是静态配置，不会频繁变化

#### Attributes Processor
**操作 Span/Metric/Log 级别的属性**（处理具体数据点的动态属性）：

```yaml
attributes:
  actions:
    - key: password
      action: delete                 # 删除敏感信息
    - key: useremail
      action: hash                   # 哈希化用户邮箱（保护隐私）
    - key: collector.attribute
      value: collector-value-from-config
      action: insert                 # 插入固定值
```

**特点**：
- 作用于每条 trace/metric/log 的具体数据
- 适合处理敏感数据、添加业务标签
- 可以是动态的，每条数据可能不同

**Resource vs Attributes 对比**：
| 维度 | Resource Processor | Attributes Processor |
|------|-------------------|---------------------|
| 操作层级 | 服务级别 | 数据点级别 |
| 典型用途 | `service.name`, `deployment.environment` | `http.status_code`, `user.id` |
| 变化频率 | 静态 | 动态 |
| 作用范围 | 所有 telemetry 类型 | 特定 span/metric/log |

**⚠️ 高基数警告**：
- `hash` 操作**不会降低基数**，只是保护隐私
- 如果 `useremail` 有数万个唯一值，哈希后仍然是高基数
- 高基数会导致存储和查询性能问题
- **建议**：删除高基数属性或提取域名/分组

#### Filter Processor
过滤不需要的数据：

```yaml
filter:
  error_mode: ignore
  traces:
    span:
      - 'name == "hello-span"'       # 只保留名为 "hello-span" 的 span
    spanevent:
      - 'attributes["value"] == 0'   # 过滤 value 为 0 的事件
  metrics:
    metric:
      - 'name != "request-count"'    # 排除 "request-count" 指标
    datapoint:
      - 'value_double < 2'           # 只保留值小于 2 的数据点
```

使用 OTTL (OpenTelemetry Transformation Language) 语法。

#### Tail Sampling Processor
基于 trace 完整信息进行采样（仅适用于 traces）：

```yaml
tail_sampling:
  decision_wait: 10s                 # 等待 10 秒收集完整 trace
  policies:
    - name: slow-traces
      type: latency                  # 保留慢请求（>1秒）
      latency:
        threshold_ms: 1000
    - name: probabilistic
      type: probabilistic            # 其他请求 10% 采样
      probabilistic:
        sampling_percentage: 10
```

### 3. Exporters（导出器）

#### Debug Exporter
输出到控制台，用于调试：

```yaml
debug:
  verbosity: detailed                # 详细输出
```

#### OTLP HTTP Exporter
发送到另一个 OTLP 端点：

```yaml
otlphttp:
  endpoint: http://localhost:4318
  encoding: json                     # 使用 JSON 编码（也可以是 proto）
```

#### Google Cloud Exporter
发送到 Google Cloud Observability：

```yaml
googlecloud:
  project: fake-project
```

### 4. Service Pipelines（处理管道）

定义数据流：

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, attributes, filter, tail_sampling, batch]
      exporters: [debug, otlphttp]
    
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resource, attributes, filter, batch]
      exporters: [debug, otlphttp]
    
    logs:
      receivers: [filelog]
      processors: [memory_limiter, resource, attributes, filter, batch]
      exporters: [debug, otlphttp]
```

**处理顺序很重要**：
1. `memory_limiter` - 首先限制内存
2. `resource` / `attributes` - 添加/修改属性
3. `filter` - 过滤数据
4. `tail_sampling` - 采样（仅 traces）
5. `batch` - 最后批量发送

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
