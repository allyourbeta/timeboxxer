# MAJOR REFACTOR: Replace Custom Code with Battle-Tested Libraries

---

## ⚠️ CRITICAL INSTRUCTIONS FOR CLAUDE CODE ⚠️

**READ THIS ENTIRE DOCUMENT BEFORE WRITING ANY CODE.**

This is a significant refactor. We are REPLACING custom, buggy code with professional libraries that solve these problems correctly.

### MANDATORY RULES:
1. **NO FILE OVER 300 LINES.** Check with `wc -l` after every change.
2. **Run `npm run build` after EVERY major step.** Fix errors before moving on.
3. **Do NOT keep old custom code.** Delete it. We're replacing, not layering.
4. **Do NOT ask for confirmation.** Execute the refactor.
5. **Commit after EACH major section**, not at the end.
6. **If something isn't working, check the library's official docs.**

### File Size Check Command
```bash
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 300 {print "FAIL: " $0; exit 1}'
```

---

## Overview: What We're Replacing

| Current (Custom/Buggy) | Replacement (Library) |
|------------------------|----------------------|
| DayView, TimeSlot, ScheduledTaskBlock, ResizeHandle | **FullCalendar** |
| Custom buttons, inputs, dropdowns with inconsistent styling | **shadcn/ui** |
| Custom theme system (backgroundThemes.ts, CSS vars, localStorage) | **next-themes** |
| Emoji icons | **lucide-react** |

---

## SECTION 1: Install All Dependencies

Run this first:

```bash
npm install @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction next-themes lucide-react class-variance-authority clsx tailwind-merge
```

**Commit:**
```bash
git add -A && git commit -m "chore: Install FullCalendar, next-themes, lucide-react, and shadcn dependencies"
```

---

## SECTION 2: Set Up shadcn/ui Foundation

### 2.1 Create `src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### 2.2 Create `src/components/ui/button.tsx`:

```typescript
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

### 2.3 Create `src/components/ui/input.tsx`:

```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
```

### 2.4 Create `src/components/ui/toggle.tsx`:

```typescript
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-3",
        sm: "h-8 px-2",
        lg: "h-10 px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ToggleProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof toggleVariants> {
  pressed?: boolean
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className, variant, size, pressed, ...props }, ref) => (
    <button
      ref={ref}
      data-state={pressed ? "on" : "off"}
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
)
Toggle.displayName = "Toggle"

export { Toggle, toggleVariants }
```

### 2.5 Create `src/components/ui/index.ts`:

```typescript
export { Button } from './button'
export { Input } from './input'
export { Toggle } from './toggle'
```

**Commit:**
```bash
git add -A && git commit -m "feat: Add shadcn/ui foundation (Button, Input, Toggle)"
```

---

## SECTION 3: Set Up next-themes

### 3.1 Create `src/components/theme-provider.tsx`:

```typescript
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

### 3.2 Update `src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Timeboxxer",
  description: "Time-boxing for focus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 3.3 Update `src/app/globals.css`:

Replace the entire file with:

```css
@import "tailwindcss";

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 48%;
}

* {
  border-color: hsl(var(--border));
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}
```

**Commit:**
```bash
git add -A && git commit -m "feat: Add next-themes with light/dark mode support"
```

---

## SECTION 4: Replace Calendar with FullCalendar

### 4.1 Delete old calendar components:

```bash
rm src/components/Calendar/DayView.tsx
rm src/components/Calendar/TimeSlot.tsx
rm src/components/Calendar/ScheduledTaskBlock.tsx
rm src/components/Calendar/ResizeHandle.tsx
```

### 4.2 Create `src/components/Calendar/TaskCalendar.tsx`:

```typescript
'use client'

import { useRef, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { EventDropArg, EventResizeDoneArg } from '@fullcalendar/interaction'
import { EventClickArg, EventContentArg } from '@fullcalendar/core'
import { getColor } from '@/lib/palettes'

interface Task {
  id: string
  title: string
  duration_minutes: number
  color_index: number
}

interface ScheduledTask {
  id: string
  task_id: string
  scheduled_date: string
  start_time: string
}

interface TaskCalendarProps {
  tasks: Task[]
  scheduled: ScheduledTask[]
  paletteId: string
  onEventDrop: (taskId: string, newTime: string) => void
  onEventResize: (taskId: string, newDuration: number) => void
  onEventClick: (taskId: string) => void
  onDateClick: (time: string) => void
  onExternalDrop: (time: string) => void
  draggedTaskId: string | null
}

export function TaskCalendar({
  tasks,
  scheduled,
  paletteId,
  onEventDrop,
  onEventResize,
  onEventClick,
  onDateClick,
  onExternalDrop,
  draggedTaskId,
}: TaskCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null)

  // Convert scheduled tasks to FullCalendar events
  const events = scheduled.map(s => {
    const task = tasks.find(t => t.id === s.task_id)
    if (!task) return null
    
    const [hours, minutes] = s.start_time.split(':').map(Number)
    const start = new Date()
    start.setHours(hours, minutes, 0, 0)
    
    const end = new Date(start)
    end.setMinutes(end.getMinutes() + task.duration_minutes)
    
    return {
      id: s.task_id,
      title: task.title,
      start,
      end,
      backgroundColor: getColor(paletteId, task.color_index),
      borderColor: getColor(paletteId, task.color_index),
      extendedProps: {
        taskId: task.id,
        duration: task.duration_minutes,
      },
    }
  }).filter(Boolean)

  // Handle event drop (drag to reschedule)
  const handleEventDrop = (info: EventDropArg) => {
    const taskId = info.event.extendedProps.taskId
    const newStart = info.event.start
    if (newStart) {
      const timeStr = `${newStart.getHours().toString().padStart(2, '0')}:${newStart.getMinutes().toString().padStart(2, '0')}:00`
      onEventDrop(taskId, timeStr)
    }
  }

  // Handle event resize
  const handleEventResize = (info: EventResizeDoneArg) => {
    const taskId = info.event.extendedProps.taskId
    const start = info.event.start
    const end = info.event.end
    if (start && end) {
      const durationMs = end.getTime() - start.getTime()
      const durationMinutes = Math.round(durationMs / 60000)
      // Snap to 15-minute increments
      const snappedDuration = Math.round(durationMinutes / 15) * 15
      onEventResize(taskId, Math.max(15, Math.min(120, snappedDuration)))
    }
  }

  // Handle clicking on an event
  const handleEventClick = (info: EventClickArg) => {
    onEventClick(info.event.extendedProps.taskId)
  }

  // Handle clicking on empty time slot
  const handleDateClick = (info: { dateStr: string; date: Date }) => {
    const timeStr = `${info.date.getHours().toString().padStart(2, '0')}:${info.date.getMinutes().toString().padStart(2, '0')}`
    onDateClick(timeStr)
  }

  // Handle external drop (from task list)
  const handleDrop = (info: { date: Date; draggedEl: HTMLElement }) => {
    const timeStr = `${info.date.getHours().toString().padStart(2, '0')}:${info.date.getMinutes().toString().padStart(2, '0')}`
    onExternalDrop(timeStr)
  }

  // Custom event content
  const renderEventContent = (eventInfo: EventContentArg) => {
    return (
      <div className="p-1 overflow-hidden h-full">
        <div className="font-medium text-sm truncate text-white">{eventInfo.event.title}</div>
        <div className="text-xs text-white/70">{eventInfo.event.extendedProps.duration} min</div>
      </div>
    )
  }

  // Scroll to current time on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (calendarRef.current) {
        const api = calendarRef.current.getApi()
        api.scrollToTime('08:00:00')
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="h-full fc-theme-custom">
      <FullCalendar
        ref={calendarRef}
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridDay"
        headerToolbar={false}
        allDaySlot={false}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        slotDuration="00:15:00"
        slotLabelInterval="01:00:00"
        slotLabelFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short'
        }}
        height="100%"
        events={events}
        editable={true}
        droppable={true}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        drop={handleDrop}
        eventContent={renderEventContent}
        snapDuration="00:15:00"
        nowIndicator={true}
      />
    </div>
  )
}
```

### 4.3 Update `src/components/Calendar/index.ts`:

```typescript
export { TaskCalendar } from './TaskCalendar'
```

### 4.4 Add FullCalendar CSS to `src/app/globals.css`:

Add this at the end of globals.css:

```css
/* FullCalendar customizations */
.fc {
  --fc-border-color: hsl(var(--border));
  --fc-button-bg-color: hsl(var(--secondary));
  --fc-button-border-color: hsl(var(--border));
  --fc-button-text-color: hsl(var(--foreground));
  --fc-button-hover-bg-color: hsl(var(--accent));
  --fc-button-hover-border-color: hsl(var(--border));
  --fc-button-active-bg-color: hsl(var(--primary));
  --fc-event-border-color: transparent;
  --fc-now-indicator-color: hsl(0 84.2% 60.2%);
  --fc-page-bg-color: hsl(var(--background));
  --fc-neutral-bg-color: hsl(var(--muted));
  --fc-today-bg-color: hsl(var(--accent) / 0.1);
}

.fc .fc-timegrid-slot {
  height: 3rem;
}

.fc .fc-timegrid-slot-label {
  font-size: 0.875rem;
}

.fc .fc-timegrid-slot-minor {
  border-top-style: dotted;
}

.fc-theme-standard td,
.fc-theme-standard th {
  border-color: hsl(var(--border));
}

.fc .fc-timegrid-now-indicator-line {
  border-color: hsl(0 84.2% 60.2%);
  border-width: 2px;
}

.fc .fc-timegrid-now-indicator-arrow {
  border-color: hsl(0 84.2% 60.2%);
  border-top-color: transparent;
  border-bottom-color: transparent;
}

.fc-event {
  cursor: grab;
  border-radius: 4px;
}

.fc-event:active {
  cursor: grabbing;
}
```

**Commit:**
```bash
git add -A && git commit -m "feat: Replace custom calendar with FullCalendar"
```

---

## SECTION 5: Update Header with shadcn/ui Components

### 5.1 Replace `src/components/Layout/Header.tsx`:

```typescript
'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Calendar, List, Columns } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'

interface HeaderProps {
  currentView: 'main' | 'completed'
  panelMode: 'both' | 'lists-only' | 'calendar-only'
  onViewChange: (view: 'main' | 'completed') => void
  onPanelModeChange: (mode: 'both' | 'lists-only' | 'calendar-only') => void
}

export function Header({ 
  currentView, 
  panelMode, 
  onViewChange, 
  onPanelModeChange,
}: HeaderProps) {
  const { theme, setTheme } = useTheme()

  return (
    <header className="h-14 px-4 border-b flex items-center justify-between bg-background">
      <h1 className="text-xl font-bold">Timeboxxer</h1>
      
      <div className="flex items-center gap-2">
        {/* Panel Mode Controls - only show on main view */}
        {currentView === 'main' && (
          <div className="flex items-center rounded-lg border p-1">
            <Toggle
              pressed={panelMode === 'lists-only'}
              onPressedChange={() => onPanelModeChange('lists-only')}
              size="sm"
              aria-label="Show lists only"
            >
              <List className="h-4 w-4" />
            </Toggle>
            <Toggle
              pressed={panelMode === 'both'}
              onPressedChange={() => onPanelModeChange('both')}
              size="sm"
              aria-label="Show both"
            >
              <Columns className="h-4 w-4" />
            </Toggle>
            <Toggle
              pressed={panelMode === 'calendar-only'}
              onPressedChange={() => onPanelModeChange('calendar-only')}
              size="sm"
              aria-label="Show calendar only"
            >
              <Calendar className="h-4 w-4" />
            </Toggle>
          </div>
        )}
        
        {/* View Controls */}
        <div className="flex items-center rounded-lg border p-1">
          <Toggle
            pressed={currentView === 'main'}
            onPressedChange={() => onViewChange('main')}
            size="sm"
          >
            Today
          </Toggle>
          <Toggle
            pressed={currentView === 'completed'}
            onPressedChange={() => onViewChange('completed')}
            size="sm"
          >
            Completed
          </Toggle>
        </div>
        
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>
    </header>
  )
}
```

**Commit:**
```bash
git add -A && git commit -m "feat: Update Header with shadcn/ui components and lucide icons"
```

---

## SECTION 6: Update Other Components to Use shadcn/ui

### 6.1 Update `src/components/Tasks/AddTaskInput.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface AddTaskInputProps {
  onAdd: (title: string) => void
}

export function AddTaskInput({ onAdd }: AddTaskInputProps) {
  const [value, setValue] = useState('')
  
  const handleSubmit = () => {
    if (value.trim()) {
      onAdd(value.trim())
      setValue('')
    }
  }
  
  return (
    <Input
      type="text"
      placeholder="Add task..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyPress={(e) => {
        if (e.key === 'Enter') handleSubmit()
      }}
    />
  )
}
```

### 6.2 Update `src/components/Tasks/TaskCard.tsx`:

```typescript
'use client'

import { Trash2 } from 'lucide-react'
import { getColor } from '@/lib/palettes'
import { Button } from '@/components/ui/button'

interface TaskCardProps {
  id: string
  title: string
  durationMinutes: number
  colorIndex: number
  isCompleted: boolean
  paletteId: string
  isColorPickerOpen: boolean
  onDragStart: () => void
  onDurationClick: () => void
  onColorClick: () => void
  onColorSelect: (colorIndex: number) => void
  onDelete: () => void
}

export function TaskCard({
  id,
  title,
  durationMinutes,
  colorIndex,
  isCompleted,
  paletteId,
  isColorPickerOpen,
  onDragStart,
  onDurationClick,
  onColorClick,
  onColorSelect,
  onDelete,
}: TaskCardProps) {
  const bgColor = getColor(paletteId, colorIndex)
  
  return (
    <div
      draggable={!isCompleted}
      onDragStart={onDragStart}
      className={`p-3 rounded-lg cursor-grab active:cursor-grabbing transition-transform hover:scale-[1.02] group relative ${
        isCompleted ? 'opacity-50' : ''
      }`}
      style={{ backgroundColor: bgColor }}
      data-task-id={id}
    >
      <div className="flex items-start gap-2">
        {/* Color dot */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onColorClick()
          }}
          className="w-4 h-4 rounded-full border-2 border-white/30 hover:border-white/60 flex-shrink-0 mt-1 transition-colors"
          style={{ backgroundColor: bgColor }}
          title="Change color"
        />
        
        <div className="flex-1 min-w-0">
          <div className={`font-medium text-white ${isCompleted ? 'line-through' : ''}`}>
            {title}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDurationClick()
            }}
            className="text-sm text-white/70 hover:text-white cursor-pointer transition-colors"
          >
            {durationMinutes} min
          </button>
        </div>
        
        {/* Delete button */}
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 h-6 w-6 text-white/70 hover:text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      
      {/* Color picker popover */}
      {isColorPickerOpen && (
        <div
          className="absolute top-full left-0 mt-1 p-2 bg-popover rounded-lg shadow-lg z-20 grid grid-cols-6 gap-1 border"
          onClick={(e) => e.stopPropagation()}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <button
              key={i}
              onClick={() => onColorSelect(i)}
              className="w-6 h-6 rounded-full hover:scale-110 transition-transform ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ backgroundColor: getColor(paletteId, i) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

### 6.3 Update `src/components/Lists/ListCard.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { ChevronDown, Copy, Trash2 } from 'lucide-react'
import { TaskCard, AddTaskInput } from '@/components/Tasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Task {
  id: string
  title: string
  duration_minutes: number
  color_index: number
  is_completed: boolean
}

interface ListCardProps {
  id: string
  name: string
  isInbox: boolean
  tasks: Task[]
  paletteId: string
  colorPickerTaskId: string | null
  isEditing: boolean
  isDuplicating: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onStartEdit: () => void
  onFinishEdit: (newName: string) => void
  onCancelEdit: () => void
  onStartDuplicate: () => void
  onFinishDuplicate: (newName: string) => void
  onCancelDuplicate: () => void
  onDelete: () => void
  onTaskDragStart: (taskId: string) => void
  onTaskDurationClick: (taskId: string, currentDuration: number) => void
  onTaskColorClick: (taskId: string) => void
  onTaskColorSelect: (taskId: string, colorIndex: number) => void
  onTaskDelete: (taskId: string) => void
  onTaskAdd: (title: string) => void
}

export function ListCard({
  id,
  name,
  isInbox,
  tasks,
  paletteId,
  colorPickerTaskId,
  isEditing,
  isDuplicating,
  isExpanded,
  onToggleExpand,
  onStartEdit,
  onFinishEdit,
  onCancelEdit,
  onStartDuplicate,
  onFinishDuplicate,
  onCancelDuplicate,
  onDelete,
  onTaskDragStart,
  onTaskDurationClick,
  onTaskColorClick,
  onTaskColorSelect,
  onTaskDelete,
  onTaskAdd,
}: ListCardProps) {
  const [editName, setEditName] = useState(name)
  const [duplicateName, setDuplicateName] = useState(`${name} Copy`)
  
  // Get the first task's color for accent bar
  const getFirstTaskColor = () => {
    if (tasks.length === 0) return 'hsl(var(--primary))'
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
    return colors[tasks[0].color_index] || 'hsl(var(--primary))'
  }
  
  return (
    <div className={`
      rounded-xl overflow-hidden transition-all duration-200 border
      ${isExpanded 
        ? 'bg-card shadow-lg' 
        : 'bg-card/50 hover:bg-card hover:shadow-md'
      }
    `}>
      {/* Header - always visible */}
      {isEditing ? (
        <div className="p-4">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onFinishEdit(editName)
              if (e.key === 'Escape') onCancelEdit()
            }}
            onBlur={() => onFinishEdit(editName)}
            autoFocus
          />
        </div>
      ) : (
        <button
          onClick={onToggleExpand}
          className="w-full p-4 flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            {/* Colored accent bar */}
            <div 
              className="w-1 h-8 rounded-full"
              style={{ backgroundColor: getFirstTaskColor() }}
            />
            <div className="text-left">
              <h3 
                className="font-semibold"
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  onStartEdit()
                }}
              >
                {name}
              </h3>
              <p className="text-sm text-muted-foreground">{tasks.length} tasks</p>
            </div>
          </div>
          
          {/* Expand/collapse icon - animated */}
          <div className={`
            w-8 h-8 rounded-full bg-muted
            flex items-center justify-center
            transition-transform duration-200
            ${isExpanded ? 'rotate-180' : ''}
          `}>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </button>
      )}
      
      {/* Action buttons - only when expanded and not editing */}
      {!isEditing && isExpanded && (
        <div className="px-4 pb-2">
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onStartDuplicate}
              className="h-8 w-8"
            >
              <Copy className="h-4 w-4" />
            </Button>
            {!isInbox && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              id={task.id}
              title={task.title}
              durationMinutes={task.duration_minutes}
              colorIndex={task.color_index}
              isCompleted={task.is_completed}
              paletteId={paletteId}
              isColorPickerOpen={colorPickerTaskId === task.id}
              onDragStart={() => onTaskDragStart(task.id)}
              onDurationClick={() => onTaskDurationClick(task.id, task.duration_minutes)}
              onColorClick={() => onTaskColorClick(task.id)}
              onColorSelect={(colorIndex) => onTaskColorSelect(task.id, colorIndex)}
              onDelete={() => onTaskDelete(task.id)}
            />
          ))}
          
          <AddTaskInput onAdd={onTaskAdd} />
        </div>
      )}
      
      {/* Duplicate input */}
      {isDuplicating && (
        <div className="px-4 pb-4">
          <Input
            placeholder="New list name..."
            value={duplicateName}
            onChange={(e) => setDuplicateName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onFinishDuplicate(duplicateName)
              if (e.key === 'Escape') onCancelDuplicate()
            }}
            onBlur={() => {
              if (duplicateName.trim()) {
                onFinishDuplicate(duplicateName)
              } else {
                onCancelDuplicate()
              }
            }}
            autoFocus
          />
        </div>
      )}
    </div>
  )
}
```

### 6.4 Update `src/components/Lists/ListPanel.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ListCard } from './ListCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Task {
  id: string
  list_id: string | null
  title: string
  duration_minutes: number
  color_index: number
  is_completed: boolean
}

interface List {
  id: string
  name: string
  position: number
  is_inbox: boolean
}

interface ListPanelProps {
  lists: List[]
  tasks: Task[]
  paletteId: string
  colorPickerTaskId: string | null
  editingListId: string | null
  duplicatingListId: string | null
  showNewListInput: boolean
  expandedListByColumn: Record<number, string | null>
  onShowNewListInput: (show: boolean) => void
  onCreateList: (name: string) => void
  onEditList: (listId: string, name: string) => void
  onDeleteList: (listId: string) => void
  onDuplicateList: (listId: string, newName: string) => void
  onSetEditingListId: (listId: string | null) => void
  onSetDuplicatingListId: (listId: string | null) => void
  onToggleListExpanded: (listId: string, column: number) => void
  onTaskDragStart: (taskId: string) => void
  onTaskDurationChange: (taskId: string, duration: number) => void
  onTaskColorClick: (taskId: string) => void
  onTaskColorSelect: (taskId: string, colorIndex: number) => void
  onTaskDelete: (taskId: string) => void
  onTaskCreate: (listId: string, title: string) => void
}

export function ListPanel({
  lists,
  tasks,
  paletteId,
  colorPickerTaskId,
  editingListId,
  duplicatingListId,
  showNewListInput,
  expandedListByColumn,
  onShowNewListInput,
  onCreateList,
  onEditList,
  onDeleteList,
  onDuplicateList,
  onSetEditingListId,
  onSetDuplicatingListId,
  onToggleListExpanded,
  onTaskDragStart,
  onTaskDurationChange,
  onTaskColorClick,
  onTaskColorSelect,
  onTaskDelete,
  onTaskCreate,
}: ListPanelProps) {
  const [newListName, setNewListName] = useState('')
  
  const getTasksForList = (listId: string) =>
    tasks.filter(t => t.list_id === listId && !t.is_completed)
  
  const cycleDuration = (current: number) => {
    const durations = [15, 30, 45, 60]
    const idx = durations.indexOf(current)
    return durations[(idx + 1) % durations.length]
  }
  
  return (
    <div className="border-r overflow-y-auto bg-background">
      <div className="grid grid-cols-3 gap-4 p-4">
        {lists.map((list, index) => {
          const column = index % 3
          const isExpanded = expandedListByColumn[column] === list.id
          return (
            <ListCard
              key={list.id}
              id={list.id}
              name={list.name}
              isInbox={list.is_inbox}
              tasks={getTasksForList(list.id)}
              paletteId={paletteId}
              colorPickerTaskId={colorPickerTaskId}
              isEditing={editingListId === list.id}
              isDuplicating={duplicatingListId === list.id}
              isExpanded={isExpanded}
              onToggleExpand={() => onToggleListExpanded(list.id, column)}
              onStartEdit={() => onSetEditingListId(list.id)}
              onFinishEdit={(name) => {
                onEditList(list.id, name)
                onSetEditingListId(null)
              }}
              onCancelEdit={() => onSetEditingListId(null)}
              onStartDuplicate={() => onSetDuplicatingListId(list.id)}
              onFinishDuplicate={(name) => {
                onDuplicateList(list.id, name)
                onSetDuplicatingListId(null)
              }}
              onCancelDuplicate={() => onSetDuplicatingListId(null)}
              onDelete={() => onDeleteList(list.id)}
              onTaskDragStart={onTaskDragStart}
              onTaskDurationClick={(taskId, duration) => 
                onTaskDurationChange(taskId, cycleDuration(duration))
              }
              onTaskColorClick={onTaskColorClick}
              onTaskColorSelect={onTaskColorSelect}
              onTaskDelete={onTaskDelete}
              onTaskAdd={(title) => onTaskCreate(list.id, title)}
            />
          )
        })}
        
        {/* Add new list */}
        {showNewListInput ? (
          <div className="rounded-xl border bg-card p-4">
            <Input
              placeholder="List name..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newListName.trim()) {
                  onCreateList(newListName.trim())
                  setNewListName('')
                  onShowNewListInput(false)
                }
                if (e.key === 'Escape') {
                  setNewListName('')
                  onShowNewListInput(false)
                }
              }}
              onBlur={() => {
                if (!newListName.trim()) {
                  onShowNewListInput(false)
                }
              }}
              autoFocus
            />
          </div>
        ) : (
          <Button
            variant="outline"
            className="h-auto p-4 justify-start border-dashed"
            onClick={() => onShowNewListInput(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add List
          </Button>
        )}
      </div>
    </div>
  )
}
```

### 6.5 Update `src/components/Layout/CompletedView.tsx`:

```typescript
'use client'

import { RotateCcw } from 'lucide-react'
import { getColor } from '@/lib/palettes'
import { Button } from '@/components/ui/button'

interface Task {
  id: string
  list_id: string | null
  title: string
  duration_minutes: number
  color_index: number
  completed_at: string | null
}

interface List {
  id: string
  name: string
}

interface CompletedViewProps {
  tasks: Task[]
  lists: List[]
  paletteId: string
  onRestore: (taskId: string) => void
}

export function CompletedView({ tasks, lists, paletteId, onRestore }: CompletedViewProps) {
  const completedTasks = tasks
    .filter(t => t.completed_at)
    .sort((a, b) => 
      new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()
    )
  
  const getListName = (listId: string | null) => {
    if (!listId) return 'Unknown list'
    return lists.find(l => l.id === listId)?.name || 'Unknown list'
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Completed Tasks</h2>
        <p className="text-sm text-muted-foreground">Tasks you've finished</p>
      </div>
      
      <div className="space-y-2">
        {completedTasks.map(task => (
          <div
            key={task.id}
            className="p-3 rounded-lg bg-card border flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: getColor(paletteId, task.color_index) }}
              />
              <div>
                <div className="font-medium">{task.title}</div>
                <div className="text-xs text-muted-foreground">
                  From: {getListName(task.list_id)} • {task.duration_minutes} min • 
                  Completed {new Date(task.completed_at!).toLocaleString()}
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRestore(task.id)}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Restore
            </Button>
          </div>
        ))}
        
        {completedTasks.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p>No completed tasks yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Commit:**
```bash
git add -A && git commit -m "feat: Update all components to use shadcn/ui and lucide-react"
```

---

## SECTION 7: Update Main Page

### 7.1 Replace `src/app/page.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { useTaskStore, useListStore, useScheduleStore, useUIStore } from '@/state'
import { Header, CompletedView } from '@/components/Layout'
import { ListPanel } from '@/components/Lists'
import { TaskCalendar } from '@/components/Calendar'

const PALETTE_ID = 'ocean-bold'

export default function Home() {
  // Stores
  const { tasks, loading: tasksLoading, loadTasks, createTask, updateTask, deleteTask, completeTask, uncompleteTask } = useTaskStore()
  const { lists, loading: listsLoading, loadLists, createList, updateList, deleteList, duplicateList } = useListStore()
  const { scheduled, loading: scheduleLoading, loadSchedule, scheduleTask, unscheduleTask } = useScheduleStore()
  const { 
    currentView, setCurrentView,
    panelMode, setPanelMode,
    draggedTaskId, setDraggedTaskId,
    colorPickerTaskId, openColorPicker, closeColorPicker,
    editingListId, setEditingListId,
    duplicatingListId, setDuplicatingListId,
    showNewListInput, setShowNewListInput,
    expandedListByColumn, toggleListExpanded,
  } = useUIStore()
  
  // Load data on mount
  useEffect(() => {
    loadTasks()
    loadLists()
    loadSchedule()
  }, [loadTasks, loadLists, loadSchedule])

  // Close color picker on outside click
  useEffect(() => {
    if (colorPickerTaskId) {
      const handler = () => closeColorPicker()
      document.addEventListener('click', handler)
      return () => document.removeEventListener('click', handler)
    }
  }, [colorPickerTaskId, closeColorPicker])
  
  const loading = tasksLoading || listsLoading || scheduleLoading
  
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }
  
  // Calendar event handlers
  const handleEventDrop = async (taskId: string, newTime: string) => {
    const today = new Date().toISOString().split('T')[0]
    await unscheduleTask(taskId)
    await scheduleTask(taskId, today, newTime)
  }
  
  const handleEventResize = async (taskId: string, newDuration: number) => {
    await updateTask(taskId, { duration_minutes: newDuration })
  }
  
  const handleEventClick = (taskId: string) => {
    // Could open a modal or mark complete
    completeTask(taskId)
  }
  
  const handleDateClick = (time: string) => {
    // Could create a new task at this time
    console.log('Date clicked:', time)
  }
  
  const handleExternalDrop = async (time: string) => {
    if (!draggedTaskId) return
    const today = new Date().toISOString().split('T')[0]
    await scheduleTask(draggedTaskId, today, time + ':00')
    setDraggedTaskId(null)
  }
  
  const handleDurationChange = async (taskId: string, newDuration: number) => {
    await updateTask(taskId, { duration_minutes: newDuration })
  }
  
  const handleColorSelect = async (taskId: string, colorIndex: number) => {
    await updateTask(taskId, { color_index: colorIndex })
    closeColorPicker()
  }
  
  return (
    <div className="h-screen flex flex-col bg-background">
      <Header 
        currentView={currentView} 
        panelMode={panelMode}
        onViewChange={setCurrentView} 
        onPanelModeChange={setPanelMode}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {currentView === 'main' ? (
          <>
            {(panelMode === 'both' || panelMode === 'lists-only') && (
              <div className={panelMode === 'lists-only' ? 'flex-1' : 'w-1/2'}>
                <ListPanel
                  lists={lists}
                  tasks={tasks}
                  paletteId={PALETTE_ID}
                  colorPickerTaskId={colorPickerTaskId}
                  editingListId={editingListId}
                  duplicatingListId={duplicatingListId}
                  showNewListInput={showNewListInput}
                  expandedListByColumn={expandedListByColumn}
                  onShowNewListInput={setShowNewListInput}
                  onCreateList={createList}
                  onEditList={updateList}
                  onDeleteList={deleteList}
                  onDuplicateList={duplicateList}
                  onSetEditingListId={setEditingListId}
                  onSetDuplicatingListId={setDuplicatingListId}
                  onToggleListExpanded={toggleListExpanded}
                  onTaskDragStart={setDraggedTaskId}
                  onTaskDurationChange={handleDurationChange}
                  onTaskColorClick={openColorPicker}
                  onTaskColorSelect={handleColorSelect}
                  onTaskDelete={deleteTask}
                  onTaskCreate={createTask}
                />
              </div>
            )}
            
            {(panelMode === 'both' || panelMode === 'calendar-only') && (
              <div className={panelMode === 'calendar-only' ? 'flex-1' : 'flex-1'}>
                <TaskCalendar
                  tasks={tasks}
                  scheduled={scheduled}
                  paletteId={PALETTE_ID}
                  onEventDrop={handleEventDrop}
                  onEventResize={handleEventResize}
                  onEventClick={handleEventClick}
                  onDateClick={handleDateClick}
                  onExternalDrop={handleExternalDrop}
                  draggedTaskId={draggedTaskId}
                />
              </div>
            )}
          </>
        ) : (
          <CompletedView
            tasks={tasks}
            lists={lists}
            paletteId={PALETTE_ID}
            onRestore={uncompleteTask}
          />
        )}
      </div>
    </div>
  )
}
```

**Commit:**
```bash
git add -A && git commit -m "feat: Update main page to use TaskCalendar and simplified props"
```

---

## SECTION 8: Clean Up

### 8.1 Simplify `src/state/useUIStore.ts`:

Remove the theme and backgroundTheme since next-themes handles it:

```typescript
import { create } from 'zustand'

interface UIStore {
  // View state
  currentView: 'main' | 'completed'
  setCurrentView: (view: 'main' | 'completed') => void
  
  // Drag state
  draggedTaskId: string | null
  setDraggedTaskId: (taskId: string | null) => void
  
  // Color picker
  colorPickerTaskId: string | null
  openColorPicker: (taskId: string) => void
  closeColorPicker: () => void
  
  // List editing
  editingListId: string | null
  setEditingListId: (listId: string | null) => void
  
  // New list input
  showNewListInput: boolean
  setShowNewListInput: (show: boolean) => void
  
  // Duplicate list
  duplicatingListId: string | null
  setDuplicatingListId: (listId: string | null) => void
  
  // Collapsible lists (multi-column layout)
  expandedListByColumn: Record<number, string | null>
  toggleListExpanded: (listId: string, column: number) => void
  
  // Panel focus modes
  panelMode: 'both' | 'lists-only' | 'calendar-only'
  setPanelMode: (mode: 'both' | 'lists-only' | 'calendar-only') => void
}

export const useUIStore = create<UIStore>((set) => ({
  currentView: 'main',
  setCurrentView: (view) => set({ currentView: view }),
  
  draggedTaskId: null,
  setDraggedTaskId: (taskId) => set({ draggedTaskId: taskId }),
  
  colorPickerTaskId: null,
  openColorPicker: (taskId) => set({ colorPickerTaskId: taskId }),
  closeColorPicker: () => set({ colorPickerTaskId: null }),
  
  editingListId: null,
  setEditingListId: (listId) => set({ editingListId: listId }),
  
  showNewListInput: false,
  setShowNewListInput: (show) => set({ showNewListInput: show }),
  
  duplicatingListId: null,
  setDuplicatingListId: (listId) => set({ duplicatingListId: listId }),
  
  expandedListByColumn: { 0: null, 1: null, 2: null },
  toggleListExpanded: (listId, column) => set((state) => ({
    expandedListByColumn: {
      ...state.expandedListByColumn,
      [column]: state.expandedListByColumn[column] === listId ? null : listId
    }
  })),
  
  panelMode: 'both',
  setPanelMode: (mode) => set({ panelMode: mode }),
}))
```

### 8.2 Delete unused files:

```bash
rm src/lib/backgroundThemes.ts
```

**Commit:**
```bash
git add -A && git commit -m "chore: Clean up - remove custom theme code, simplify store"
```

---

## SECTION 9: Final Verification

```bash
# Build
npm run build

# Check file sizes
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -n | tail -15

# Verify no files over 300 lines
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 300 {print "FAIL: " $0; exit 1}' && echo "✓ All files under 300 lines"
```

**Final Commit:**
```bash
git add -A && git commit -m "refactor: Complete migration to FullCalendar, shadcn/ui, and next-themes"
```

---

## Summary of Changes

### Deleted (Custom/Buggy Code):
- `src/components/Calendar/DayView.tsx`
- `src/components/Calendar/TimeSlot.tsx`
- `src/components/Calendar/ScheduledTaskBlock.tsx`
- `src/components/Calendar/ResizeHandle.tsx`
- `src/lib/backgroundThemes.ts`

### Added (Libraries):
- FullCalendar for calendar with drag/drop/resize
- shadcn/ui for consistent UI components
- next-themes for theme switching
- lucide-react for icons

### New Files:
- `src/lib/utils.ts` (shadcn utility)
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/toggle.tsx`
- `src/components/ui/index.ts`
- `src/components/theme-provider.tsx`
- `src/components/Calendar/TaskCalendar.tsx`

### Updated Files:
- `src/app/layout.tsx` (ThemeProvider)
- `src/app/globals.css` (shadcn + FullCalendar CSS)
- `src/app/page.tsx` (simplified)
- `src/components/Layout/Header.tsx` (shadcn + lucide)
- `src/components/Layout/CompletedView.tsx` (shadcn)
- `src/components/Lists/ListCard.tsx` (shadcn + lucide)
- `src/components/Lists/ListPanel.tsx` (shadcn)
- `src/components/Tasks/TaskCard.tsx` (shadcn + lucide)
- `src/components/Tasks/AddTaskInput.tsx` (shadcn)
- `src/state/useUIStore.ts` (removed theme state)
