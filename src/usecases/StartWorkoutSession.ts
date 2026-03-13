import { ConflictError, NotFoundError, UnauthorizedError, WorkoutPlanNotActiveError } from '../errors/index.js';
import { prisma } from '../lib/db.js';

interface StartWorkoutSessionInputDto {
  userId: string;
  workoutPlanId: string;
  workoutDayId: string;
}

interface StartWorkoutSessionOutputDto {
  userWorkoutSessionId: string;
}

export class StartWorkoutSession {
  async execute(dto: StartWorkoutSessionInputDto): Promise<StartWorkoutSessionOutputDto> {
    const workoutPlan = await prisma.workoutPlan.findUnique({
      where: { id: dto.workoutPlanId },
    });

    if (!workoutPlan) {
      throw new NotFoundError('Workout plan not found');
    }

    if (workoutPlan.userId !== dto.userId) {
      throw new UnauthorizedError('User does not own this workout plan');
    }

    if (!workoutPlan.isActive) {
      throw new WorkoutPlanNotActiveError();
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

    const existingSession = await prisma.workoutSession.findFirst({
      where: {
        workoutDayid: dto.workoutDayId,
        completedAt: null,
      },
    });

    if (existingSession) {
      throw new ConflictError('A session is already started for this day');
    }

    const session = await prisma.workoutSession.create({
      data: {
        workoutDayid: dto.workoutDayId,
        startedAt: new Date(),
      },
    });

    return {
      userWorkoutSessionId: session.id,
    };
  }
}
