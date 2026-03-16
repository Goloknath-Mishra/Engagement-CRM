import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useEffect, useMemo, useState } from 'react'

export type KanbanColumn = { key: string; label: string }

type Id = string | number
type DragPayload = { id: Id; fromColumn: string }
type OrderState = Record<string, Id[]>

/** Generic kanban board with optional drag/drop and persisted ordering per board key. */
export function KanbanBoard<T>({
  columns,
  items,
  boardKey,
  getId,
  getColumnKey,
  getTitle,
  getSubtitle,
  getMeta,
  onClickItem,
  enableDnD,
  onMoveItem,
}: {
  columns: KanbanColumn[]
  items: T[]
  boardKey?: string
  getId?: (item: T) => string | number
  getColumnKey: (item: T) => string
  getTitle: (item: T) => string
  getSubtitle?: (item: T) => string
  getMeta?: (item: T) => Array<{ label: string; color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' }>
  onClickItem?: (item: T) => void
  enableDnD?: boolean
  onMoveItem?: (item: T, toColumnKey: string) => void
}) {
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dropBeforeId, setDropBeforeId] = useState<Id | null>(null)

  const orderStorageKey = useMemo(() => {
    if (!enableDnD || !boardKey) return null
    return `crm.boardOrder.${boardKey}`
  }, [boardKey, enableDnD])

  const [orderState, setOrderState] = useState<OrderState>(() => {
    if (!orderStorageKey) return {}
    const raw = localStorage.getItem(orderStorageKey)
    if (!raw) return {}
    try {
      return JSON.parse(raw) as OrderState
    } catch {
      return {}
    }
  })

  const grouped = useMemo(() => {
    const g = new Map<string, T[]>()
    for (const c of columns) g.set(c.key, [])
    for (const it of items) {
      const key = getColumnKey(it)
      g.set(key, [...(g.get(key) ?? []), it])
    }
    return g
  }, [columns, getColumnKey, items])

  const idOf = useMemo(() => {
    return (it: T): Id => {
      if (getId) return getId(it)
      return getTitle(it)
    }
  }, [getId, getTitle])

  useEffect(() => {
    if (!orderStorageKey) return
    const next: OrderState = {}
    for (const c of columns) next[c.key] = [...(orderState[c.key] ?? [])]

    const allIdsByColumn = new Map<string, Set<Id>>()
    for (const c of columns) allIdsByColumn.set(c.key, new Set())
    for (const it of items) {
      const col = getColumnKey(it)
      const set = allIdsByColumn.get(col) ?? new Set()
      set.add(idOf(it))
      allIdsByColumn.set(col, set)
    }

    for (const c of columns) {
      const existing = next[c.key] ?? []
      const allowed = allIdsByColumn.get(c.key) ?? new Set()
      const filtered = existing.filter((id) => allowed.has(id))
      const existingSet = new Set(filtered)
      const missing: Id[] = []
      for (const it of grouped.get(c.key) ?? []) {
        const id = idOf(it)
        if (!existingSet.has(id)) missing.push(id)
      }
      next[c.key] = [...filtered, ...missing]
    }

    const prevStr = JSON.stringify(orderState)
    const nextStr = JSON.stringify(next)
    if (prevStr !== nextStr) {
      setOrderState(next)
      localStorage.setItem(orderStorageKey, nextStr)
    }
  }, [columns, getColumnKey, grouped, idOf, items, orderState, orderStorageKey])

  function orderedItemsForColumn(columnKey: string, colItems: T[]) {
    if (!orderStorageKey) return colItems
    const order = orderState[columnKey] ?? []
    if (!order.length) return colItems
    const map = new Map<Id, T>()
    for (const it of colItems) map.set(idOf(it), it)
    const out: T[] = []
    for (const id of order) {
      const found = map.get(id)
      if (found) out.push(found)
    }
    if (out.length === colItems.length) return out
    const outSet = new Set(out.map((x) => idOf(x)))
    for (const it of colItems) {
      const id = idOf(it)
      if (!outSet.has(id)) out.push(it)
    }
    return out
  }

  function applyMove(payload: DragPayload, toColumnKey: string, beforeId: Id | null) {
    if (!orderStorageKey) {
      const moved = items.find((it) => idOf(it) === payload.id)
      if (moved) onMoveItem?.(moved, toColumnKey)
      return
    }

    const next: OrderState = { ...orderState }
    for (const c of columns) next[c.key] = [...(next[c.key] ?? [])]

    const fromArr = next[payload.fromColumn] ?? []
    next[payload.fromColumn] = fromArr.filter((id) => id !== payload.id)

    const toArr = next[toColumnKey] ?? []
    const cleaned = toArr.filter((id) => id !== payload.id)
    const insertAt = beforeId ? Math.max(0, cleaned.findIndex((id) => id === beforeId)) : cleaned.length
    next[toColumnKey] = [...cleaned.slice(0, insertAt), payload.id, ...cleaned.slice(insertAt)]

    setOrderState(next)
    localStorage.setItem(orderStorageKey, JSON.stringify(next))

    const moved = items.find((it) => idOf(it) === payload.id)
    if (moved) onMoveItem?.(moved, toColumnKey)
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: `repeat(${Math.min(columns.length, 4)}, 1fr)` },
        gap: 2,
        alignItems: 'start',
      }}
    >
      {columns.map((c) => {
        const colItems = orderedItemsForColumn(c.key, grouped.get(c.key) ?? [])
        const isOver = dragOver === c.key
        return (
          <Box
            key={c.key}
            onDragOver={(e) => {
              if (!enableDnD || !onMoveItem) return
              e.preventDefault()
              setDragOver(c.key)
              setDropBeforeId(null)
            }}
            onDragLeave={() => {
              if (!enableDnD || !onMoveItem) return
              setDragOver((prev) => (prev === c.key ? null : prev))
              setDropBeforeId(null)
            }}
            onDrop={(e) => {
              if (!enableDnD || !onMoveItem) return
              e.preventDefault()
              setDragOver(null)
              setDropBeforeId(null)
              const raw = e.dataTransfer.getData('text/plain')
              if (!raw) return
              try {
                const parsed = JSON.parse(raw) as DragPayload
                applyMove(parsed, c.key, null)
              } catch {
                return
              }
            }}
            sx={(t) => ({
              borderRadius: 3,
              p: 1,
              transition: 'background-color 120ms ease, box-shadow 120ms ease',
              backgroundColor: isOver ? alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.14 : 0.10) : 'transparent',
              boxShadow: isOver ? `0 0 0 1px ${alpha(t.palette.primary.main, 0.35)} inset` : 'none',
            })}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {c.label}
              </Typography>
              <Chip size="small" label={colItems.length} />
            </Stack>
            <Stack spacing={1.25}>
              {colItems.map((it, idx) => (
                <Card
                  key={getId ? getId(it) : idx}
                  draggable={!!enableDnD && !!onMoveItem}
                  onDragStart={(e) => {
                    if (!enableDnD || !onMoveItem) return
                    setIsDragging(true)
                    const id = idOf(it)
                    const payload: DragPayload = { id, fromColumn: c.key }
                    e.dataTransfer.setData('text/plain', JSON.stringify(payload))
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={() => {
                    setDragOver(null)
                    setIsDragging(false)
                    setDropBeforeId(null)
                  }}
                  onDragOver={(e) => {
                    if (!enableDnD || !onMoveItem) return
                    e.preventDefault()
                    setDragOver(c.key)
                    setDropBeforeId(idOf(it))
                  }}
                  onDrop={(e) => {
                    if (!enableDnD || !onMoveItem) return
                    e.preventDefault()
                    setDragOver(null)
                    const raw = e.dataTransfer.getData('text/plain')
                    if (!raw) return
                    try {
                      const parsed = JSON.parse(raw) as DragPayload
                      applyMove(parsed, c.key, idOf(it))
                    } catch {
                      return
                    } finally {
                      setDropBeforeId(null)
                      setIsDragging(false)
                    }
                  }}
                  onClick={() => {
                    if (isDragging) return
                    onClickItem?.(it)
                  }}
                  sx={{
                    cursor: onClickItem ? 'pointer' : 'default',
                    transition: 'transform 120ms ease, box-shadow 120ms ease',
                    '&:hover': onClickItem
                      ? {
                          transform: 'translateY(-2px)',
                        }
                      : undefined,
                    boxShadow:
                      enableDnD && dropBeforeId !== null && dropBeforeId === idOf(it) && isOver
                        ? '0 0 0 2px rgba(124,58,237,0.35) inset'
                        : undefined,
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {getTitle(it)}
                    </Typography>
                    {getSubtitle ? (
                      <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                        {getSubtitle(it)}
                      </Typography>
                    ) : null}
                    {getMeta ? (
                      <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: 'wrap' }}>
                        {getMeta(it).map((m, mIdx) => (
                          <Chip key={mIdx} size="small" label={m.label} color={m.color ?? 'default'} />
                        ))}
                      </Stack>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
              {colItems.length === 0 ? (
                <Box sx={{ opacity: 0.6, border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 3, p: 2 }}>
                  <Typography variant="caption">No items</Typography>
                </Box>
              ) : null}
            </Stack>
          </Box>
        )
      })}
    </Box>
  )
}
