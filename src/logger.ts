import winston from "winston";
import { trace, context } from "@opentelemetry/api";

const otelFormat = winston.format((info) => {
  const span = trace.getSpan(context.active());
  if (span) {
    const ctx = span.spanContext();
    info[
      "logging.googleapis.com/trace"
    ] = `projects/my-project/traces/${ctx.traceId}`;
    info["logging.googleapis.com/spanId"] = ctx.spanId;
  }
  return info;
});

export const logger = winston.createLogger({
  format: winston.format.combine(otelFormat(), winston.format.json()),
  transports: [new winston.transports.Console()],
});
