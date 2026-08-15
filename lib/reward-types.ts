export type ToroReward = {
  id: "routine" | "diet" | "habit" | "streak10" | "month" | "streak100";
  title: string;
  discount: 10 | 20 | 50 | 100;
  description: string;
  progress: number;
  progressLabel: string;
  unlocked: boolean;
  code: string;
};

export type ToroRewards = {
  rewards: ToroReward[];
  highestUnlocked: ToroReward | null;
};
