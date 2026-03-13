import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../errors/index.js';
import { prisma } from '../lib/db.js';

interface CompleteWorkoutSessionInputDto {
  userId: string;
  workoutPlanId: string;
  workoutDayId: string;
  sessionId: string;
  completedAt: Date;
}

interface CompleteWorkoutSessionOutputDto {
  id: string;
  completedAt: Date;
  startedAt: Date;
}

export class CompleteWorkoutSession {
  async execute(
    dto: CompleteWorkoutSessionInputDto
  ): Promise<CompleteWorkoutSessionOutputDto> {
    const workoutPlan = await prisma.workoutPlan.findUnique({
      where: { id: dto.workoutPlanId },
    });

    if (!workoutPlan) {
      throw new NotFoundError('Workout plan not found');
    }

    if (workoutPlan.userId !== dto.userId) {
      throw new UnauthorizedError('User does not own this workout plan');
    }

    const workoutDay = await prisma.workoutDay.findUnique({
      where: {
        id: dto.workoutDayId,
        workoutPlanId: dto.workoutPlanId,
      },
    });

    if (!workoutDay) {
      throw new NotFoundError('Workout day not found in this plan');
    }

    const session = await prisma.workoutSession.findUnique({
      where: {
        id: dto.sessionId,
      },
    });

    // Validamos se a sessão existe e se pertence ao dia correto
    if (!session || session.workoutDayid !== dto.workoutDayId) {
      throw new NotFoundError('Workout session not found for this day');
    }

    if (session.completedAt) {
      throw new ConflictError('Session is already completed');
    }

    if (dto.completedAt < session.startedAt) {
      throw new BadRequestError('Completion date cannot be before start date');
    }

    const updatedSession = await prisma.workoutSession.update({
      where: { id: dto.sessionId },
      data: {
        completedAt: dto.completedAt,
      },
    });

    return {
      id: updatedSession.id,
      completedAt: updatedSession.completedAt!,
      startedAt: updatedSession.startedAt,
    };
  }
}
