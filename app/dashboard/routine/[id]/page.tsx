"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Dumbbell,
  History,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Search,
  Sparkles,
  Square,
  TimerReset,
  Trash2,
  Trophy,
  WifiOff,
  X,
} from "lucide-react";
import { type ChangeEvent, useEffect, useState } from "react";
import {
  createClientId,
  createFreeWorkoutSession,
  createWorkoutSession,
  getActiveWorkoutSession,
  getRecentWorkoutSessions,
  isOfflineUserReady,
  OfflineWorkoutSession,
  refreshRoutineHistory,
  saveWorkoutSession,
  setWorkoutInProgress,
  syncPendingSessions,
} from "@/lib/offline";
import {
  createRoutineOfflineFirst,
  getRoutineOfflineFirst,
  Routine,
  updateRoutineOfflineFirst,
} from "@/lib/routines";
import {
  buildExerciseCoaching,
  buildSessionFeedback,
  type ExerciseCoaching,
  type PersonalRecord,
  type SessionFeedback,
} from "@/lib/training-coach";
import { ExerciseVideoModal } from "@/components/workout/ExerciseVideoModal";
import { PlateCalculator } from "@/components/workout/PlateCalculator";
import {
  exerciseOptions,
  muscleGroups,
  type ExerciseOption,
} from "@/lib/exercise-catalog";
import {
  getActiveUserSyncMetadata,
  setActiveUserSyncMetadata,
} from "@/lib/offline/repositories/metadata";

const ShareWorkoutButton = dynamic(
  () =>
    import("@/components/workout/share/ShareWorkoutButton").then(
      (module) => module.ShareWorkoutButton,
    ),
  { ssr: false },
);
const PostWorkoutFlow = dynamic(
  () =>
    import("@/components/workout/PostWorkoutFlow").then(
      (module) => module.PostWorkoutFlow,
    ),
  { ssr: false },
);

type SetKind = "WARMUP" | "NORMAL" | "DROP" | "FAILURE";
type SetPatch = {
  reps?: number | null;
  weight?: number | null;
  rir?: number | null;
  rpe?: number | null;
  kind?: SetKind;
  note?: string | null;
  completed?: boolean;
};
type WorkoutStats = {
  streak: number;
  exercises: Array<{
    name: string;
    muscle: string;
    bestWeight: number;
    estimatedOneRepMax: number;
    history: Array<{ date: string; volume: number }>;
  }>;
  muscles: Array<{ name: string; sets: number }>;
};

const setKindLabels: Record<SetKind, string> = {
  WARMUP: "Calentamiento",
  NORMAL: "Normal",
  DROP: "Descendente",
  FAILURE: "Al fallo",
};

function syncCopy(session: OfflineWorkoutSession) {
  if (session.syncStatus === "synced") return "Sincronizado.";
  if (session.syncStatus === "syncing") return "Sincronizando cambios…";
  if (session.syncStatus === "failed")
    return "Error de sincronización. El entrenamiento sigue guardado en el dispositivo.";
  if (session.syncStatus === "conflict")
    return "Conflicto detectado. El entrenamiento local se conserva.";
  return "Guardado en el dispositivo. Pendiente de sincronización.";
}

function secondsLabel(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function isValidNumericPatch(
  value: number | null | undefined,
  min: number,
  max: number,
  integer = false,
) {
  return (
    value === undefined ||
    value === null ||
    (Number.isFinite(value) &&
      value >= min &&
      value <= max &&
      (!integer || Number.isInteger(value)))
  );
}

function isValidSetPatch(patch: SetPatch) {
  return (
    isValidNumericPatch(patch.reps, 0, 100, true) &&
    isValidNumericPatch(patch.weight, 0, 1_000) &&
    isValidNumericPatch(patch.rir, 0, 10, true) &&
    isValidNumericPatch(patch.rpe, 1, 10, true)
  );
}

export default function RoutineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isFreeWorkout = id === "free";
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [session, setSession] = useState<OfflineWorkoutSession | null>(null);
  const [history, setHistory] = useState<OfflineWorkoutSession[]>([]);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTrainingDay, setSelectedTrainingDay] = useState<string | null>(
    null,
  );
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [restDuration, setRestDuration] = useState(90);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [statsRefresh, setStatsRefresh] = useState(0);
  const [postWorkoutOpen, setPostWorkoutOpen] = useState(false);
  const [picker, setPicker] = useState<{
    mode: "add" | "replace";
    exerciseId?: string;
    applyToRoutine?: boolean;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    let routineRequest = 0;
    let sessionRequest = 0;
    const unavailableRoutineMessage =
      "Esta rutina todavía no está disponible sin conexión.";
    const identityReady = async () => isOfflineUserReady().catch(() => false);
    const applyRoutine = (
      routineResult: Awaited<ReturnType<typeof getRoutineOfflineFirst>>,
    ) => {
      if (!mounted) return;
      setRoutine(routineResult.routine || null);
      setOffline(routineResult.source === "cache");
      if (!routineResult.routine) setError(unavailableRoutineMessage);
      else
        setError((current) =>
          current === unavailableRoutineMessage ? "" : current,
        );
    };
    const applyActiveSession = (
      activeSession: OfflineWorkoutSession | undefined,
    ) => {
      if (mounted) setSession(activeSession || null);
    };
    const reloadRoutine = async () => {
      const request = ++routineRequest;
      if (!(await identityReady()) || !mounted || request !== routineRequest)
        return;
      if (isFreeWorkout) {
        setRoutine({
          id: "free",
          name: "Entrenamiento libre",
          type: "Personalizada",
          days: ["Hoy"],
          active: false,
          exercises: [],
          createdAt: new Date().toISOString(),
        });
        setOffline(false);
        setLoading(false);
        return;
      }
      try {
        const routineResult = await getRoutineOfflineFirst(id, (remote) => {
          if (mounted && request === routineRequest) {
            setRoutine(remote);
            setOffline(false);
            setError((current) =>
              current === unavailableRoutineMessage ? "" : current,
            );
          }
        });
        if (mounted && request === routineRequest) applyRoutine(routineResult);
      } catch {
        if (mounted && request === routineRequest)
          setError("No pudimos abrir la rutina.");
      } finally {
        if (mounted && request === routineRequest) setLoading(false);
      }
    };
    const reloadActiveSession = async () => {
      const request = ++sessionRequest;
      if (!(await identityReady()) || !mounted || request !== sessionRequest)
        return;
      try {
        const activeSession = await getActiveWorkoutSession(
          isFreeWorkout ? null : id,
        );
        if (mounted && request === sessionRequest)
          applyActiveSession(activeSession);
      } catch {
        // La rutina sigue disponible aunque el almacenamiento offline no responda.
      }
    };
    const onOfflineReadiness = () => {
      void reloadRoutine();
      void reloadActiveSession();
    };
    void reloadRoutine();
    void reloadActiveSession();
    window.addEventListener("toro-offline-readiness", onOfflineReadiness);
    return () => {
      mounted = false;
      window.removeEventListener("toro-offline-readiness", onOfflineReadiness);
    };
  }, [id, isFreeWorkout]);

  useEffect(() => {
    let mounted = true;
    let historyRequest = 0;
    let remoteHistoryRequested = false;
    const identityReady = async () => isOfflineUserReady().catch(() => false);
    const reloadHistory = async () => {
      const request = ++historyRequest;
      if (!(await identityReady()) || !mounted || request !== historyRequest)
        return;
      try {
        const sessions = await getRecentWorkoutSessions(
          isFreeWorkout ? null : id,
          24,
        );
        if (mounted && request === historyRequest) setHistory(sessions);
      } catch {
        // Conservamos el historial local más reciente si falla la actualización.
      }
    };
    const hydrateRemoteHistory = async () => {
      if (
        isFreeWorkout ||
        remoteHistoryRequested ||
        !(await identityReady()) ||
        !mounted
      )
        return;
      remoteHistoryRequested = true;
      try {
        await refreshRoutineHistory(id);
        if (mounted) await reloadHistory();
      } catch {
        if (mounted) remoteHistoryRequested = false;
      }
    };
    const onOfflineReadiness = (event: Event) => {
      void reloadHistory();
      if ((event as CustomEvent<{ state?: string }>).detail?.state === "ready")
        void hydrateRemoteHistory();
    };
    void reloadHistory();
    void hydrateRemoteHistory();
    window.addEventListener("toro-offline-readiness", onOfflineReadiness);
    return () => {
      mounted = false;
      window.removeEventListener("toro-offline-readiness", onOfflineReadiness);
    };
  }, [id, isFreeWorkout, statsRefresh]);

  useEffect(() => {
    let mounted = true;
    if (isFreeWorkout) {
      return () => {
        mounted = false;
      };
    }
    void fetch(`/api/workout-stats?routineId=${encodeURIComponent(id)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: WorkoutStats | null) => {
        if (mounted && data) setStats(data);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [id, isFreeWorkout, statsRefresh]);

  const restStorageKey = session ? `workout-rest:${session.id}` : null;
  useEffect(() => {
    if (!restStorageKey) return;
    let active = true;
    void getActiveUserSyncMetadata(restStorageKey)
      .then((record) => {
        const endsAt = record ? Number(record.value) : 0;
        if (active && Number.isFinite(endsAt) && endsAt > Date.now())
          setRestUntil(endsAt);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [restStorageKey]);
  useEffect(() => {
    if (!restUntil || !restStorageKey) return;
    const wait = Math.max(0, restUntil - Date.now());
    const timer = window.setTimeout(() => {
      setRestUntil(null);
      void setActiveUserSyncMetadata(restStorageKey, "0");
      if (typeof navigator !== "undefined" && "vibrate" in navigator)
        navigator.vibrate?.([80, 70, 120]);
    }, wait + 20);
    return () => window.clearTimeout(timer);
  }, [restStorageKey, restUntil]);
  const persist = async (next: OfflineWorkoutSession) => {
    const saved = await saveWorkoutSession(next);
    setSession(saved);
    void syncPendingSessions();
    return saved;
  };
  const startRest = async (seconds = restDuration) => {
    const endsAt = Date.now() + Math.max(15, Math.min(600, seconds)) * 1_000;
    setRestUntil(endsAt);
    if (restStorageKey)
      await setActiveUserSyncMetadata(restStorageKey, String(endsAt));
  };
  const cancelRest = () => {
    setRestUntil(null);
    if (restStorageKey) void setActiveUserSyncMetadata(restStorageKey, "0");
  };
  const start = async () => {
    if (!routine) return;
    if (isFreeWorkout) {
      try {
        await persist(createFreeWorkoutSession());
        setWorkoutInProgress(true);
      } catch {
        setError("No pudimos preparar el entrenamiento en este dispositivo.");
      }
      return;
    }
    const trainingDay = routine.days.includes(selectedTrainingDay ?? "")
      ? (selectedTrainingDay as string)
      : routine.days[0];
    const dayExercises = routine.exercises.filter(
      (exercise) => exercise.trainingDay === trainingDay,
    );
    if (!dayExercises.length) {
      setError(
        "Elegí un día que tenga ejercicios para iniciar el entrenamiento.",
      );
      return;
    }
    try {
      const next = createWorkoutSession({
        ...routine,
        exercises: dayExercises,
      });
      await persist(next);
      setWorkoutInProgress(true);
    } catch {
      setError("No pudimos preparar el entrenamiento en este dispositivo.");
    }
  };
  const updateSet = async (
    exerciseId: string,
    setId: string,
    patch: SetPatch,
  ) => {
    if (!session) return;
    if (!isValidSetPatch(patch)) {
      setError("Revisá el valor de la serie antes de guardarlo.");
      return;
    }
    const next = {
      ...session,
      exercises: session.exercises.map((exercise) =>
        exercise.id !== exerciseId
          ? exercise
          : {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id === setId ? { ...set, ...patch } : set,
              ),
            },
      ),
    };
    try {
      await persist(next);
      if (patch.completed !== undefined)
        window.dispatchEvent(new Event("toro-dashboard-stats-change"));
      if (patch.completed === true)
        void startRest(
          session.exercises.find((exercise) => exercise.id === exerciseId)
            ?.restSeconds ?? restDuration,
        );
    } catch {
      setError("El cambio no pudo guardarse localmente.");
    }
  };
  const addSet = async (exerciseId: string) => {
    if (!session) return;
    const now = new Date().toISOString();
    const next = {
      ...session,
      exercises: session.exercises.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;
        const last = exercise.sets.at(-1);
        return {
          ...exercise,
          sets: [
            ...exercise.sets,
            {
              id: createClientId(),
              userId: session.userId,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
              syncStatus: "pending" as const,
              lastSyncedAt: null,
              version: 1,
              sessionId: session.id,
              sessionExerciseId: exercise.id,
              setNumber: exercise.sets.length + 1,
              targetReps: last?.targetReps ?? 10,
              targetWeight: last?.targetWeight ?? 0,
              reps: last?.reps ?? null,
              weight: last?.weight ?? null,
              rir: null,
              rpe: null,
              kind: "NORMAL" as const,
              completed: false,
              note: null,
            },
          ],
        };
      }),
    };
    await persist(next);
  };
  const deleteSet = async (exerciseId: string, setId: string) => {
    if (!session) return;
    const exercise = session.exercises.find((item) => item.id === exerciseId);
    if (!exercise || exercise.sets.length <= 1) return;
    const next = {
      ...session,
      exercises: session.exercises.map((item) =>
        item.id !== exerciseId
          ? item
          : {
              ...item,
              sets: item.sets
                .filter((set) => set.id !== setId)
                .map((set, index) => ({ ...set, setNumber: index + 1 })),
            },
      ),
    };
    await persist(next);
  };
  const duplicateSet = async (exerciseId: string, setId: string) => {
    if (!session) return;
    const now = new Date().toISOString();
    const next = {
      ...session,
      exercises: session.exercises.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;
        const source = exercise.sets.find((set) => set.id === setId);
        if (!source) return exercise;
        const sets = [
          ...exercise.sets,
          {
            ...source,
            id: createClientId(),
            createdAt: now,
            updatedAt: now,
            completed: false,
            setNumber: exercise.sets.length + 1,
          },
        ];
        return { ...exercise, sets };
      }),
    };
    await persist(next);
  };
  const moveExercise = async (exerciseId: string, direction: -1 | 1) => {
    if (!session) return;
    const from = session.exercises.findIndex(
      (exercise) => exercise.id === exerciseId,
    );
    const to = from + direction;
    if (from < 0 || to < 0 || to >= session.exercises.length) return;
    const exercises = [...session.exercises];
    [exercises[from], exercises[to]] = [exercises[to], exercises[from]];
    await persist({
      ...session,
      exercises: exercises.map((exercise, position) => ({
        ...exercise,
        position,
      })),
    });
  };
  const removeExercise = async (exerciseId: string) => {
    if (!session) return;
    const exercise = session.exercises.find((item) => item.id === exerciseId);
    if (!exercise) return;
    if (
      exercise.sets.some((set) => set.completed) &&
      !window.confirm(
        "Este ejercicio ya tiene series registradas. ¿Eliminarlo igualmente de esta sesión?",
      )
    )
      return;
    await persist({
      ...session,
      exercises: session.exercises
        .filter((item) => item.id !== exerciseId)
        .map((item, position) => ({ ...item, position })),
    });
  };
  const toggleSuperset = async (exerciseId: string) => {
    if (!session) return;
    const index = session.exercises.findIndex(
      (exercise) => exercise.id === exerciseId,
    );
    const source = session.exercises[index];
    if (!source) return;
    if (source.supersetGroupId) {
      const next = {
        ...session,
        exercises: session.exercises.map((exercise) =>
          exercise.supersetGroupId === source.supersetGroupId
            ? { ...exercise, supersetGroupId: null }
            : exercise,
        ),
      };
      await persist(next);
      return;
    }
    const partner = session.exercises
      .slice(index + 1)
      .find((exercise) => !exercise.supersetGroupId);
    if (!partner) {
      setError(
        "Elegí otro ejercicio disponible debajo para crear una superserie.",
      );
      return;
    }
    const groupId = createClientId();
    await persist({
      ...session,
      exercises: session.exercises.map((exercise) =>
        exercise.id === source.id || exercise.id === partner.id
          ? { ...exercise, supersetGroupId: groupId }
          : exercise,
      ),
    });
  };
  const selectExercise = async (option: ExerciseOption) => {
    if (!session || !picker) return;
    const now = new Date().toISOString();
    if (picker.mode === "replace" && picker.exerciseId) {
      const source = session.exercises.find(
        (exercise) => exercise.id === picker.exerciseId,
      );
      const next = {
        ...session,
        exercises: session.exercises.map((exercise) =>
          exercise.id === picker.exerciseId
            ? {
                ...exercise,
                catalogExerciseId: option.id,
                name: option.name,
                muscle: option.muscle,
                updatedAt: now,
              }
            : exercise,
        ),
      };
      await persist(next);
      if (
        picker.applyToRoutine &&
        routine &&
        routine.canEdit !== false &&
        session.routineId &&
        source?.routineExerciseId
      ) {
        const updated = await updateRoutineOfflineFirst(session.routineId, {
          exercises: routine.exercises.map((exercise) =>
            exercise.id === source.routineExerciseId
              ? {
                  ...exercise,
                  catalogExerciseId: option.id,
                  name: option.name,
                  muscle: option.muscle,
                }
              : exercise,
          ),
        });
        setRoutine(updated);
      }
    } else {
      const exerciseId = createClientId();
      const sets = Array.from({ length: 3 }, (_, index) => ({
        id: createClientId(),
        userId: session.userId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        syncStatus: "pending" as const,
        lastSyncedAt: null,
        version: 1,
        sessionId: session.id,
        sessionExerciseId: exerciseId,
        setNumber: index + 1,
        targetReps: 10,
        targetWeight: 0,
        reps: null,
        weight: null,
        rir: null,
        rpe: null,
        kind: "NORMAL" as const,
        completed: false,
        note: null,
      }));
      await persist({
        ...session,
        exercises: [
          ...session.exercises,
          {
            id: exerciseId,
            userId: session.userId,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
            syncStatus: "pending" as const,
            lastSyncedAt: null,
            version: 1,
            sessionId: session.id,
            routineExerciseId: session.routineId ? createClientId() : null,
            catalogExerciseId: option.id,
            position: session.exercises.length,
            name: option.name,
            muscle: option.muscle,
            restSeconds: null,
            supersetGroupId: null,
            sets,
          },
        ],
      });
    }
    setPicker(null);
  };
  const updateSession = async (
    patch: Partial<
      Pick<
        OfflineWorkoutSession,
        "notes" | "emotionalRating" | "emotionalState"
      >
    >,
  ) => {
    if (session) await persist({ ...session, ...patch });
  };
  const finish = async () => {
    if (!session) return;
    const finishedAt = new Date().toISOString();
    try {
      const saved = await persist({
        ...session,
        status: "FINISHED",
        finishedAt,
        durationSeconds: Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(session.startedAt).getTime()) / 1_000,
          ),
        ),
      });
      setHistory((current) =>
        [saved, ...current.filter((item) => item.id !== saved.id)].slice(0, 24),
      );
      setWorkoutInProgress(false);
      cancelRest();
      setStatsRefresh((current) => current + 1);
      window.dispatchEvent(new Event("toro-dashboard-stats-change"));
      setPostWorkoutOpen(true);
    } catch {
      setError("No pudimos finalizar el entrenamiento localmente.");
    }
  };
  const saveFreeWorkoutAsRoutine = async () => {
    if (!session || !isFreeWorkout || !session.exercises.length) return;
    const name = window.prompt(
      "Nombre para esta rutina",
      "Mi entrenamiento libre",
    );
    if (!name?.trim()) return;
    try {
      const saved = await createRoutineOfflineFirst({
        name: name.trim(),
        type: "Personalizada",
        kind: "PERSONAL",
        canEdit: true,
        days: ["Lun"],
        exercises: session.exercises.map((exercise) => {
          const completed = exercise.sets.find((set) => set.completed);
          const first = exercise.sets[0];
          return {
            catalogExerciseId: exercise.catalogExerciseId,
            name: exercise.name,
            muscle: exercise.muscle,
            sets: exercise.sets.length,
            reps: completed?.reps ?? first?.targetReps ?? 10,
            weight: completed?.weight ?? first?.targetWeight ?? 0,
            technique: "Normal",
            restSeconds: exercise.restSeconds ?? null,
            supersetGroupId: exercise.supersetGroupId ?? null,
            completed: null,
            actualReps: null,
            note: "",
            trainingDay: "Lun",
          };
        }),
      });
      router.push(`/dashboard/routine/${saved.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos guardar esta rutina todavía.",
      );
    }
  };
  const applySessionChangesToRoutine = async () => {
    if (!session || !routine || !session.routineId || routine.canEdit === false)
      return;
    try {
      const byId = new Map(
        routine.exercises.map((exercise) => [exercise.id, exercise]),
      );
      const updated = await updateRoutineOfflineFirst(session.routineId, {
        exercises: session.exercises.map((exercise) => {
          const prescribed = exercise.routineExerciseId
            ? byId.get(exercise.routineExerciseId)
            : undefined;
          const completed = exercise.sets.find((set) => set.completed);
          const first = exercise.sets[0];
          return {
            id: prescribed?.id ?? createClientId(),
            catalogExerciseId: exercise.catalogExerciseId,
            name: exercise.name,
            muscle: exercise.muscle,
            sets: exercise.sets.length,
            reps: completed?.reps ?? first?.targetReps ?? 10,
            weight: completed?.weight ?? first?.targetWeight ?? 0,
            technique: prescribed?.technique ?? "Normal",
            restSeconds: exercise.restSeconds ?? null,
            supersetGroupId: exercise.supersetGroupId ?? null,
            completed: null,
            actualReps: null,
            note: prescribed?.note ?? "",
            trainingDay: prescribed?.trainingDay ?? routine.days[0],
          };
        }),
      });
      setRoutine(updated);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos actualizar la rutina todavía.",
      );
    }
  };

  if (loading)
    return (
      <main className="min-h-dvh bg-[#090a08] px-4 pb-36 pt-28 text-white">
        <div className="mx-auto max-w-4xl text-sm text-white/45">
          Cargando rutina…
        </div>
      </main>
    );
  if (!routine)
    return (
      <main className="min-h-dvh bg-[#090a08] px-4 pb-36 pt-28 text-white">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-white/[.08] bg-[#10110e] p-6">
          <p className="text-sm text-white/50">
            {error || "Esta rutina no existe o fue eliminada."}
          </p>
          <Link
            href="/dashboard/routine"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#b7ff00]"
          >
            <ArrowLeft size={16} /> Volver a rutinas
          </Link>
        </div>
      </main>
    );

  const selectedDay = routine.days.includes(selectedTrainingDay ?? "")
    ? (selectedTrainingDay as string)
    : routine.days[0] || "";
  const completedSets =
    session?.exercises
      .flatMap((exercise) => exercise.sets)
      .filter((set) => set.completed).length || 0;
  const totalSets =
    session?.exercises.flatMap((exercise) => exercise.sets).length || 0;
  const coachingByExercise = new Map<string, ExerciseCoaching>(
    session
      ? session.exercises.map((exercise) => [
          exercise.id,
          buildExerciseCoaching(history, exercise, session.id),
        ])
      : [],
  );
  const sessionFeedback = session
    ? buildSessionFeedback(history, session)
    : null;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#090a08] px-4 pb-36 pt-28 text-white sm:px-8">
      <div className="relative mx-auto max-w-4xl">
        <Link
          href="/dashboard/routine"
          className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white"
        >
          <ArrowLeft size={15} /> Todas las rutinas
        </Link>
        <header className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[.22em] text-[#b7ff00]/70">
              RUTINA ACTUAL
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] sm:text-4xl">
              {routine.name}
            </h1>
            <p className="mt-2 text-sm text-white/40">
              {routine.days.join(", ")} · Entrená incluso sin conexión.
            </p>
          </div>
          {!isFreeWorkout && routine.canEdit !== false && (
            <Link
              href={`/dashboard/routine/${id}/edit`}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/65"
            >
              <Pencil size={15} /> Editar rutina
            </Link>
          )}
        </header>
        {offline && (
          <p className="mt-5 inline-flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[.07] px-3 py-2 text-xs text-amber-100">
            <WifiOff size={14} /> Rutina disponible desde tu copia offline.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-5 text-sm text-red-300">
            {error}
          </p>
        )}

        {!session ? (
          <>
            <StartWorkoutCard
              routine={routine}
              selectedDay={selectedDay}
              onSelectDay={setSelectedTrainingDay}
              onStart={() => void start()}
            />
            <ProgressPanel stats={stats} />
          </>
        ) : (
          <>
            <SessionMetrics
              completedSets={completedSets}
              totalSets={totalSets}
              startedAt={session.startedAt}
              finishedAt={session.finishedAt}
              restUntil={restUntil}
            />
            <p
              aria-live="polite"
              className={`mt-4 text-xs ${session.syncStatus === "failed" || session.syncStatus === "conflict" ? "text-amber-200" : "text-white/50"}`}
            >
              {syncCopy(session)}
            </p>
            {session.status === "FINISHED" && sessionFeedback && (
              <WorkoutRecap feedback={sessionFeedback} />
            )}

            <section className="mt-5 rounded-[28px] border border-white/[.08] bg-[#10110e]/95 p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">
                    {session.status === "FINISHED"
                      ? "Entrenamiento finalizado"
                      : "Sesión en curso"}
                  </p>
                  <p className="text-xs text-white/35">
                    Completá reps, kilos y listo. Los detalles son opcionales.
                  </p>
                </div>
                {session.status === "IN_PROGRESS" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={restDuration}
                      onChange={(event) =>
                        setRestDuration(Number(event.target.value))
                      }
                      className="rounded-xl border border-white/10 bg-black/20 px-2 py-2 text-xs text-white"
                      aria-label="Duración de descanso"
                    >
                      <option value={60}>1:00</option>
                      <option value={90}>1:30</option>
                      <option value={120}>2:00</option>
                      <option value={180}>3:00</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void startRest()}
                      className="inline-flex items-center gap-2 rounded-xl border border-sky-300/25 px-3 py-2 text-xs text-sky-200"
                    >
                      <TimerReset size={14} /> Iniciar descanso
                    </button>
                    <PlateCalculator />
                    {restUntil && (
                      <button
                        type="button"
                        onClick={cancelRest}
                        className="text-xs text-white/45"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                )}
              </div>

              <WorkoutLog
                exercises={session.exercises}
                status={session.status}
                coachingByExercise={coachingByExercise}
                records={sessionFeedback?.records || []}
                onAddSet={addSet}
                onUpdateSet={updateSet}
                onDeleteSet={deleteSet}
                onDuplicateSet={duplicateSet}
                onMoveExercise={moveExercise}
                onReplaceExercise={(exerciseId) =>
                  setPicker({ mode: "replace", exerciseId })
                }
                canUpdateRoutine={!isFreeWorkout && routine.canEdit !== false}
                onReplaceAndUpdateRoutine={(exerciseId) =>
                  setPicker({
                    mode: "replace",
                    exerciseId,
                    applyToRoutine: true,
                  })
                }
                onRemoveExercise={removeExercise}
                onToggleSuperset={toggleSuperset}
              />
              {session.status === "IN_PROGRESS" && (
                <button
                  type="button"
                  onClick={() => setPicker({ mode: "add" })}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#b7ff00]/30 px-4 py-3 text-sm font-bold text-[#d7ff78]"
                >
                  <Plus size={16} /> Agregar ejercicio
                </button>
              )}

              <div className="mt-5 flex justify-end">
                {session.status === "IN_PROGRESS" && (
                  <button
                    type="button"
                    onClick={() => void finish()}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#b7ff00]/30 bg-[#b7ff00]/[.08] px-5 py-3 text-sm font-bold text-[#b7ff00]"
                  >
                    <Square size={15} fill="currentColor" /> Finalizar
                    entrenamiento
                  </button>
                )}
                {session.status === "FINISHED" && (
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPostWorkoutOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#b7ff00] px-4 py-3 text-sm font-bold text-black"
                    >
                      <Sparkles size={16} /> Ver resumen post-entreno
                    </button>
                    <ShareWorkoutButton
                      session={session}
                      workoutName={routine.name}
                    />
                    {isFreeWorkout && session.exercises.length > 0 && (
                      <button
                        type="button"
                        onClick={() => void saveFreeWorkoutAsRoutine()}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#b7ff00]/30 px-4 py-3 text-sm font-bold text-[#d7ff78]"
                      >
                        <Plus size={16} /> Guardar como rutina
                      </button>
                    )}
                    {!isFreeWorkout && routine.canEdit !== false && (
                      <button
                        type="button"
                        onClick={() => void applySessionChangesToRoutine()}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-white/75"
                      >
                        Aplicar cambios a rutina
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
            {session.status === "FINISHED" && <ProgressPanel stats={stats} />}
            {session.status === "FINISHED" &&
              sessionFeedback &&
              postWorkoutOpen && (
                <PostWorkoutFlow
                  session={session}
                  workoutName={routine.name}
                  feedback={sessionFeedback}
                  onSaveFeedback={updateSession}
                  onClose={() => setPostWorkoutOpen(false)}
                />
              )}
            {picker && (
              <ExercisePicker
                title={
                  picker.mode === "add"
                    ? "Agregar ejercicio a esta sesión"
                    : "Sustituir ejercicio sólo por hoy"
                }
                onSelect={(option) => void selectExercise(option)}
                onClose={() => setPicker(null)}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

function StartWorkoutCard({
  routine,
  selectedDay,
  onSelectDay,
  onStart,
}: {
  routine: Routine;
  selectedDay: string;
  onSelectDay: (day: string) => void;
  onStart: () => void;
}) {
  const exercises = routine.exercises.filter(
    (exercise) => exercise.trainingDay === selectedDay,
  );
  return (
    <section className="mt-7 rounded-[30px] border border-[#b7ff00]/15 bg-[#10110e]/95 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Dumbbell className="text-[#b7ff00]" size={22} />
          <h2 className="mt-4 text-2xl font-semibold">
            ¿Qué día entrenás hoy?
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-white/40">
            Elegí el día y arrancá sólo con sus ejercicios. Cargás el peso
            durante la sesión.
          </p>
        </div>
        <span className="rounded-xl bg-[#b7ff00]/[.08] px-3 py-2 text-xs font-semibold text-[#d7ff78]">
          {exercises.length} ejercicio{exercises.length === 1 ? "" : "s"}
        </span>
      </div>
      <div
        role="tablist"
        aria-label="Día para entrenar"
        className="mt-6 flex gap-2 overflow-x-auto pb-1"
      >
        {routine.days.map((day) => (
          <button
            key={day}
            type="button"
            role="tab"
            aria-selected={selectedDay === day}
            onClick={() => onSelectDay(day)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${selectedDay === day ? "bg-[#b7ff00] text-black" : "bg-white/[.05] text-white/55 hover:bg-white/[.09]"}`}
          >
            {day}
          </button>
        ))}
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-white/[.07] bg-black/15">
        {exercises.length ? (
          exercises.map((exercise, index) => (
            <div
              key={exercise.id}
              className={`flex items-center justify-between gap-3 px-4 py-3 ${index ? "border-t border-white/[.06]" : ""}`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  <span className="mr-2 text-xs text-[#b7ff00]/75">
                    {index + 1}.
                  </span>
                  {exercise.name}
                </p>
                <p className="mt-0.5 text-xs text-white/35">
                  {exercise.muscle}
                </p>
                {exercise.supersetGroupId && (
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#d7ff78]">
                    Superserie
                  </p>
                )}
                <ExerciseVideoModal
                  exerciseId={exercise.catalogExerciseId}
                  exerciseName={exercise.name}
                  className="mt-2"
                />
              </div>
              <p className="shrink-0 text-xs text-white/55">
                {exercise.sets} × {exercise.reps}
              </p>
            </div>
          ))
        ) : (
          <p className="px-4 py-7 text-center text-sm text-white/40">
            Este día no tiene ejercicios cargados.
          </p>
        )}
      </div>
      <button
        type="button"
        disabled={!exercises.length}
        onClick={onStart}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#b7ff00] px-5 py-3 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Play size={16} fill="currentColor" /> Iniciar entrenamiento
      </button>
    </section>
  );
}

function WorkoutLog({
  exercises,
  status,
  coachingByExercise,
  records,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onDuplicateSet,
  onMoveExercise,
  onReplaceExercise,
  canUpdateRoutine,
  onReplaceAndUpdateRoutine,
  onRemoveExercise,
  onToggleSuperset,
}: {
  exercises: OfflineWorkoutSession["exercises"];
  status: OfflineWorkoutSession["status"];
  coachingByExercise: Map<string, ExerciseCoaching>;
  records: PersonalRecord[];
  onAddSet: (exerciseId: string) => Promise<void>;
  onUpdateSet: (
    exerciseId: string,
    setId: string,
    patch: SetPatch,
  ) => Promise<void>;
  onDeleteSet: (exerciseId: string, setId: string) => Promise<void>;
  onDuplicateSet: (exerciseId: string, setId: string) => Promise<void>;
  onMoveExercise: (exerciseId: string, direction: -1 | 1) => Promise<void>;
  onReplaceExercise: (exerciseId: string) => void;
  canUpdateRoutine: boolean;
  onReplaceAndUpdateRoutine: (exerciseId: string) => void;
  onRemoveExercise: (exerciseId: string) => Promise<void>;
  onToggleSuperset: (exerciseId: string) => Promise<void>;
}) {
  const [expandedSetIds, setExpandedSetIds] = useState<string[]>([]);
  const toggleDetails = (setId: string) =>
    setExpandedSetIds((current) =>
      current.includes(setId)
        ? current.filter((id) => id !== setId)
        : [...current, setId],
    );
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-white/[.07] bg-black/15">
      <div className="flex items-end justify-between gap-3 border-b border-white/[.07] px-4 py-4 sm:px-5">
        <div>
          <p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">
            REGISTRO RÁPIDO
          </p>
          <h2 className="mt-1 text-lg font-semibold">Todos los ejercicios</h2>
        </div>
        <p className="text-xs text-white/35">Reps · kg · check</p>
      </div>
      <div className="divide-y divide-white/[.07]">
        {exercises.map((exercise, index) => (
          <div key={exercise.id} className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  <span className="mr-2 text-xs text-[#b7ff00]/75">
                    {index + 1}.
                  </span>
                  {exercise.name}
                </p>
                <p className="mt-0.5 text-xs text-white/35">
                  {exercise.muscle}
                </p>
                {exercise.supersetGroupId && (
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#d7ff78]">
                    Superserie
                  </p>
                )}
                <ExerciseVideoModal
                  exerciseId={exercise.catalogExerciseId}
                  exerciseName={exercise.name}
                  className="mt-2"
                />
              </div>
              {status === "IN_PROGRESS" && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void onAddSet(exercise.id)}
                    className="inline-flex min-h-10 items-center gap-1 text-xs font-bold text-[#b7ff00]"
                  >
                    <Plus size={14} /> Serie
                  </button>
                  <details className="relative">
                    <summary
                      aria-label={`Acciones para ${exercise.name}`}
                      className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-lg border border-white/10 text-white/65 [&::-webkit-details-marker]:hidden"
                    >
                      <MoreHorizontal size={18} />
                    </summary>
                    <div className="absolute right-0 z-10 mt-1 w-48 rounded-xl border border-white/10 bg-[#171914] p-1 shadow-xl">
                      <button
                        type="button"
                        onClick={() => onReplaceExercise(exercise.id)}
                        className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-white/10"
                      >
                        Sustituir sólo hoy
                      </button>
                      <button
                        type="button"
                        onClick={() => void onToggleSuperset(exercise.id)}
                        className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-white/10"
                      >
                        {exercise.supersetGroupId
                          ? "Deshacer superserie"
                          : "Crear superserie"}
                      </button>
                      {canUpdateRoutine && exercise.routineExerciseId && (
                        <button
                          type="button"
                          onClick={() => onReplaceAndUpdateRoutine(exercise.id)}
                          className="w-full rounded-lg px-3 py-2 text-left text-xs text-[#d7ff78] hover:bg-white/10"
                        >
                          Sustituir y actualizar rutina
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void onMoveExercise(exercise.id, -1)}
                        disabled={index === 0}
                        className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-white/10 disabled:opacity-35"
                      >
                        Mover arriba
                      </button>
                      <button
                        type="button"
                        onClick={() => void onMoveExercise(exercise.id, 1)}
                        disabled={index === exercises.length - 1}
                        className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-white/10 disabled:opacity-35"
                      >
                        Mover abajo
                      </button>
                      <button
                        type="button"
                        onClick={() => void onRemoveExercise(exercise.id)}
                        className="w-full rounded-lg px-3 py-2 text-left text-xs text-red-300 hover:bg-red-400/10"
                      >
                        Eliminar de sesión
                      </button>
                    </div>
                  </details>
                </div>
              )}
            </div>
            {coachingByExercise.get(exercise.id) && (
              <ExerciseCoachInline
                coaching={coachingByExercise.get(exercise.id)!}
              />
            )}
            <div className="mt-4">
              <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2.25rem_2.25rem] gap-2 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.12em] text-white/30 sm:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem_2.5rem]">
                <span>Serie</span>
                <span>Reps</span>
                <span>Kg</span>
                <span className="sr-only">Completar</span>
                <span className="sr-only">Detalles</span>
              </div>
              <div className="space-y-2">
                {exercise.sets.map((set) => {
                  const expanded = expandedSetIds.includes(set.id);
                  const record = records.find(
                    (item) =>
                      item.exercise === exercise.name &&
                      item.setNumber === set.setNumber,
                  );
                  return (
                    <div
                      key={set.id}
                      className="rounded-xl bg-white/[.035] p-2.5"
                    >
                      <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2.25rem_2.25rem] items-center gap-2 sm:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem_2.5rem]">
                        <span className="grid h-9 w-8 place-items-center rounded-lg bg-white/[.05] text-xs font-bold sm:w-10">
                          {set.setNumber}
                        </span>
                        <NumberInput
                          disabled={status === "FINISHED"}
                          value={set.reps}
                          min={0}
                          max={100}
                          integer
                          placeholder={String(set.targetReps || "–")}
                          ariaLabel={`Repeticiones de la serie ${set.setNumber} de ${exercise.name}`}
                          onChange={(reps) =>
                            void onUpdateSet(exercise.id, set.id, { reps })
                          }
                        />
                        <NumberInput
                          disabled={status === "FINISHED"}
                          value={set.weight}
                          min={0}
                          max={1_000}
                          placeholder={
                            set.targetWeight ? String(set.targetWeight) : "–"
                          }
                          ariaLabel={`Peso en kilos de la serie ${set.setNumber} de ${exercise.name}`}
                          onChange={(weight) =>
                            void onUpdateSet(exercise.id, set.id, { weight })
                          }
                        />
                        <button
                          type="button"
                          disabled={status === "FINISHED"}
                          aria-label={`${set.completed ? "Desmarcar" : "Completar"} serie ${set.setNumber} de ${exercise.name}`}
                          onClick={() =>
                            void onUpdateSet(exercise.id, set.id, {
                              completed: !set.completed,
                            })
                          }
                          className={`grid h-9 w-9 place-items-center rounded-lg border ${set.completed ? "border-[#b7ff00]/45 bg-[#b7ff00] text-black" : "border-white/10 text-white/40"}`}
                        >
                          <Check size={15} />
                        </button>
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-label={`Ver detalles opcionales de la serie ${set.setNumber}: ${setKindLabels[set.kind || "NORMAL"]}`}
                          onClick={() => toggleDetails(set.id)}
                          className={`grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-white/45 transition ${expanded ? "bg-white/[.08] text-white" : ""}`}
                        >
                          <ChevronDown
                            size={16}
                            className={expanded ? "rotate-180" : ""}
                          />
                        </button>
                      </div>
                      {record && (
                        <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#b7ff00]/20 bg-[#b7ff00]/[.08] px-2 py-1 text-[11px] font-semibold text-[#d7ff78]">
                          <Trophy size={12} /> PR estimado ·{" "}
                          {record.estimatedOneRepMax} kg e1RM
                        </p>
                      )}
                      {expanded && (
                        <div className="mt-3 grid gap-2 border-t border-white/[.07] pt-3 sm:grid-cols-6">
                          <label className="text-[11px] text-white/45 sm:col-span-1">
                            RIR
                            <NumberInput
                              disabled={status === "FINISHED"}
                              value={set.rir}
                              min={0}
                              max={10}
                              integer
                              placeholder="–"
                              ariaLabel={`RIR de la serie ${set.setNumber} de ${exercise.name}`}
                              onChange={(rir) =>
                                void onUpdateSet(exercise.id, set.id, { rir })
                              }
                            />
                          </label>
                          <label className="text-[11px] text-white/45 sm:col-span-1">
                            RPE
                            <NumberInput
                              disabled={status === "FINISHED"}
                              value={set.rpe}
                              min={1}
                              max={10}
                              integer
                              placeholder="–"
                              ariaLabel={`RPE de la serie ${set.setNumber} de ${exercise.name}`}
                              onChange={(rpe) =>
                                void onUpdateSet(exercise.id, set.id, { rpe })
                              }
                            />
                          </label>
                          <label className="text-[11px] text-white/45 sm:col-span-2">
                            Tipo de serie
                            <select
                              disabled={status === "FINISHED"}
                              value={set.kind || "NORMAL"}
                              onChange={(event) =>
                                void onUpdateSet(exercise.id, set.id, {
                                  kind: event.target.value as SetKind,
                                })
                              }
                              className="input mt-1 h-9 px-2 text-xs"
                            >
                              <option value="NORMAL">Normal</option>
                              <option value="WARMUP">Calentamiento</option>
                              <option value="DROP">Descendente</option>
                              <option value="FAILURE">Al fallo</option>
                            </select>
                          </label>
                          <label className="text-[11px] text-white/45 sm:col-span-2">
                            Nota
                            <input
                              disabled={status === "FINISHED"}
                              value={set.note ?? ""}
                              onChange={(event) =>
                                void onUpdateSet(exercise.id, set.id, {
                                  note: event.target.value || null,
                                })
                              }
                              className="input mt-1 h-9"
                              maxLength={500}
                              placeholder="Opcional"
                              aria-label={`Nota de la serie ${set.setNumber} de ${exercise.name}`}
                            />
                          </label>
                          {status === "IN_PROGRESS" && (
                            <div className="flex gap-2 sm:col-span-1">
                              <button
                                type="button"
                                onClick={() =>
                                  void onDuplicateSet(exercise.id, set.id)
                                }
                                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70"
                              >
                                Duplicar
                              </button>
                              <button
                                type="button"
                                disabled={exercise.sets.length <= 1}
                                onClick={() =>
                                  void onDeleteSet(exercise.id, set.id)
                                }
                                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-red-300/75 disabled:opacity-30"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExerciseCoachInline({ coaching }: { coaching: ExerciseCoaching }) {
  const reference = coaching.reference;
  return (
    <details className="group mt-3 rounded-xl border border-sky-300/15 bg-sky-300/[.045] px-3 py-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs text-sky-100 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex min-w-0 items-center gap-2">
          <History size={14} className="shrink-0" />{" "}
          {reference ? (
            <>
              Anterior:{" "}
              <strong className="truncate text-white">
                {reference.bestWeight} kg × {reference.bestReps}
              </strong>
            </>
          ) : (
            "Sin referencia anterior"
          )}
        </span>
        <ChevronDown
          size={15}
          className="shrink-0 transition group-open:rotate-180"
        />
      </summary>
      <div className="pt-3 text-xs leading-5 text-white/55">
        {reference && (
          <p>
            {reference.completedSets} serie
            {reference.completedSets === 1 ? "" : "s"} de trabajo ·{" "}
            {reference.date}
          </p>
        )}
        <p className="mt-2 text-sky-100">
          TORO sugiere: {coaching.recommendation.message}
        </p>
      </div>
    </details>
  );
}

function ExercisePicker({
  title,
  onSelect,
  onClose,
}: {
  title: string;
  onSelect: (exercise: ExerciseOption) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("all");
  const normalized = query.trim().toLocaleLowerCase("es");
  const exercises = exerciseOptions.filter(
    (exercise) =>
      (muscle === "all" || exercise.muscleId === muscle) &&
      (!normalized ||
        exercise.name.toLocaleLowerCase("es").includes(normalized) ||
        exercise.muscle.toLocaleLowerCase("es").includes(normalized)),
  );
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end bg-black/70 p-0 sm:items-center sm:justify-center sm:p-6"
    >
      <section className="max-h-[88dvh] w-full overflow-hidden rounded-t-[28px] border border-white/10 bg-[#10110e] shadow-2xl sm:max-w-xl sm:rounded-[28px]">
        <header className="flex items-center justify-between border-b border-white/[.07] p-4">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-xs text-white/40">
              No modifica la rutina original.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-xl text-white/65 hover:bg-white/10"
            aria-label="Cerrar selector"
          >
            <X size={19} />
          </button>
        </header>
        <div className="p-4">
          <label className="relative block">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
            />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input pl-10"
              placeholder="Buscar ejercicio o músculo"
            />
          </label>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {[
              { id: "all", name: "Todos" },
              ...muscleGroups.map((group) => ({
                id: group.id,
                name: group.name,
              })),
            ].map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setMuscle(group.id)}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${muscle === group.id ? "bg-[#b7ff00] text-black" : "bg-white/[.06] text-white/55"}`}
              >
                {group.name}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[52dvh] overflow-y-auto px-4 pb-5">
          {exercises.length ? (
            exercises.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => onSelect(exercise)}
                className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-white/[.07] py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {exercise.name}
                  </span>
                  <span className="mt-1 block text-xs text-white/40">
                    {exercise.muscle}
                  </span>
                </span>
                <Plus size={17} className="shrink-0 text-[#b7ff00]" />
              </button>
            ))
          ) : (
            <p className="py-10 text-center text-sm text-white/40">
              No encontramos ejercicios con esos filtros.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function ProgressPanel({ stats }: { stats: WorkoutStats | null }) {
  if (!stats || (!stats.exercises.length && !stats.muscles.length)) return null;
  const maximumSets = Math.max(...stats.muscles.map((item) => item.sets), 1);
  return (
    <section className="mt-7 rounded-[28px] border border-white/[.08] bg-[#10110e]/90 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">
            PROGRESO
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            Tu fuerza, sin calendario.
          </h2>
        </div>
        <p className="rounded-xl border border-[#b7ff00]/20 bg-[#b7ff00]/[.06] px-3 py-2 text-xs font-semibold text-[#b7ff00]">
          {stats.streak} día{stats.streak === 1 ? "" : "s"} consecutivo
          {stats.streak === 1 ? "" : "s"}
        </p>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-white/55">
            Series por músculo · últimos 7 días
          </p>
          <div className="mt-3 space-y-2">
            {stats.muscles.map((item) => (
              <div
                key={item.name}
                className="grid grid-cols-[96px_1fr_auto] items-center gap-2 text-xs"
              >
                <span className="truncate text-white/45">{item.name}</span>
                <span className="h-2 overflow-hidden rounded-full bg-white/[.07]">
                  <span
                    className="block h-full rounded-full bg-sky-300"
                    style={{ width: `${(item.sets / maximumSets) * 100}%` }}
                  />
                </span>
                <span className="text-white/65">{item.sets}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {stats.exercises.map((exercise) => {
            const maximumVolume = Math.max(
              ...exercise.history.map((point) => point.volume),
              1,
            );
            return (
              <article
                key={exercise.name}
                className="rounded-xl border border-white/[.07] bg-black/15 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{exercise.name}</p>
                    <p className="text-[11px] text-white/40">
                      PR {exercise.bestWeight} kg · 1RM est.{" "}
                      {exercise.estimatedOneRepMax} kg
                    </p>
                  </div>
                  <div className="flex h-9 items-end gap-1">
                    {exercise.history.map((point) => (
                      <span
                        key={`${point.date}-${point.volume}`}
                        title={`${point.date}: ${point.volume} kg`}
                        className="w-2 rounded-t bg-[#b7ff00]"
                        style={{
                          height: `${Math.max(12, (point.volume / maximumVolume) * 36)}px`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function WorkoutRecap({ feedback }: { feedback: SessionFeedback }) {
  return (
    <section className="mt-5 rounded-[28px] border border-[#b7ff00]/20 bg-[#b7ff00]/[.055] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 text-[#b7ff00]" size={19} />
        <div>
          <p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">
            RESUMEN POST-ENTRENO
          </p>
          <h2 className="mt-1 text-xl font-semibold">Sesión guardada.</h2>
          <p className="mt-2 text-sm text-white/55">{feedback.message}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-black/15 px-2 py-3">
          <p className="text-lg font-semibold">{feedback.completedSets}</p>
          <p className="text-[10px] text-white/40">Series</p>
        </div>
        <div className="rounded-xl bg-black/15 px-2 py-3">
          <p className="text-lg font-semibold">{feedback.completedExercises}</p>
          <p className="text-[10px] text-white/40">Ejercicios</p>
        </div>
        <div className="rounded-xl bg-black/15 px-2 py-3">
          <p className="text-lg font-semibold">{feedback.volume}</p>
          <p className="text-[10px] text-white/40">kg volumen</p>
        </div>
      </div>
      {feedback.records.length > 0 && (
        <div className="mt-4 space-y-2">
          {feedback.records.map((record) => (
            <p
              key={`${record.exercise}-${record.setNumber}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-[#b7ff00]/15 bg-black/15 px-3 py-2 text-xs"
            >
              <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-white">
                <Trophy size={14} className="shrink-0 text-[#b7ff00]" />
                <span className="truncate">{record.exercise}</span>
              </span>
              <span className="shrink-0 text-[#d7ff78]">
                {record.weight} kg × {record.reps}
              </span>
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

function NumberInput({
  value,
  min,
  max,
  integer = false,
  placeholder,
  ariaLabel,
  disabled,
  onChange,
}: {
  value: number | null;
  min: number;
  max: number;
  integer?: boolean;
  placeholder: string;
  ariaLabel?: string;
  disabled: boolean;
  onChange: (value: number | null) => void;
}) {
  const isRepSelect = ariaLabel?.startsWith("Repeticiones");
  if (isRepSelect) {
    const target = Number(placeholder);
    const upperLimit = Math.min(
      max,
      Math.max(30, Number.isFinite(target) ? target : 0, value ?? 0),
    );
    return (
      <select
        aria-label={ariaLabel}
        disabled={disabled}
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value ? Number(event.target.value) : null)
        }
        className="input h-9 px-2 text-center"
      >
        <option value="">
          {Number.isFinite(target) ? `${target} reps` : "Reps"}
        </option>
        {Array.from({ length: upperLimit }, (_, index) => index + 1).map(
          (rep) => (
            <option key={rep} value={rep}>
              {rep}
            </option>
          ),
        )}
      </select>
    );
  }
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.value === "") {
      onChange(null);
      return;
    }
    const next = Number(event.target.value);
    if (
      !Number.isFinite(next) ||
      next < min ||
      next > max ||
      (integer && !Number.isInteger(next))
    )
      return;
    onChange(next);
  };
  return (
    <input
      aria-label={ariaLabel || placeholder}
      disabled={disabled}
      value={value ?? ""}
      onChange={handleChange}
      className="input h-9 px-2 text-center"
      min={min}
      max={max}
      step={integer ? 1 : "any"}
      inputMode={integer ? "numeric" : "decimal"}
      type="number"
      placeholder={placeholder}
    />
  );
}

function SessionMetrics({
  completedSets,
  totalSets,
  startedAt,
  finishedAt,
  restUntil,
}: {
  completedSets: number;
  totalSets: number;
  startedAt: string;
  finishedAt: string | null;
  restUntil: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (finishedAt && !restUntil) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [finishedAt, restUntil]);
  const elapsed = Math.max(
    0,
    Math.floor(
      ((finishedAt ? new Date(finishedAt).getTime() : now) -
        new Date(startedAt).getTime()) /
        1_000,
    ),
  );
  const restSeconds = restUntil
    ? Math.max(0, Math.ceil((restUntil - now) / 1_000))
    : 0;
  return (
    <section className="mt-7 grid gap-3 sm:grid-cols-3">
      <Metric value={`${completedSets}/${totalSets}`} label="Series" />
      <Metric value={secondsLabel(elapsed)} label="Duración" />
      <Metric
        value={restUntil ? secondsLabel(restSeconds) : "—"}
        label="Descanso"
      />
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/[.07] bg-white/[.03] p-4">
      <p className="text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-white/35">{label}</p>
    </div>
  );
}
