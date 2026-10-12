import type { ReactNode } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

type PerformanceMetricProps = {
  icon: ReactNode;
  value: string;
  label: string;
  context?: string;
  comparison?: {
    label: string;
    direction: "up" | "down" | "unchanged";
  };
  variant?: "primary" | "secondary" | "goal" | "record";
};

const directionIcons = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  unchanged: ArrowRight,
} as const;

export function PerformanceMetric({
  icon,
  value,
  label,
  context,
  comparison,
  variant = "secondary",
}: PerformanceMetricProps) {
  const DirectionIcon = comparison ? directionIcons[comparison.direction] : null;

  return (
    <article
      className={`performance-metric performance-metric--${variant}`}
      aria-label={`${label}: ${value}${context ? `. ${context}` : ""}${comparison ? `. ${comparison.label}` : ""}`}
    >
      <div className="performance-metric__heading">
        <span className="performance-metric__icon" aria-hidden="true">{icon}</span>
        <p className="performance-metric__label">{label}</p>
      </div>
      <p className="performance-metric__value">{value}</p>
      {context && <p className="performance-metric__context">{context}</p>}
      {comparison && DirectionIcon && (
        <p className="performance-metric__comparison">
          <DirectionIcon size={13} aria-hidden="true" />
          <span>{comparison.label}</span>
        </p>
      )}
    </article>
  );
}
