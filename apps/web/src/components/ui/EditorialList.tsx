import * as React from 'react'
import { cn } from '~/lib/utils'
import { editorialListClassName, editorialRowClassName } from '~/lib/class-names'

type EditorialListProps = React.ComponentProps<'ul'>

export function EditorialList({ className, ...props }: EditorialListProps) {
  return <ul className={cn(editorialListClassName, className)} {...props} />
}

type EditorialListItemProps = React.ComponentProps<'li'>

export function EditorialListItem({ className, ...props }: EditorialListItemProps) {
  return <li className={cn(editorialRowClassName, className)} {...props} />
}
