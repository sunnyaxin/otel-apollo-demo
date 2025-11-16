import {metrics, trace} from "@opentelemetry/api";

export const resolvers = {
  Query: {
    hello: (): string => {
      const meter = metrics.getMeter("metric-instrumentation-scope-name", "metric-instrumentation-scope-version");
      meter
          .createCounter("request-count")
          .add(1, { operation: "Query", field: "hello" });

      // const tracer = trace.getTracer("trace-instrumentation-scope-name", "trace-instrumentation-scope-version");
      // // 创建一个 span，但不会自动设置为当前活跃的 span
      // // 需要手动管理 span 的生命周期（调用 span.end()）
      // // 适合简单的、独立的追踪场景
      // const span = tracer.startSpan("hello-span");
      // span.setAttribute("span.attribute", "span attribute value");
      //   // span: do some work...
      // span.end();

      return "Hello from Apollo + OTel";
    },
  },
};
