import { NotFoundError, UnauthorizedError } from '../errors/index.js';
import { prisma } from '../lib/db.js';

interface GetWorkoutPlanByIdInputDto {
  userId: string;
  workoutPlanId: string;
}

interface GetWorkoutPlanByIdOutputDto {
  id: string;
  name: string;
  workoutDays: Array<{
    id: string;
    weekDay: string;
    name: string;
    isRest: boolean;
    coverImageUrl?: string | null;
    estimatedDurationInSeconds: number;
    exercisesCount: number;
  }>;
}

export class GetWorkoutPlanById {
  async execute(
    dto: GetWorkoutPlanByIdInputDto
  ): Promise<GetWorkoutPlanByIdOutputDto> {
    const workoutPlan = await prisma.workoutPlan.findUnique({
      where: { id: dto.workoutPlanId },
      include: {
        workoutDays: {
          include: {
            _count: {
              select: { exercises: true },
            },
          },
        },
      },
    });

    if (!workoutPlan) {
      throw new NotFoundError('Workout plan not found');
    }

    if (workoutPlan.userId !== dto.userId) {
      throw new UnauthorizedError('User does not own this workout plan');
    }

    return {
      id: workoutPlan.id,
      name: workoutPlan.name,
      workoutDays: workoutPlan.workoutDays.map((day) => ({
        id: day.id,
        weekDay: day.weekDay,
        name: day.name,
        isRest: day.isRest,
        coverImageUrl: day.coverImageUrl,
        estimatedDurationInSeconds: day.estimatedDurationInSeconds,
        exercisesCount: day._count.exercises,
      })),
    };
  }
}
