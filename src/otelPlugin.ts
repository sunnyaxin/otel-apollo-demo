import { ApolloServerPlugin } from "apollo-server-plugin-base";
import {meter, tracer} from "./instrumentation";

export function createOtelApolloPlugin(): ApolloServerPlugin {
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
