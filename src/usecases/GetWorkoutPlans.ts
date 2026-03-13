import { prisma } from '../lib/db.js';

interface GetWorkoutPlansInputDto {
  userId: string;
  isActive?: boolean;
}

interface GetWorkoutPlansOutputDto {
  id: string;
  name: string;
  isActive: boolean;
  coverImageUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  workoutDays: Array<{
    id: string;
    name: string;
    isRest: boolean;
    weekDay: string;
    coverImageUrl?: string | null;
    estimatedDurationInSeconds: number;
    exercises: Array<{
      id: string;
      order: number;
      name: string;
      sets: number;
      reps: number;
      restTimeInSeconds: number;
    }>;
  }>;
}

export class GetWorkoutPlans {
  async execute(
    dto: GetWorkoutPlansInputDto
  ): Promise<GetWorkoutPlansOutputDto[]> {
    const workoutPlans = await prisma.workoutPlan.findMany({
      where: {
        userId: dto.userId,
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        workoutDays: {
          include: {
            exercises: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return workoutPlans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      isActive: plan.isActive,
      coverImageUrl: plan.coverImageUrl,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      workoutDays: plan.workoutDays.map((day) => ({
        id: day.id,
        name: day.name,
        isRest: day.isRest,
        weekDay: day.weekDay,
        coverImageUrl: day.coverImageUrl,
        estimatedDurationInSeconds: day.estimatedDurationInSeconds,
        exercises: day.exercises.map((exercise) => ({
          id: exercise.id,
          order: exercise.order,
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          restTimeInSeconds: exercise.restTimeInSeconds,
        })),
      })),
    }));
  }
}
