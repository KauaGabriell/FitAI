import 'dotenv/config';
import Fastify from 'fastify';
import z from 'zod';
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';

const app = Fastify({
  logger: true,
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.get('/t', async (request, reply) => {
  return { hello: 'world' };
});

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
