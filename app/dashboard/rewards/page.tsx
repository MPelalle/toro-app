import { getCurrentUser } from "@/lib/auth";
import { getToroRewards } from "@/lib/rewards";
import { RewardsPanel } from "@/components/rewards/RewardsPanel";

export default async function RewardsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const rewards = await getToroRewards(user.id);
  return <main className="min-h-dvh bg-[#090a08] px-4 pb-36 pt-28 text-white sm:px-8"><div className="mx-auto max-w-4xl"><RewardsPanel rewards={rewards}/></div></main>;
}
