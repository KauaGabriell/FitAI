import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  UIMessage,
} from 'ai';
import { fromNodeHeaders } from 'better-auth/node';
import { FastifyInstance } from 'fastify';
import z from 'zod';

import { WeekDay } from '../generated/prisma/enums.js';
import { auth } from '../lib/auth.js';
import { CreateWorkoutPlan } from '../usecases/CreateWorkoutPlan.js';
import { GetUserTrainData } from '../usecases/GetUserTrainData.js';
import { GetWorkoutPlans } from '../usecases/GetWorkoutPlans.js';
import { UpsertUserTrainData } from '../usecases/UpsertUserTrainData.js';

export const aiRoutes = async (app: FastifyInstance) => {
  app.post('/ai', async function (request, reply) {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      return reply.status(401).send({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }

    const { messages } = request.body as { messages: UIMessage[] };
    const result = streamText({
      model: google('gemini-2.5-flash-lite'),
      system: `Você é um personal trainer virtual especialista em montagem de planos de treino.
Seu tom é amigável, motivador, usa linguagem simples e sem jargões técnicos, pois seu público é leigo.

REGRAS CRÍTICAS:
1. SEMPRE chame a tool 'getUserTrainData' antes de qualquer interação com o usuário para saber quem ele é.
2. Se o usuário NÃO tem dados cadastrados (retornou null): pergunte nome, peso (kg), altura (cm), idade e % de gordura corporal em uma única mensagem, de forma simples e direta. Após receber, use a tool 'updateUserTrainData' (converta peso de kg para gramas).
3. Se o usuário JÁ tem dados: cumprimente-o pelo nome.
4. Para criar um plano: pergunte objetivo, dias disponíveis por semana e restrições/lesões de forma simples.
5. O plano DEVE ter exatamente 7 dias (MONDAY a SUNDAY). Dias sem treino: isRest: true, exercises: [], estimatedDurationInSeconds: 0.
6. Use a tool 'createWorkoutPlan' para salvar o plano.
7. Respostas curtas e objetivas.

DIVISÕES DE TREINO (SPLITS):
- 2-3 dias/semana: Full Body ou ABC (A: Peito+Tríceps, B: Costas+Bíceps, C: Pernas+Ombros)
- 4 dias/semana: Upper/Lower ou ABCD (A: Peito+Tríceps, B: Costas+Bíceps, C: Pernas, D: Ombros+Abdômen)
- 5 dias/semana: PPLUL (Push/Pull/Legs + Upper/Lower)
- 6 dias/semana: PPL 2x (Push/Pull/Legs repetido)

PRINCÍPIOS DE MONTAGEM:
- Músculos sinérgicos juntos.
- Compostos primeiro, isoladores depois.
- 4 a 8 exercícios por sessão.
- 3-4 séries, 8-12 reps (hipertrofia) ou 4-6 reps (força).
- Descanso: 60-90s (hipertrofia), 2-3min (compostos pesados).
- Nomes descritivos (ex: "Superior A - Peito e Costas").

IMAGENS DE CAPA (coverImageUrl) - OBRIGATÓRIO:
- Superior (Peito, Costas, Ombros, Braços, Push, Pull, Upper, Full Body, Descanso):
  - https://gw8hy3fdcv.ufs.sh/f/ccoBDpLoAPCO3y8pQ6GBg8iqe9pP2JrHjwd1nfKtVSQskI0v
  - https://gw8hy3fdcv.ufs.sh/f/ccoBDpLoAPCOW3fJmqZe4yoUcwvRPQa8kmFprzNiC30hqftL
- Inferior (Pernas, Glúteos, Quadríceps, Posterior, Panturrilha, Legs, Lower):
  - https://gw8hy3fdcv.ufs.sh/f/ccoBDpLoAPCOgCHaUgNGronCvXmSzAMs1N3KgLdE5yHT6Ykj
  - https://gw8hy3fdcv.ufs.sh/f/ccoBDpLoAPCO85RVu3morROwZk5NPhs1jzH7X8TyEvLUCGxY
Alterne entre as duas opções de cada categoria.`,
      tools: {
        getUserTrainData: tool({
          description:
            'Recupera os dados de treino e perfil do usuário logado.',
          inputSchema: z.object({}),
          execute: async () => {
            const usecase = new GetUserTrainData();
            return await usecase.execute(session.user.id);
          },
        }),
        updateUserTrainData: tool({
          description:
            'Cria ou atualiza os dados de perfil e treino do usuário.',
          inputSchema: z.object({
            weightInGrams: z.number().describe('Peso em gramas'),
            heightInCentimeters: z.number().describe('Altura em centímetros'),
            age: z.number().describe('Idade'),
            bodyFatPercentage: z
              .number()
              .describe('Percentual de gordura (0 a 1)'),
          }),
          execute: async (params) => {
            const usecase = new UpsertUserTrainData();
            return await usecase.execute({
              userId: session.user.id,
              ...params,
            });
          },
        }),
        getWorkoutPlans: tool({
          description: 'Lista os planos de treino do usuário.',
          inputSchema: z.object({}),
          execute: async () => {
            const usecase = new GetWorkoutPlans();
            return await usecase.execute({ userId: session.user.id });
          },
        }),
        createWorkoutPlan: tool({
          description: 'Cria um novo plano de treino completo de 7 dias.',
          inputSchema: z.object({
            name: z.string().describe('Nome do plano de treino'),
            workoutDays: z
              .array(
                z.object({
                  name: z.string().describe('Nome do dia (ex: Superior A)'),
                  weekDay: z.enum(WeekDay).describe('Dia da semana'),
                  isRest: z.boolean().describe('Se é dia de descanso'),
                  estimatedDurationInSeconds: z
                    .number()
                    .describe('Duração em segundos'),
                  coverImageUrl: z.string().describe('URL da imagem de capa'),
                  exercises: z.array(
                    z.object({
                      order: z.number().describe('Ordem'),
                      name: z.string().describe('Nome do exercício'),
                      sets: z.number().describe('Séries'),
                      reps: z.number().describe('Repetições'),
                      restTimeInSeconds: z
                        .number()
                        .describe('Descanso em segundos'),
                    }),
                  ),
                }),
              )
              .length(7),
          }),
          execute: async (params) => {
            const usecase = new CreateWorkoutPlan();
            return await usecase.execute({
              userId: session.user.id,
              ...params,
            });
          },
        }),
      },
      stopWhen: stepCountIs(5),
      messages: await convertToModelMessages(messages),
    });

    // AI SDK v6: useChat espera UI message stream protocol
    return result.toUIMessageStreamResponse();
  });
};
