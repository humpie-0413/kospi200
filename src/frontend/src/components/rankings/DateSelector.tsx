import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DateSelectorProps {
  dates: string[]
  value: string
  onChange: (date: string) => void
}

export function DateSelector({ dates, value, onChange }: DateSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => { if (v) onChange(v) }}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="날짜 선택" />
      </SelectTrigger>
      <SelectContent>
        {dates.map((d) => (
          <SelectItem key={d} value={d}>
            {d}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
