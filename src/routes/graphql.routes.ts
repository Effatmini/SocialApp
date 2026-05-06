import { Router } from "express";
import { createHandler } from "graphql-http/lib/use/express";
import {
  getGraphQLContext,
  graphQLRoot,
  graphQLSchema
} from "../graphql/schema";

const router = Router();

router.all(
  "/",
  createHandler({
    schema: graphQLSchema,
    rootValue: graphQLRoot,
    context: async (request: any) => {
      const authorization =
        typeof request.headers?.get === "function"
          ? request.headers.get("authorization") || undefined
          : request.headers?.authorization;
      return getGraphQLContext(authorization);
    }
  } as any)
);

export default router;
