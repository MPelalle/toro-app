export type BadgeId = "streak" | "routine" | "diet" | "habits";
export type BadgeTier = 0 | 1 | 2 | 3 | 4;

export type UserBadge = {
  id: BadgeId;
  name: string;
  description: string;
  abbreviation: string;
  tier: BadgeTier;
  tierName: "BLOQUEADA" | "BRONCE" | "PLATA" | "ORO" | "VIOLETA";
  current: number;
  nextTarget: number | null;
  unlocked: boolean;
};

type BadgeDefinition = Omit<UserBadge, "tier" | "tierName" | "current" | "nextTarget" | "unlocked"> & {
  thresholds: readonly [number, number, number, number];
};

const definitions: Record<BadgeId, BadgeDefinition> = {
  streak: {
    id: "streak",
    name: "Racha de ingreso",
    description: "10 dias seguidos entrando a la app",
    abbreviation: "R",
    thresholds: [10, 30, 50, 70],
  },
  routine: {
    id: "routine",
    name: "Acero semanal",
    description: "1 semana de entrenamiento",
    abbreviation: "T",
    thresholds: [1, 3, 5, 10],
  },
  diet: {
    id: "diet",
    name: "Nutricion de elite",
    description: "1 semana de dieta completa",
    abbreviation: "D",
    thresholds: [1, 3, 5, 10],
  },
  habits: {
    id: "habits",
    name: "Constructor de habitos",
    description: "5 habitos completados",
    abbreviation: "H",
    thresholds: [5, 15, 25, 50],
  },
};

const tierNames: UserBadge["tierName"][] = ["BLOQUEADA", "BRONCE", "PLATA", "ORO", "VIOLETA"];

export type BadgeMetrics = Record<BadgeId, number>;

export function buildUserBadges(metrics: BadgeMetrics): UserBadge[] {
  return (Object.keys(definitions) as BadgeId[]).map((id) => {
    const definition = definitions[id];
    const current = Math.max(0, metrics[id]);
    const tier = definition.thresholds.reduce<BadgeTier>((level, threshold, index) => current >= threshold ? (index + 1) as BadgeTier : level, 0);
    const nextTarget = definition.thresholds.find((threshold) => current < threshold) ?? null;

    return {
      id,
      name: definition.name,
      description: definition.description,
      abbreviation: definition.abbreviation,
      tier,
      tierName: tierNames[tier],
      current,
      nextTarget,
      unlocked: tier > 0,
    };
  });
}

export function withBadgeTier(badge: UserBadge, tier: BadgeTier): UserBadge {
  const nextTarget = tier === 4 ? null : definitions[badge.id].thresholds[tier];

  return {
    ...badge,
    tier,
    tierName: tierNames[tier],
    nextTarget,
    unlocked: tier > 0,
  };
}
