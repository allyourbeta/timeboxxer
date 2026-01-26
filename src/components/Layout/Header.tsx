"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import {
  Sun,
  Moon,
  List,
  Calendar,
  LayoutGrid,
  X,
  ChevronsDownUp,
  Rows3,
  Columns2,
  LogOut,
  Plus,
  Shuffle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";

interface HeaderProps {
  currentView: "main" | "completed";
  panelMode: "both" | "lists-only" | "calendar-only";
  onViewChange: (view: "main" | "completed") => void;
  onPanelModeChange: (mode: "both" | "lists-only" | "calendar-only") => void;
  listColumnCount: 1 | 2;
  onListColumnCountChange: (count: 1 | 2) => void;
  onQuickSave: (title: string) => void;
  onCollapseAll: () => void;
  onJustStart: () => void;
  completedToday: number;
}

export function Header({
  currentView,
  panelMode,
  onViewChange,
  onPanelModeChange,
  listColumnCount,
  onListColumnCountChange,
  onQuickSave,
  onCollapseAll,
  onJustStart,
  completedToday,
}: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [showParkInput, setShowParkInput] = useState(false);
  const [parkText, setParkText] = useState("");

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleParkSubmit = () => {
    if (parkText.trim()) {
      onQuickSave(parkText.trim());
      setParkText("");
      setShowParkInput(false);
    }
  };

  const handleParkKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleParkSubmit();
    } else if (e.key === "Escape") {
      setShowParkInput(false);
      setParkText("");
    }
  };

  return (
    <header
      className="h-14 px-4 bg-theme-secondary border-b border-theme flex items-center"
      style={{ boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)" }}
    >
      {/* LEFT GROUP: Branding & Stats */}
      <div className="flex items-center gap-4">
        <h1 
          className="text-2xl font-bold text-theme-primary tracking-tight cursor-default"
          title={`Build: ${process.env.NEXT_PUBLIC_BUILD_ID || 'dev'}\n${new Date(process.env.NEXT_PUBLIC_BUILD_TIME || Date.now()).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
        >
          Timeboxxer
        </h1>
        {completedToday > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent-success/10">
            <span className="text-sm text-accent-success">✓</span>
            <span className="text-sm font-medium text-accent-success">
              {completedToday}
            </span>
          </div>
        )}
      </div>

      {/* CENTER GROUP: View Controls - pushed to center with flex */}
      <div className="flex-1 flex items-center justify-center gap-3">
        {currentView === "main" && (
          <>
            {/* Column count: 1 / 2 - only when lists visible */}
            {(panelMode === "both" || panelMode === "lists-only") && (
              <div className="flex h-8 items-center bg-theme-tertiary rounded-lg p-1">
                <button
                  onClick={() => onListColumnCountChange(1)}
                  className={`h-6 px-2 rounded text-xs transition-all ${
                    listColumnCount === 1
                      ? "bg-theme-secondary text-theme-primary shadow-sm"
                      : "text-theme-secondary hover:text-theme-primary"
                  }`}
                  title="Single column"
                >
                  <Rows3 className="h-3 w-3" />
                </button>
                <button
                  onClick={() => onListColumnCountChange(2)}
                  className={`h-6 px-2 rounded text-xs transition-all ${
                    listColumnCount === 2
                      ? "bg-theme-secondary text-theme-primary shadow-sm"
                      : "text-theme-secondary hover:text-theme-primary"
                  }`}
                  title="Two columns"
                >
                  <Columns2 className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Panel mode: Lists / Both / Calendar */}
            <div className="flex h-8 items-center bg-theme-tertiary rounded-lg p-1">
              <button
                onClick={() => onPanelModeChange("lists-only")}
                className={`h-6 px-3 rounded text-xs transition-all ${
                  panelMode === "lists-only"
                    ? "bg-theme-secondary text-theme-primary shadow-sm"
                    : "text-theme-secondary hover:text-theme-primary"
                }`}
                title="Lists only"
              >
                <List className="h-3 w-3 mr-1" />
                Lists
              </button>
              <button
                onClick={() => onPanelModeChange("both")}
                className={`h-6 px-3 rounded text-xs transition-all ${
                  panelMode === "both"
                    ? "bg-theme-secondary text-theme-primary shadow-sm"
                    : "text-theme-secondary hover:text-theme-primary"
                }`}
                title="Both panels"
              >
                <LayoutGrid className="h-3 w-3 mr-1" />
                Both
              </button>
              <button
                onClick={() => onPanelModeChange("calendar-only")}
                className={`h-6 px-3 rounded text-xs transition-all ${
                  panelMode === "calendar-only"
                    ? "bg-theme-secondary text-theme-primary shadow-sm"
                    : "text-theme-secondary hover:text-theme-primary"
                }`}
                title="Calendar only"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Calendar
              </button>
            </div>
          </>
        )}
      </div>

      {/* RIGHT GROUP: Actions & Settings */}
      <div className="flex items-center gap-2">
        {/* Primary Actions */}
        {currentView === "main" && (
          <>
            {/* Quick Save */}
            {showParkInput ? (
              <div className="flex items-center gap-2">
                <Input
                  value={parkText}
                  onChange={(e) => setParkText(e.target.value)}
                  onKeyDown={handleParkKeyDown}
                  placeholder="Quick save a thought..."
                  className="w-48 h-8 text-sm"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowParkInput(false);
                    setParkText("");
                  }}
                  className="btn-icon h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowParkInput(true)}
                className="btn-secondary h-8 px-4 text-sm"
                title="Quick Save"
              >
                <Plus className="h-4 w-4 lg:hidden" />
                <span className="hidden lg:inline">Quick Save</span>
              </button>
            )}

            {/* FOCUS - PRIMARY ACTION, make it stand out */}
            <button
              onClick={onJustStart}
              className="btn-primary h-8 px-4 text-sm"
              title="FOCUS"
            >
              <Shuffle className="h-4 w-4 lg:hidden" />
              <span className="hidden lg:inline">FOCUS</span>
            </button>
          </>
        )}

        {/* Divider */}
        <div className="h-5 w-px bg-border-default mx-1" />

        {/* Navigation: Today / Completed */}
        <div className="flex h-8 items-center bg-theme-tertiary rounded-lg p-1">
          <button
            onClick={() => onViewChange("main")}
            className={`h-6 px-3 rounded text-xs font-medium transition-all ${
              currentView === "main"
                ? "bg-theme-secondary text-theme-primary shadow-sm"
                : "text-theme-secondary hover:text-theme-primary"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => onViewChange("completed")}
            className={`h-6 px-3 rounded text-xs font-medium transition-all ${
              currentView === "completed"
                ? "bg-theme-secondary text-theme-primary shadow-sm"
                : "text-theme-secondary hover:text-theme-primary"
            }`}
          >
            Completed
          </button>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border-default mx-1" />

        {/* Utilities */}
        {currentView === "main" && (
          <button
            onClick={onCollapseAll}
            className="btn-icon h-8 w-8"
            title="Collapse all"
          >
            <ChevronsDownUp className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={handleThemeToggle}
          className="btn-icon h-8 w-8"
          title="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={handleSignOut}
          className="btn-icon h-8 w-8"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
