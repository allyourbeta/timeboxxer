"use client";

import { Trash2, CheckCircle } from "lucide-react";
import { getColor } from "@/lib/palettes";

interface TaskCardProps {
  id: string;
  title: string;
  durationMinutes: number;
  colorIndex: number;
  isCompleted: boolean;
  isScheduled: boolean;
  isDaily: boolean;
  isInPurgatory: boolean;
  isHighlight: boolean;
  canHighlight: boolean;
  energyLevel: "high" | "medium";
  paletteId: string;
  onDurationClick: (reverse: boolean) => void;
  onEnergyChange: (level: "high" | "medium") => void;
  onDailyToggle: () => void;
  onHighlightToggle: () => void;
  onComplete: () => void;
  onDelete: () => void;
}

// Energy cycle: medium <-> high (toggle)
const ENERGY_CYCLE: Record<string, "high" | "medium"> = {
  medium: "high",
  high: "medium",
};

const ENERGY_ICONS: Record<string, string> = {
  high: "🔥",
  medium: "⚡",
};

export function TaskCard({
  id,
  title,
  durationMinutes,
  colorIndex,
  isCompleted,
  isScheduled,
  isDaily,
  isInPurgatory,
  isHighlight,
  canHighlight,
  energyLevel,
  paletteId,
  onDurationClick,
  onEnergyChange,
  onDailyToggle,
  onHighlightToggle,
  onComplete,
  onDelete,
}: TaskCardProps) {
  const bgColor = getColor(paletteId, colorIndex);

  const handleEnergyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEnergyChange(ENERGY_CYCLE[energyLevel]);
  };

  // Format duration compactly
  const durationLabel =
    durationMinutes >= 60
      ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 > 0 ? durationMinutes % 60 : ""}`
      : `${durationMinutes}m`;

  return (
    <div
      className={`px-3 py-2 rounded-lg bg-[var(--task-bg)] border border-theme relative overflow-hidden group transition-all ${
        isHighlight ? "ring-1 ring-[var(--highlight-ring)]" : ""
      } ${
        isCompleted
          ? "opacity-50"
          : isScheduled && !isInPurgatory
            ? "opacity-60"
            : ""
      }`}
      style={{
        borderLeftWidth: "4px",
        borderLeftColor: bgColor,
        boxShadow: "var(--shadow-task)",
      }}
      title={title}
      data-task-id={id}
      data-title={title}
      data-duration={durationMinutes}
      data-color-index={colorIndex}
      data-color={bgColor}
    >
      {/* Single horizontal line layout */}
      <div className="flex items-center gap-2.5">
        {/* Title - takes remaining space */}
        <span
          className={`flex-1 text-theme-primary font-medium text-sm truncate ${
            isCompleted ? "line-through" : ""
          }`}
        >
          {title}
        </span>

        {/* Duration - tap to cycle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDurationClick(e.shiftKey);
          }}
          className="text-theme-secondary hover:text-theme-primary text-xs font-medium min-w-[28px] text-right transition-colors"
          title="Click to change duration (Shift+click to decrease)"
        >
          {durationLabel}
        </button>

        {/* Energy - tap to cycle */}
        <button
          onClick={handleEnergyClick}
          className="text-xs hover:scale-105 transition-transform"
          title={`Energy: ${energyLevel} (click to change)`}
        >
          {ENERGY_ICONS[energyLevel]}
        </button>

        {/* Daily checkbox */}
        <label
          className="flex items-center cursor-pointer"
          title="Repeat daily"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isDaily}
            onChange={onDailyToggle}
            className="w-3 h-3 rounded border-theme accent-accent-primary"
          />
        </label>

        {/* Highlight star - only for date lists */}
        {canHighlight && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onHighlightToggle();
            }}
            className={`text-xs transition-all ${
              isHighlight
                ? "opacity-100 scale-105"
                : "opacity-40 hover:opacity-100 hover:scale-105"
            }`}
            title={isHighlight ? "Remove highlight" : "Set as highlight"}
          >
            {isHighlight ? "⭐" : "☆"}
          </button>
        )}

        {/* Complete - always visible, more prominent */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          className="opacity-50 hover:opacity-100 transition-all hover:scale-105"
          title="Mark as complete"
        >
          <CheckCircle className="h-4 w-4 text-theme-secondary hover:text-accent-success" />
        </button>

        {/* Delete - always visible */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-50 hover:opacity-100 transition-all hover:scale-105"
          title="Delete task"
        >
          <Trash2 className="h-3.5 w-3.5 text-theme-tertiary hover:text-accent-danger" />
        </button>
      </div>
    </div>
  );
}
