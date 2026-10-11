import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function FilterMultiselect({ label, values, options, onChange, disabled = false }: {
  label: string; values: string[]; options: string[]; onChange: (values: string[]) => void; disabled?: boolean;
}) {
  const choices = [...new Set([...options, ...values])].filter(value => value !== 'all');
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button disabled={disabled} variant="outline" aria-label={`${label}: ${values.length ? values.join(', ') : 'All'}`}
        className="h-8 w-full min-w-0 justify-between rounded-sm border-border bg-background px-2 text-xs">
        <span className="truncate">{values.length ? values.join(', ') : `All ${label}`}</span><ChevronDown className="ml-1 size-3.5 shrink-0" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent className="max-h-72 w-64 max-w-[calc(100vw-2rem)] overflow-y-auto" align="start">
      <DropdownMenuItem onSelect={() => onChange([])}>All {label} / Clear selection</DropdownMenuItem>
      <DropdownMenuSeparator />
      {choices.map(value => <DropdownMenuCheckboxItem key={value} checked={values.includes(value)}
        disabled={!values.includes(value) && values.length >= 50}
        onSelect={event => event.preventDefault()}
        onCheckedChange={checked => onChange(checked ? [...values, value] : values.filter(item => item !== value))}>
        <span className="truncate" title={value}>{value}{!options.includes(value) && ' (not in current results)'}</span>
      </DropdownMenuCheckboxItem>)}
      {!choices.length && <DropdownMenuItem disabled>No options available</DropdownMenuItem>}
    </DropdownMenuContent>
  </DropdownMenu>;
}
