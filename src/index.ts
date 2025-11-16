import "./instrumentation";

import { ApolloServer } from "apollo-server";
import { typeDefs } from "./schema";
import { resolvers } from "./resolvers";
import {createOtelApolloPlugin} from "./otelPlugin";

async function start() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [createOtelApolloPlugin()],
  });

  const { url } = await server.listen({ port: 4000 });
  console.log(`🚀 Server ready at ${url}`);
}

start();
