import Image from "next/image";

type ExerciseThumbnailProps = {
  exerciseId: string;
  muscleId: string;
  name: string;
  className?: string;
};

export function ExerciseThumbnail({
  exerciseId,
  muscleId,
  name,
  className = "",
}: ExerciseThumbnailProps) {
  return (
    <div
      className={`
        relative
        h-14
        w-14
        shrink-0
        overflow-hidden
        rounded-xl
        bg-[#10110e]
        ${className}
      `}
    >
      <Image
        src={`/exercises/${muscleId}/${exerciseId}.webp`}
        alt={name}
        fill
        sizes="56px"
        className="object-contain"
      />
    </div>
  );
}