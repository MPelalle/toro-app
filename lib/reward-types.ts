export type ToroReward = {
  id: "routine" | "diet" | "habit" | "streak10" | "month" | "streak100";
  title: string;
  discount: 10 | 20 | 50 | 100;
  description: string;
  progress: number;
  progressLabel: string;
  unlocked: boolean;
  /** A checkout integration must issue this value per user. */
  code: string | null;
};

export type ToroRewards = {
  rewards: ToroReward[];
  highestUnlocked: ToroReward | null;
};
