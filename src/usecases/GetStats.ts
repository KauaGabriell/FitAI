import dayjs from 'dayjs';

import { WeekDay } from '../generated/prisma/enums.js';
import { prisma } from '../lib/db.js';

interface GetStatsInputDto {
  userId: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

interface GetStatsOutputDto {
  workoutStreak: number;
  consistencyByDay: {
    [key: string]: {
      workoutDayCompleted: boolean;
      workoutDayStarted: boolean;
    };
  };
  completedWorkoutsCount: number;
  conclusionRate: number;
  totalTimeInSeconds: number;
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

export class GetStats {
  async execute(dto: GetStatsInputDto): Promise<GetStatsOutputDto> {
    const fromDate = dayjs(dto.from).startOf('day');
    const toDate = dayjs(dto.to).endOf('day');

    // 1. Fetch sessions within range
    const sessionsInRange = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlan: {
            userId: dto.userId,
          },
        },
        startedAt: {
          gte: fromDate.toDate(),
          lte: toDate.toDate(),
        },
      },
    });

    const consistencyByDay: GetStatsOutputDto['consistencyByDay'] = {};
    let completedWorkoutsCount = 0;
    let totalTimeInSeconds = 0;

    sessionsInRange.forEach((session) => {
      const dateKey = dayjs(session.startedAt).format('YYYY-MM-DD');
      const isCompleted = session.completedAt !== null;

      if (!consistencyByDay[dateKey]) {
        consistencyByDay[dateKey] = {
          workoutDayStarted: true,
          workoutDayCompleted: isCompleted,
        };
      } else {
        if (isCompleted) {
          consistencyByDay[dateKey].workoutDayCompleted = true;
        }
      }

      if (isCompleted && session.completedAt) {
        completedWorkoutsCount++;
        const duration = dayjs(session.completedAt).diff(
          dayjs(session.startedAt),
          'second'
        );
        totalTimeInSeconds += duration;
      }
    });

    const totalSessions = sessionsInRange.length;
    const conclusionRate = totalSessions > 0 ? completedWorkoutsCount / totalSessions : 0;

    // 2. Workout Streak
    // Following GetHomeData logic: calculate streak as of toDate (or today if toDate is in future?)
    // The requirement is "número de dias em sequência que o usuário completou algum dia de treino".
    // I'll calculate it backwards from toDate.
    
    // Fetch all completed sessions of the user
    const allCompletedSessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlan: { userId: dto.userId },
        },
        completedAt: { not: null },
      },
      select: { startedAt: true },
    });

    const completedDates = new Set(
      allCompletedSessions.map((s) => dayjs(s.startedAt).format('YYYY-MM-DD'))
    );

    // Fetch active workout plan's rest days
    const activePlan = await prisma.workoutPlan.findFirst({
      where: {
        userId: dto.userId,
        isActive: true,
      },
      include: {
        workoutDays: {
          where: { isRest: true },
          select: { weekDay: true },
        },
      },
    });

    const restWeekDays = new Set(
      activePlan?.workoutDays.map((d) => d.weekDay) || []
    );

    let streak = 0;
    let checkDate = dayjs(dto.to).startOf('day');

    // If toDate is in the future, we probably want the streak up to today.
    // But usually for "stats" for a period, we want it up to the end of the period.
    const now = dayjs();
    if (checkDate.isAfter(now)) {
      checkDate = now.startOf('day');
    }

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

      if (streak > 3650) break;
    }

    return {
      workoutStreak: streak,
      consistencyByDay,
      completedWorkoutsCount,
      conclusionRate,
      totalTimeInSeconds,
    };
  }
}
