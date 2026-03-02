import 'dotenv/config';
import Fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import z from 'zod';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';

const app = Fastify({
  logger: true,
});

await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'BootCamp Treinos API',
      description: 'API para gestão de treinos para bootcamp do FSC',
      version: '1.0.0',
    },
    servers: [
      {
        description: 'Localhost',
        url: 'http://localhost:3000',
      },
    ],
  },
  transform: jsonSchemaTransform,
});

await app.register(fastifySwaggerUI, {
  routePrefix: '/docs',
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.withTypeProvider<ZodTypeProvider>().route({
  method: 'GET',
  url: '/',
  schema: {
    description: 'Hello Word',
    tags: ['Hello Word'],
    response: {
      200: z.object({
        message: z.string(),
      }),
    },
  },

  handler: () => {
    return {
      message: 'Hello Word',
    };
  },
});

const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT ?? 3000) });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
