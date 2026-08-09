import { getCurrentUser } from "@/lib/auth";
import { FRIEND_LIMIT, acceptedFriendCount, listFriends, listPendingRequests, listSharedRoutines } from "@/lib/community";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const [friends, requests, routines, friendCount] = await Promise.all([listFriends(user.id), listPendingRequests(user.id), listSharedRoutines(user.id), acceptedFriendCount(user.id)]);
  return Response.json({
    friends,
    requests,
    routines: routines.map((routine) => ({
      id: routine.id, name: routine.name, type: routine.type, days: Array.isArray(routine.days) ? routine.days : [], exerciseCount: routine.exercises.length, updatedAt: routine.updatedAt.toISOString(), updatedBy: routine.updatedBy?.nickname || routine.updatedBy?.name || null, canReview: routine.userId === user.id,
      members: routine.members.map((member) => ({ id: member.userId, name: member.user.name || member.user.nickname || "Atleta", nickname: member.user.nickname, avatarUrl: member.user.avatarUrl })),
    })),
    friendCount,
    friendLimit: FRIEND_LIMIT,
  }, { headers: { "Cache-Control": "no-store" } });
}
