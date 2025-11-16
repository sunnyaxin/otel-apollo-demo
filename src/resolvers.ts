import {metrics, trace} from "@opentelemetry/api";

export const resolvers = {
  Query: {
    hello: (): string => "Hello from Apollo + OTel"
  },
};
