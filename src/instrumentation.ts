import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { GraphQLInstrumentation } from "@opentelemetry/instrumentation-graphql";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";
import {resourceFromAttributes} from "@opentelemetry/resources";
import {ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION} from "@opentelemetry/semantic-conventions";
import {metrics, trace} from "@opentelemetry/api";

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "otel-apollo-server",
    [ATTR_SERVICE_VERSION]: "1.0",
  }),
  traceExporter: new OTLPTraceExporter({
    url: "http://otelcol:4317/v1/traces",
  }),
  metricReaders: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: "http://otelcol:4317/v1/metrics",
      }),
      exportIntervalMillis: 5000, // 5秒导出一次指标数据,默认60000ms
    }),
  ],
  instrumentations: [
    // 1.自动集成常见 Node.js 库（如 HTTP、Express、MySQL 等）的 OpenTelemetry 追踪，无需手动为每个库配置
    // 2.可以看到部分库的trace和metrics（如 HTTP、Express 等库的 instrumentation 本身支持 metrics 采集）
    // getNodeAutoInstrumentations(),

    // 1.专门为 GraphQL 服务提供的追踪集成，只针对 GraphQL 查询和解析过程进行追踪。
    // 2.只能看到 traces，看不到 metrics
    // new GraphQLInstrumentation(),
  ],
});

sdk.start();
