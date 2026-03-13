import { NotFoundError, UnauthorizedError } from '../errors/index.js';
import { prisma } from '../lib/db.js';

interface GetWorkoutDayDetailsInputDto {
  userId: string;
  workoutPlanId: string;
  workoutDayId: string;
}

interface GetWorkoutDayDetailsOutputDto {
  id: string;
  name: string;
  isRest: boolean;
  coverImageUrl?: string | null;
  estimatedDurationInSeconds: number;
  exercises: Array<{
    id: string;
    order: number;
    name: string;
    sets: number;
    reps: number;
    restTimeInSeconds: number;
    workoutDayId: string;
  }>;
  weekDay: string;
  sessions: Array<{
    id: string;
    workoutDayId: string;
    startedAt: Date;
    completedAt?: Date | null;
  }>;
}

export class GetWorkoutDayDetails {
  async execute(
    dto: GetWorkoutDayDetailsInputDto
  ): Promise<GetWorkoutDayDetailsOutputDto> {
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
      include: {
        exercises: true,
        sessions: true,
      },
    });

    if (!workoutDay) {
      throw new NotFoundError('Workout day not found in this plan');
    }

    return {
      id: workoutDay.id,
      name: workoutDay.name,
      isRest: workoutDay.isRest,
      coverImageUrl: workoutDay.coverImageUrl,
      estimatedDurationInSeconds: workoutDay.estimatedDurationInSeconds,
      weekDay: workoutDay.weekDay,
      exercises: workoutDay.exercises.map((ex) => ({
        id: ex.id,
        order: ex.order,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        restTimeInSeconds: ex.restTimeInSeconds,
        workoutDayId: ex.workoutDayId,
      })),
      sessions: workoutDay.sessions.map((s) => ({
        id: s.id,
        workoutDayId: s.workoutDayid,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
      })),
    };
  }
}
