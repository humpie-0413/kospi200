import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const getPages = () => {
    const pages: number[] = []
    const start = Math.max(1, page - 2)
    const end = Math.min(totalPages, start + 4)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  return (
    <div className="flex items-center justify-center gap-1 pt-4">
      <Button
        variant="ghost"
        size="icon"
        disabled={page === 1}
        onClick={() => onPageChange(1)}
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {getPages().map((p) => (
        <Button
          key={p}
          variant={p === page ? 'default' : 'ghost'}
          size="icon"
          onClick={() => onPageChange(p)}
          className="h-8 w-8"
        >
          {p}
        </Button>
      ))}

      <Button
        variant="ghost"
        size="icon"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={page === totalPages}
        onClick={() => onPageChange(totalPages)}
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
