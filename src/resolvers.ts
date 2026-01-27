import { Tracer } from "@opentelemetry/api";
import { logger } from "./logger";
import { randomInt } from "crypto";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const resolvers = (tracer: Tracer) => ({
  Query: {
    hello: (): string => {
      tracer.startActiveSpan("hello-span-query", async (it) => {
        const number = randomInt(0, 2);
        logger.info("inside span");
        logger.info(`generated number: ${number}`);
        it.setAttribute("useremail", "pii@example.com");
        it.setAttribute("password", "1password");
        it.setAttribute("randomnumber", number);
        it.addEvent("randomnumber-generated", { value: number });
        await sleep(1500);
        it.end();
      });
      logger.info("outside span");
      return "Hello from Apollo + OTel"
    }
  },
});
