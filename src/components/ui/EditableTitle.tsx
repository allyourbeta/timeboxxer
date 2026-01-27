"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";

interface EditableTitleProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
}

export function EditableTitle({ value, onSave, className = "" }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus and select all when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Sync with prop changes when not editing
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditValue(value);
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setEditValue(value); // Revert if empty or unchanged
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`bg-transparent border-none outline-none ring-1 ring-accent-primary rounded px-1 -mx-1 ${className}`}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      onDoubleClick={handleDoubleClick}
      className={`cursor-text ${className}`}
      title="Double-click to edit"
    >
      {value}
    </span>
  );
}