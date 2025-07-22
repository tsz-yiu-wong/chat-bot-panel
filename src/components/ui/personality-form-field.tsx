'use client'

import { getLabel, Language } from '@/lib/bot-personality-lang'
import { DailyRoutine, LifeTimelineEvent, FamilyMember } from '@/lib/types/bot-personality'

interface FormFieldProps {
  fieldKey: string
  value: unknown
  onChange: (value: unknown) => void
  language: Language
  required?: boolean
  className?: string
}

export default function PersonalityFormField({ 
  fieldKey, 
  value, 
  onChange, 
  language, 
  required = false,
  className = '' 
}: FormFieldProps) {
  const label = getLabel(fieldKey, language)
  const placeholder = `${getLabel('enter', language)} ${label}...`

  // 渲染基础输入框
  const renderTextInput = (type: string = 'text') => (
    <input
      type={type}
      value={(value as string) || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 rounded-lg transition-colors duration-150 border border-gray-200 dark:border-[var(--border-color)] focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-[var(--component-background)] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 ${className}`}
      required={required}
    />
  )

  // 渲染文本域
  const renderTextArea = (rows: number = 3) => (
    <textarea
      value={(value as string) || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full px-3 py-2 rounded-lg transition-colors duration-150 border border-gray-200 dark:border-[var(--border-color)] focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-[var(--component-background)] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 resize-vertical ${className}`}
      required={required}
    />
  )

  // 渲染作息时间表单
  const renderDailyRoutine = () => {
    const routine: DailyRoutine = (value as DailyRoutine) || {}
    const routineFields = ['wake_up', 'breakfast', 'lunch', 'dinner', 'work_hours', 'rest_time', 'vacation']

    return (
      <div className="space-y-3 bg-white dark:bg-[var(--component-background)] border border-gray-200 dark:border-[var(--border-color)] rounded-lg p-4">
        {routineFields.map((field) => (
          <div key={field} className="flex items-center space-x-3">
            <label className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300">
              {getLabel(field, language)}
            </label>
            <input
              type="text"
              value={routine[field as keyof DailyRoutine] || ''}
              onChange={(e) => {
                const newRoutine = { ...routine, [field]: e.target.value }
                onChange(newRoutine)
              }}
              placeholder={`${getLabel(field, language)}...`}
              className="flex-1 px-3 py-1.5 rounded border border-gray-200 dark:border-[var(--border-color)] bg-white dark:bg-[var(--component-background)] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        ))}
      </div>
    )
  }

  // 渲染人生时间轴
  const renderLifeTimeline = () => {
    const timeline: LifeTimelineEvent[] = (value as LifeTimelineEvent[]) || []

    const addEvent = () => {
      const newEvent: LifeTimelineEvent = {
        year: new Date().getFullYear(),
        month: undefined,
        event: ''
      }
      onChange([...timeline, newEvent])
    }

    const updateEvent = <K extends keyof LifeTimelineEvent>(
      index: number,
      field: K,
      eventValue: LifeTimelineEvent[K]
    ) => {
      const newTimeline = [...timeline]
      newTimeline[index] = { ...newTimeline[index], [field]: eventValue }
      onChange(newTimeline)
    }

    const removeEvent = (index: number) => {
      const newTimeline = timeline.filter((_, i) => i !== index)
      onChange(newTimeline)
    }

    return (
      <div className="space-y-3">
        {timeline.map((event, index) => (
          <div key={index} className="p-4 border border-gray-200 dark:border-[var(--border-color)] rounded-lg bg-gray-50 dark:bg-[var(--accent-background)]">
            <div className="flex items-center space-x-3">
              <input
                type="number"
                value={event.year}
                onChange={(e) => updateEvent(index, 'year', parseInt(e.target.value))}
                placeholder={getLabel('year', language)}
                className="w-20 px-2 py-1 border border-gray-200 dark:border-[var(--border-color)] rounded text-sm bg-white dark:bg-[var(--component-background)] text-gray-900 dark:text-gray-100"
              />
              <input
                type="number"
                value={event.month || ''}
                onChange={(e) => updateEvent(index, 'month', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder={getLabel('month_optional', language)}
                min="1"
                max="12"
                className="w-24 px-2 py-1 border border-gray-200 dark:border-[var(--border-color)] rounded text-sm bg-white dark:bg-[var(--component-background)] text-gray-900 dark:text-gray-100"
              />
              <input
                type="text"
                value={event.event}
                onChange={(e) => updateEvent(index, 'event', e.target.value)}
                placeholder={getLabel('event_description', language)}
                className="flex-1 px-2 py-1 border border-gray-200 dark:border-[var(--border-color)] rounded text-sm bg-white dark:bg-[var(--component-background)] text-gray-900 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={() => removeEvent(index)}
                className="px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-sm transition-colors"
              >
                {getLabel('delete', language)}
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addEvent}
          className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-gray-50 dark:bg-[var(--accent-background)] hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          + {getLabel('add', language)} {getLabel('life_event', language)}
        </button>
      </div>
    )
  }

  // 渲染家庭成员
  const renderFamilyMembers = () => {
    const members: FamilyMember[] = (value as FamilyMember[]) || []

    const addMember = () => {
      const newMember: FamilyMember = {
        relationship: '',
        name: '',
        description: ''
      }
      onChange([...members, newMember])
    }

    const updateMember = (index: number, field: keyof FamilyMember, memberValue: string) => {
      const newMembers = [...members]
      newMembers[index] = { ...newMembers[index], [field]: memberValue }
      onChange(newMembers)
    }

    const removeMember = (index: number) => {
      const newMembers = members.filter((_, i) => i !== index)
      onChange(newMembers)
    }

    return (
      <div className="space-y-4">
        {members.map((member, index) => (
          <div key={index} className="p-4 border border-gray-200 dark:border-[var(--border-color)] rounded-lg bg-gray-50 dark:bg-[var(--accent-background)]">
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={member.relationship || ''}
                onChange={(e) => updateMember(index, 'relationship', e.target.value)}
                placeholder={getLabel('relationship', language)}
                className="w-28 px-2 py-1 border border-gray-200 dark:border-[var(--border-color)] rounded text-sm bg-white dark:bg-[var(--component-background)] text-gray-900 dark:text-gray-100"
              />
              <input
                type="text"
                value={member.name || ''}
                onChange={(e) => updateMember(index, 'name', e.target.value)}
                placeholder={getLabel('name', language)}
                className="w-28 px-2 py-1 border border-gray-200 dark:border-[var(--border-color)] rounded text-sm bg-white dark:bg-[var(--component-background)] text-gray-900 dark:text-gray-100"
              />
              <input
                type="text"
                value={member.description || ''}
                onChange={(e) => updateMember(index, 'description', e.target.value)}
                placeholder={getLabel('description', language)}
                className="flex-1 px-2 py-1 border border-gray-200 dark:border-[var(--border-color)] rounded text-sm bg-white dark:bg-[var(--component-background)] text-gray-900 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={() => removeMember(index)}
                className="px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-sm transition-colors"
              >
                {getLabel('delete', language)}
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addMember}
          className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-gray-50 dark:bg-[var(--accent-background)] hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          + {getLabel('add', language)} {getLabel('family_member', language)}
        </button>
      </div>
    )
  }

  // 根据字段类型渲染对应组件
  const renderField = () => {
    switch (fieldKey) {
      case 'age':
        return renderTextInput('number')
      
      case 'birth_date':
        return renderTextInput('date')
      
      // 所有单选项改为文本输入
      case 'gender':
      case 'blood_type':
      case 'marital_status':
        return renderTextInput()
      
      case 'daily_routine':
        return renderDailyRoutine()
      
      case 'life_timeline':
        return renderLifeTimeline()
      
      case 'family_members':
        return renderFamilyMembers()
      
      // 长文本字段使用文本域
      case 'current_address':
      case 'current_job':
      case 'work_address':
      case 'education_background':
      case 'marriage_history':
      case 'hobbies':
      case 'worldview':
      case 'life_philosophy':
      case 'values':
      case 'childhood_experience':
      case 'childhood_stories':
      case 'growth_experience':
      case 'relationship_experience':
      case 'work_experience':
      case 'business_experience':
      case 'investment_experience':
      case 'places_to_visit':
      case 'life_dreams':
      case 'future_thoughts':
        return renderTextArea(4)
      
      // 其他字段使用基础输入框（包括education_level, graduate_school, major等）
      default:
        return renderTextInput()
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderField()}
    </div>
  )
} 