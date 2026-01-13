'use client'

import { useState } from 'react'

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
    <input
      type="text"
      placeholder="Add task..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyPress={(e) => {
        if (e.key === 'Enter') handleSubmit()
      }}
      className="w-full p-2 text-sm bg-gray-700 text-white placeholder-gray-400 rounded border-none outline-none focus:ring-2 focus:ring-blue-500"
    />
  )
}