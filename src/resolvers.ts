import { Tracer } from "@opentelemetry/api";
import { logger } from "./logger";

export const resolvers = (tracer: Tracer) => ({
  Query: {
    hello: (): string => {
      tracer.startActiveSpan("hello-span-query", (it) => {
        logger.info("inside span");
        it.setAttribute("useremail", "pii@example.com");
        it.setAttribute("password", "1password");
        it.end();
      });
      logger.info("outside span");
      return "Hello from Apollo + OTel"
    }
  },
});
