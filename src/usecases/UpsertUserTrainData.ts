import { prisma } from '../lib/db.js';

export interface UpsertUserTrainDataInputDto {
  userId: string;
  weightInGrams: number;
  heightInCentimeters: number;
  age: number;
  bodyFatPercentage: number; // 1 representa 100%
}

export interface UpsertUserTrainDataOutputDto {
  userId: string;
  weightInGrams: number;
  heightInCentimeters: number;
  age: number;
  bodyFatPercentage: number;
}

export class UpsertUserTrainData {
  async execute(
    dto: UpsertUserTrainDataInputDto,
  ): Promise<UpsertUserTrainDataOutputDto> {
    const user = await prisma.user.update({
      where: { id: dto.userId },
      data: {
        weightInGrams: dto.weightInGrams,
        heightInCentimeters: dto.heightInCentimeters,
        age: dto.age,
        bodyFatPercentage: dto.bodyFatPercentage,
      },
    });

    return {
      userId: user.id,
      weightInGrams: user.weightInGrams ?? 0,
      heightInCentimeters: user.heightInCentimeters ?? 0,
      age: user.age ?? 0,
      bodyFatPercentage: user.bodyFatPercentage ?? 0,
    };
  }
}
