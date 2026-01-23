'use client'

import { useTaskHandlers } from './useTaskHandlers'
import { useListHandlers } from './useListHandlers'
import { useFocusHandlers } from './useFocusHandlers'
import { useDragHandlers } from './useDragHandlers'
import { useRolloverHandlers } from './useRolloverHandlers'

export function useAppHandlers() {
  const taskHandlers = useTaskHandlers()
  const listHandlers = useListHandlers()
  const focusHandlers = useFocusHandlers()
  const dragHandlers = useDragHandlers()
  const rolloverHandlers = useRolloverHandlers()

  return {
    ...taskHandlers,
    ...listHandlers,
    ...focusHandlers,
    ...dragHandlers,
    ...rolloverHandlers,
  }
}