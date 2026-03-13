# FitAI - Projeto de Gestão de Treinos

## Project Overview
FitAI é uma API para gestão de planos de treino, desenvolvida como parte de um bootcamp do FSC. A aplicação permite a criação e gerenciamento de planos de treino personalizados, incluindo dias de treino, exercícios, séries, repetições e tempos de descanso.

### Main Technologies
- **Backend:** [Fastify](https://fastify.dev/) (Framework web de alta performance)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Database:** [PostgreSQL](https://www.postgresql.org/) via [Prisma ORM](https://www.prisma.io/)
- **Validation:** [Zod](https://zod.dev/) com `fastify-type-provider-zod`
- **Authentication:** [Better-auth](https://www.better-auth.com/)
- **Documentation:** [Swagger](https://swagger.io/) & [Scalar](https://scalar.com/) (disponível em `/docs`)
- **Infrastructure:** [Docker Compose](https://docs.docker.com/compose/) (PostgreSQL)

### Architecture
O projeto segue uma estrutura baseada em casos de uso (Use Cases) e rotas separadas:
- `src/index.ts`: Ponto de entrada e configuração do servidor.
- `src/usecases/`: Contém a lógica de negócio (ex: `CreateWorkoutPlan.ts`).
- `src/routes/`: Definições de rotas Fastify.
- `src/schemas/`: Esquemas de validação Zod.
- `src/lib/`: Configurações de bibliotecas (Prisma client, Auth).
- `src/generated/prisma`: Localização personalizada para o código gerado pelo Prisma.

## Building and Running

### Prerequisites
- Node.js v24.x
- pnpm v10.x
- Docker & Docker Compose

### Commands

| Ação | Comando |
| :--- | :--- |
| Instalar dependências | `pnpm install` |
| Subir Banco de Dados | `docker-compose up -d` |
| Gerar Prisma Client | `pnpm prisma generate` |
| Executar em Desenvolvimento | `pnpm dev` |
| Linting | `pnpm eslint .` (via CLI local) |

## Development Conventions

### Coding Style
- **Imports:** Ordenação automática via `eslint-plugin-simple-import-sort`.
- **Validation:** Sempre utilizar Zod para validar `body`, `querystring` e `params` nas rotas Fastify.
- **Errors:** Utilizar classes de erro customizadas em `src/errors/` (ex: `NotFoundError`).
- **Prisma:** O Prisma Client é gerado em `src/generated/prisma`. Use `import { prisma } from '../lib/db.js'` para acessar o banco.

### Testing Practices
- TODO: Definir framework e padrões de teste (atualmente não há testes configurados no `package.json`).

### Database
- As migrações devem ser gerenciadas via Prisma Migrate.
- O banco de dados PostgreSQL roda via Docker na porta `5432`.
