import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js';

import { WeekDay } from '../generated/prisma/enums.js';
import { prisma } from '../lib/db.js';

dayjs.extend(isSameOrBefore);

interface GetHomeDataInputDto {
  userId: string;
  date: string; // YYYY-MM-DD
}

interface GetHomeDataOutputDto {
  activeWorkoutPlanId: string | null;
  todayWorkoutDay: {
    workoutPlanId: string;
    id: string;
    name: string;
    isRest: boolean;
    weekDay: string;
    estimatedDurationInSeconds: number;
    coverImageUrl?: string | null;
    exercisesCount: number;
  } | null;
  workoutStreak: number;
  consistencyByDay: {
    [key: string]: {
      workoutDayCompleted: boolean;
      workoutDayStarted: boolean;
    };
  };
}

const weekDayMap: Record<number, WeekDay> = {
  0: WeekDay.SUNDAY,
  1: WeekDay.MONDAY,
  2: WeekDay.TUESDAY,
  3: WeekDay.WEDNESDAY,
  4: WeekDay.THURSDAY,
  5: WeekDay.FRIDAY,
  6: WeekDay.SATURDAY,
};

export class GetHomeData {
  async execute(dto: GetHomeDataInputDto): Promise<GetHomeDataOutputDto> {
    const targetDate = dayjs(dto.date).startOf('day');
    
    // 1. Get Active Workout Plan
    const activePlan = await prisma.workoutPlan.findFirst({
      where: {
        userId: dto.userId,
        isActive: true,
      },
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

    // 2. Today's Workout Day
    let todayWorkoutDay: GetHomeDataOutputDto['todayWorkoutDay'] = null;
    if (activePlan) {
      const currentWeekDay = weekDayMap[targetDate.day()];
      const dayData = activePlan.workoutDays.find(
        (d) => d.weekDay === currentWeekDay
      );

      if (dayData) {
        todayWorkoutDay = {
          workoutPlanId: activePlan.id,
          id: dayData.id,
          name: dayData.name,
          isRest: dayData.isRest,
          weekDay: dayData.weekDay,
          estimatedDurationInSeconds: dayData.estimatedDurationInSeconds,
          coverImageUrl: dayData.coverImageUrl,
          exercisesCount: dayData._count.exercises,
        };
      }
    }

    // 3. Consistency By Day (Sunday to Saturday of the target date's week)
    const startOfWeek = targetDate.startOf('week'); // Sunday
    const endOfWeek = targetDate.endOf('week'); // Saturday

    const sessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlan: {
            userId: dto.userId,
          },
        },
        startedAt: {
          gte: startOfWeek.toDate(),
          lte: endOfWeek.toDate(),
        },
      },
    });

    const consistencyByDay: GetHomeDataOutputDto['consistencyByDay'] = {};
    for (let i = 0; i <= 6; i++) {
      const currentDay = startOfWeek.add(i, 'day');
      const dateKey = currentDay.format('YYYY-MM-DD');
      
      const daySessions = sessions.filter((s) => 
        dayjs(s.startedAt).isSame(currentDay, 'day')
      );

      consistencyByDay[dateKey] = {
        workoutDayStarted: daySessions.length > 0,
        workoutDayCompleted: daySessions.some((s) => s.completedAt !== null),
      };
    }

    // 4. Workout Streak
    // Logic: Look backwards from targetDate. 
    // A day counts if: 1) A session was completed OR 2) It's a REST day in the ACTIVE plan.
    let streak = 0;
    let checkDate = targetDate;
    
    // To optimize, fetch all completed sessions and active plan's rest days
    const completedSessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlan: { userId: dto.userId }
        },
        completedAt: { not: null }
      },
      select: { startedAt: true }
    });

    const completedDates = new Set(
      completedSessions.map(s => dayjs(s.startedAt).format('YYYY-MM-DD'))
    );

    const restWeekDays = new Set(
      activePlan?.workoutDays.filter(d => d.isRest).map(d => d.weekDay) || []
    );

    // Iterate backwards
    while (true) {
      const dateStr = checkDate.format('YYYY-MM-DD');
      const isCompleted = completedDates.has(dateStr);
      const isRestDay = restWeekDays.has(weekDayMap[checkDate.day()]);

      if (isCompleted || isRestDay) {
        streak++;
        checkDate = checkDate.subtract(1, 'day');
      } else {
        break;
      }

      // Safety break to prevent infinite loop if data is weird
      if (streak > 3650) break; 
    }

    return {
      activeWorkoutPlanId: activePlan?.id || null,
      todayWorkoutDay,
      workoutStreak: streak,
      consistencyByDay,
    };
  }
}
