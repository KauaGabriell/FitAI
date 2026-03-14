import { prisma } from '../lib/db.js';

export interface GetUserTrainDataOutputDto {
  userId: string;
  userName: string;
  weightInGrams: number;
  heightInCentimeters: number;
  age: number;
  bodyFatPercentage: number; // 1 representa 100%
}

export class GetUserTrainData {
  async execute(userId: string): Promise<GetUserTrainDataOutputDto | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        weightInGrams: true,
        heightInCentimeters: true,
        age: true,
        bodyFatPercentage: true,
      },
    });

    if (!user) {
      return null;
    }

    if (
      user.weightInGrams === null &&
      user.heightInCentimeters === null &&
      user.age === null &&
      user.bodyFatPercentage === null
    ) {
      return null;
    }

    return {
      userId: user.id,
      userName: user.name,
      weightInGrams: user.weightInGrams ?? 0,
      heightInCentimeters: user.heightInCentimeters ?? 0,
      age: user.age ?? 0,
      bodyFatPercentage: user.bodyFatPercentage ?? 0,
    };
  }
}
