import { ApolloServerPlugin } from "apollo-server-plugin-base";
import { metrics, trace } from "@opentelemetry/api";

export function createOtelApolloPlugin(): ApolloServerPlugin {
  const tracer = trace.getTracer("trace-instrumentation-scope-name", "trace-instrumentation-scope-version");
  const meter = metrics.getMeter("metric-instrumentation-scope-name", "metric-instrumentation-scope-version");

  return {
    async requestDidStart(_requestContext) {
      meter.createCounter("request-count").add(1, { operation: "Query" });

      const span = tracer.startSpan("hello-span", {
        attributes: {
          operation: "Query",
        },
      });

      return {
        async willSendResponse() {
          span.end();
        },
      };
    },
  };
}
