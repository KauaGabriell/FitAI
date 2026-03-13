import { fromNodeHeaders } from 'better-auth/node';
import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  WorkoutPlanNotActiveError,
} from '../errors/index.js';
import { auth } from '../lib/auth.js';
import { ErrorSchema, WorkoutPlanSchema } from '../schemas/index.js';
import { CompleteWorkoutSession } from '../usecases/CompleteWorkoutSession.js';
import { CreateWorkoutPlan } from '../usecases/CreateWorkoutPlan.js';
import { GetWorkoutDayDetails } from '../usecases/GetWorkoutDayDetails.js';
import { GetWorkoutPlanById } from '../usecases/GetWorkoutPlanById.js';
import { StartWorkoutSession } from '../usecases/StartWorkoutSession.js';

export const workoutPlanRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/:workoutPlanId/days/:workoutDayId',
    schema: {
      tags: ['Workout Plan'],
      summary: 'Get workout day details',
      params: z.object({
        workoutPlanId: z.uuid(),
        workoutDayId: z.uuid(),
      }),
      response: {
        200: z.object({
          id: z.uuid(),
          name: z.string(),
          isRest: z.boolean(),
          coverImageUrl: z.string().nullable().optional(),
          estimatedDurationInSeconds: z.number(),
          weekDay: z.string(),
          exercises: z.array(
            z.object({
              id: z.uuid(),
              order: z.number(),
              name: z.string(),
              sets: z.number(),
              reps: z.number(),
              restTimeInSeconds: z.number(),
              workoutDayId: z.uuid(),
            })
          ),
          sessions: z.array(
            z.object({
              id: z.uuid(),
              workoutDayId: z.uuid(),
              startedAt: z.string().datetime(),
              completedAt: z.string().datetime().nullable().optional(),
            })
          ),
        }),
        401: ErrorSchema,
        404: ErrorSchema,
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
        const getWorkoutDayDetails = new GetWorkoutDayDetails();
        const result = await getWorkoutDayDetails.execute({
          userId: session.user.id,
          workoutPlanId: request.params.workoutPlanId,
          workoutDayId: request.params.workoutDayId,
        });
        return reply.status(200).send({
          ...result,
          sessions: result.sessions.map((s) => ({
            ...s,
            startedAt: s.startedAt.toISOString(),
            completedAt: s.completedAt?.toISOString() || null,
          })),
        });
      } catch (error) {
        app.log.error(error);
        if (error instanceof NotFoundError) {
          return reply.status(404).send({
            error: error.message,
            code: 'NOT_FOUND',
          });
        }
        if (error instanceof UnauthorizedError) {
          return reply.status(401).send({
            error: error.message,
            code: 'UNAUTHORIZED',
          });
        }
        return reply.status(500).send({
          error: 'Internal Server Error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/:workoutPlanId',
    schema: {
      tags: ['Workout Plan'],
      summary: 'Get workout plan by ID',
      params: z.object({
        workoutPlanId: z.uuid(),
      }),
      response: {
        200: z.object({
          id: z.uuid(),
          name: z.string(),
          workoutDays: z.array(
            z.object({
              id: z.uuid(),
              weekDay: z.string(),
              name: z.string(),
              isRest: z.boolean(),
              coverImageUrl: z.string().nullable().optional(),
              estimatedDurationInSeconds: z.number(),
              exercisesCount: z.number(),
            })
          ),
        }),
        401: ErrorSchema,
        404: ErrorSchema,
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
        const getWorkoutPlanById = new GetWorkoutPlanById();
        const result = await getWorkoutPlanById.execute({
          userId: session.user.id,
          workoutPlanId: request.params.workoutPlanId,
        });
        return reply.status(200).send(result);
      } catch (error) {
        app.log.error(error);
        if (error instanceof NotFoundError) {
          return reply.status(404).send({
            error: error.message,
            code: 'NOT_FOUND',
          });
        }
        if (error instanceof UnauthorizedError) {
          return reply.status(401).send({
            error: error.message,
            code: 'UNAUTHORIZED',
          });
        }
        return reply.status(500).send({
          error: 'Internal Server Error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/',
    schema: {
      tags: ['Workout Plan'],
      summary: 'Create a Workout Plan',
      body: WorkoutPlanSchema.omit({ id: true }),
      response: {
        201: WorkoutPlanSchema,
        400: ErrorSchema,
        401: ErrorSchema,
        404: ErrorSchema,
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
            code: 'Unauthorized',
          });
        }
        const createWorkoutPlan = new CreateWorkoutPlan();
        const result = await createWorkoutPlan.execute({
          userId: session.user.id,
          name: request.body.name,
          workoutDays: request.body.workoutDays,
        });
        return reply.status(201).send(result);
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
    url: '/:workoutPlanId/days/:workoutDayId',
    schema: {
      tags: ['Workout Plan'],
      summary: 'Start a workout session',
      params: z.object({
        workoutPlanId: z.uuid(),
        workoutDayId: z.uuid(),
      }),
      response: {
        201: z.object({
          userWorkoutSessionId: z.uuid(),
        }),
        400: ErrorSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        409: ErrorSchema,
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
        const startWorkoutSession = new StartWorkoutSession();
        const result = await startWorkoutSession.execute({
          userId: session.user.id,
          workoutPlanId: request.params.workoutPlanId,
          workoutDayId: request.params.workoutDayId,
        });
        return reply.status(201).send(result);
      } catch (error) {
        app.log.error(error);
        if (error instanceof NotFoundError) {
          return reply.status(404).send({
            error: error.message,
            code: 'NOT_FOUND',
          });
        }
        if (error instanceof UnauthorizedError) {
          return reply.status(401).send({
            error: error.message,
            code: 'UNAUTHORIZED',
          });
        }
        if (error instanceof WorkoutPlanNotActiveError) {
          return reply.status(400).send({
            error: error.message,
            code: 'WORKOUT_PLAN_NOT_ACTIVE',
          });
        }
        if (error instanceof ConflictError) {
          return reply.status(409).send({
            error: error.message,
            code: 'CONFLICT',
          });
        }
        return reply.status(500).send({
          error: 'Internal Server Error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PATCH',
    url: '/:workoutPlanId/days/:workoutDayId/sessions/:sessionId',
    schema: {
      tags: ['Workout Plan'],
      summary: 'Complete a workout session',
      params: z.object({
        workoutPlanId: z.uuid(),
        workoutDayId: z.uuid(),
        sessionId: z.uuid(),
      }),
      body: z.object({
        completedAt: z.string().datetime({ offset: true }),
      }),
      response: {
        200: z.object({
          id: z.uuid(),
          completedAt: z.string().datetime({ offset: true }),
          startedAt: z.string().datetime({ offset: true }),
        }),
        400: ErrorSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        409: ErrorSchema,
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
        const completeWorkoutSession = new CompleteWorkoutSession();
        const result = await completeWorkoutSession.execute({
          userId: session.user.id,
          workoutPlanId: request.params.workoutPlanId,
          workoutDayId: request.params.workoutDayId,
          sessionId: request.params.sessionId,
          completedAt: new Date(request.body.completedAt),
        });
        return reply.status(200).send({
          id: result.id,
          completedAt: result.completedAt.toISOString(),
          startedAt: result.startedAt.toISOString(),
        });
      } catch (error) {
        app.log.error(error);
        if (error instanceof NotFoundError) {
          return reply.status(404).send({
            error: error.message,
            code: 'NOT_FOUND',
          });
        }
        if (error instanceof UnauthorizedError) {
          return reply.status(401).send({
            error: error.message,
            code: 'UNAUTHORIZED',
          });
        }
        if (error instanceof BadRequestError) {
          return reply.status(400).send({
            error: error.message,
            code: 'BAD_REQUEST',
          });
        }
        if (error instanceof ConflictError) {
          return reply.status(409).send({
            error: error.message,
            code: 'CONFLICT',
          });
        }
        return reply.status(500).send({
          error: 'Internal Server Error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    },
  });
};
