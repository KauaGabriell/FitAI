import { fromNodeHeaders } from 'better-auth/node';
import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

import { auth } from '../lib/auth.js';
import { ErrorSchema, UpsertUserTrainDataSchema, UserTrainDataSchema } from '../schemas/index.js';
import { GetUserTrainData } from '../usecases/GetUserTrainData.js';
import { UpsertUserTrainData } from '../usecases/UpsertUserTrainData.js';

export const userRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/me',
    schema: {
      tags: ['User'],
      summary: 'Get current user training data',
      response: {
        200: UserTrainDataSchema.nullable(),
        401: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        });
        if (!session) {
          return reply.status(401).send({
            error: 'Unauthorized',
            code: 'UNAUTHORIZED',
          });
        }
        const getUserTrainData = new GetUserTrainData();
        const result = await getUserTrainData.execute(session.user.id);
        return reply.status(200).send(result);
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/me',
    schema: {
      tags: ['User'],
      summary: 'Upsert user training data',
      body: UpsertUserTrainDataSchema.omit({ userId: true }),
      response: {
        200: UpsertUserTrainDataSchema,
        401: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        });
        if (!session) {
          return reply.status(401).send({
            error: 'Unauthorized',
            code: 'UNAUTHORIZED',
          });
        }
        const upsertUserTrainData = new UpsertUserTrainData();
        const result = await upsertUserTrainData.execute({
          userId: session.user.id,
          ...request.body,
        });
        return reply.status(200).send(result);
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    },
  });
};
