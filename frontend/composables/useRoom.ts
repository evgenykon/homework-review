import type { Book } from '~/types/book'
import type { NotificationPayload } from '~/composables/useNotifications'

export type ChatMessage = {
  id: number
  sessionId: string
  senderId: string
  body: string
  system?: boolean
  data?: string | null
  createdAt: string
}

export type GameResultLink = {
  type: 'game-result'
  gameId: string
  attemptId: string
}

export type StrokePoint = {
  x: number
  y: number
}

export type StrokeData = {
  points: StrokePoint[]
  color: string
  width: number
  mode?: 'draw' | 'erase'
}

export type Stroke = {
  id: string
  pageId: string
  data: StrokeData
  createdAt: string
}

export type RoomPage = {
  id: string
  sessionId: string
  position: number
  fileName: string
  mimeType: string
  createdAt: string
  strokes: Stroke[]
}

export type ReviewStatus = 'PENDING' | 'REVIEWED' | 'APPROVED'

export type RoomSession = {
  id: string
  name: string
  status: ReviewStatus
  approvedAt: string | null
  archivedAt: string | null
  childId: string
  parentId: string
  createdAt: string
  updatedAt: string
}

type RoomEvent = {
  type: string
  message?: ChatMessage
  page?: RoomPage
  pageId?: string
  stroke?: Stroke
  strokeId?: string
  session?: RoomSession
  sessionId?: string
  kind?: string
  title?: string
  body?: string
}

export function useRoom(sessionId: string) {
  const config = useRuntimeConfig()
  const { user } = useAuth()
  const { notify } = useNotifications()

  const session = ref<RoomSession | null>(null)
  const messages = ref<ChatMessage[]>([])
  const pages = ref<RoomPage[]>([])
  const books = ref<Book[]>([])
  const currentPageId = ref<string | null>(null)
  const connected = ref(false)
  const gameVersion = ref(0)

  let socket: WebSocket | null = null

  const currentPage = computed(
    () => pages.value.find((page) => page.id === currentPageId.value) ?? null,
  )

  const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  const seenStorageKey = computed(() =>
    user.value ? `room-seen-pages:${user.value.id}:${sessionId}` : null,
  )

  const seenPageIds = ref<Set<string>>(new Set())

  const readSeenPageIds = (): Set<string> | null => {
    if (!import.meta.client || !seenStorageKey.value) {
      return null
    }

    try {
      const raw = localStorage.getItem(seenStorageKey.value)
      return raw ? new Set(JSON.parse(raw) as string[]) : null
    } catch {
      return null
    }
  }

  const persistSeenPageIds = () => {
    if (!import.meta.client || !seenStorageKey.value) {
      return
    }

    try {
      localStorage.setItem(seenStorageKey.value, JSON.stringify([...seenPageIds.value]))
    } catch {
      // localStorage недоступен — подсветка не сохранится между визитами
    }
  }

  // Первый визит: считаем все уже загруженные фото просмотренными,
  // чтобы подсвечивались только действительно новые.
  const initSeenPageIds = (knownPages: RoomPage[]) => {
    const stored = readSeenPageIds()

    seenPageIds.value = stored ?? new Set(knownPages.map((page) => page.id))
    persistSeenPageIds()
  }

  const markPageSeen = (pageId: string) => {
    if (seenPageIds.value.has(pageId)) {
      return
    }

    seenPageIds.value = new Set(seenPageIds.value).add(pageId)
    persistSeenPageIds()
  }

  const isPageFresh = (page: RoomPage) => !seenPageIds.value.has(page.id)

  const refreshPages = async () => {
    const data = await $fetch<RoomPage[]>(`/api/sessions/${sessionId}/pages`, {
      headers: requestHeaders,
      ignoreResponseError: true,
    })

    pages.value = Array.isArray(data) ? data : []
    initSeenPageIds(pages.value)
    currentPageId.value = pages.value.at(-1)?.id ?? null
  }

  const refreshBooks = async () => {
    const data = await $fetch<Book[]>(`/api/sessions/${sessionId}/books`, {
      headers: requestHeaders,
      ignoreResponseError: true,
    })

    books.value = Array.isArray(data) ? data : []
  }

  const load = async () => {
    const [sessionData, messagesData, pagesData, booksData] = await Promise.all([
      $fetch<RoomSession>(`/api/sessions/${sessionId}`, {
        headers: requestHeaders,
        ignoreResponseError: true,
      }),
      $fetch<ChatMessage[]>(`/api/sessions/${sessionId}/messages`, {
        headers: requestHeaders,
        ignoreResponseError: true,
      }),
      $fetch<RoomPage[]>(`/api/sessions/${sessionId}/pages`, {
        headers: requestHeaders,
        ignoreResponseError: true,
      }),
      $fetch<Book[]>(`/api/sessions/${sessionId}/books`, {
        headers: requestHeaders,
        ignoreResponseError: true,
      }),
    ])

    if (sessionData && typeof sessionData === 'object' && 'id' in sessionData) {
      session.value = sessionData
    }

    messages.value = Array.isArray(messagesData) ? messagesData : []
    pages.value = Array.isArray(pagesData) ? pagesData : []
    books.value = Array.isArray(booksData) ? booksData : []
    initSeenPageIds(pages.value)
    currentPageId.value = pages.value.at(-1)?.id ?? null
  }

  const connect = () => {
    socket = new WebSocket(`${config.public.wsBase}/ws?sessionId=${encodeURIComponent(sessionId)}`)

    socket.addEventListener('open', () => {
      connected.value = true
    })

    socket.addEventListener('close', () => {
      connected.value = false
    })

    socket.addEventListener('message', async (event) => {
      const payload = JSON.parse(event.data as string) as RoomEvent

      if (payload.type === 'message' && payload.message) {
        messages.value.push(payload.message)
        void markRead()
      } else if (payload.type === 'page:add' && payload.page) {
        const page: RoomPage = { ...payload.page, strokes: [] }
        pages.value.push(page)
        currentPageId.value = page.id
      } else if (payload.type === 'page:remove' && payload.pageId) {
        pages.value = pages.value.filter((page) => page.id !== payload.pageId)

        if (currentPageId.value === payload.pageId) {
          currentPageId.value = pages.value.at(-1)?.id ?? null
        }
      } else if (payload.type === 'stroke:add' && payload.stroke) {
        const page = pages.value.find((item) => item.id === payload.stroke?.pageId)
        if (!page) {
          return
        }

        if (page.strokes.some((stroke) => stroke.id === payload.stroke!.id)) {
          return
        }

        // Если такой штрих уже нарисован локально (оптимистично) — заменяем временный
        const optimisticIndex = page.strokes.findIndex(
          (stroke) =>
            stroke.id.startsWith('temp-') && sameStroke(stroke.data, payload.stroke!.data),
        )

        if (optimisticIndex !== -1) {
          page.strokes[optimisticIndex] = payload.stroke
        } else {
          page.strokes.push(payload.stroke)
        }
      } else if (payload.type === 'stroke:remove' && payload.strokeId) {
        for (const page of pages.value) {
          page.strokes = page.strokes.filter((stroke) => stroke.id !== payload.strokeId)
        }
      } else if (payload.type === 'session:update' && payload.session) {
        session.value = payload.session
      } else if (payload.type === 'session:deleted' && payload.sessionId === sessionId) {
        await navigateTo('/dashboard')
      } else if (payload.type === 'session:books:changed') {
        void refreshBooks()
      } else if (payload.type === 'game:changed') {
        gameVersion.value++
      } else if (payload.type === 'notification' && payload.kind && payload.title && payload.body) {
        notify({
          kind: payload.kind,
          title: payload.title,
          body: payload.body,
          sessionId: payload.sessionId,
        } satisfies NotificationPayload)
      }
    })
  }

  const sendMessage = (body: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return
    }

    socket.send(JSON.stringify({ body }))
  }

  const uploadPages = async (files: File[]) => {
    for (const file of files) {
      const form = new FormData()
      form.append('file', file)

      const page = await $fetch<RoomPage>(`/api/sessions/${sessionId}/pages`, {
        method: 'POST',
        body: form,
      })

      if (page?.id) {
        markPageSeen(page.id)
      }
    }

    if (!connected.value) {
      await refreshPages()
    }
  }

  const deletePage = async (pageId: string) => {
    await $fetch(`/api/pages/${pageId}`, { method: 'DELETE' })

    if (!connected.value) {
      await refreshPages()
    }
  }

  // Оптимистичное добавление штриха: линия появляется сразу, POST уходит фоном.
  // Сервер рассылает stroke:add обратно — сверяемся и убираем дубликат.
  const addStroke = async (pageId: string, data: StrokeData) => {
    const page = pages.value.find((item) => item.id === pageId)

    if (!page) {
      return
    }

    const tempId = `temp-${crypto.randomUUID()}`
    page.strokes.push({
      id: tempId,
      pageId,
      data,
      createdAt: new Date().toISOString(),
    })

    try {
      const created = await $fetch<Stroke>(`/api/pages/${pageId}/strokes`, {
        method: 'POST',
        body: { data },
      })

      if (created?.id) {
        const index = page.strokes.findIndex((stroke) => stroke.id === tempId)
        if (index !== -1) {
          page.strokes[index] = created
        }
      }
    } catch {
      // Не удалось сохранить — убираем временный штрих
      const index = page.strokes.findIndex((stroke) => stroke.id === tempId)
      if (index !== -1) {
        page.strokes.splice(index, 1)
      }
    }
  }

  const sameStroke = (a: StrokeData, b: StrokeData): boolean =>
    a.color === b.color &&
    a.width === b.width &&
    (a.mode ?? 'draw') === (b.mode ?? 'draw') &&
    a.points.length === b.points.length &&
    a.points.every(
      (point, index) => point.x === b.points[index]?.x && point.y === b.points[index]?.y,
    )

  const undoLastStroke = async (pageId: string) => {
    const page = pages.value.find((item) => item.id === pageId)
    const last = page?.strokes.at(-1)

    if (!last) {
      return
    }

    if (last.id.startsWith('temp-')) {
      // Штрих ещё не сохранён на сервере — просто убираем локально
      if (page) {
        page.strokes = page.strokes.filter((stroke) => stroke.id !== last.id)
      }
      return
    }

    await $fetch(`/api/strokes/${last.id}`, { method: 'DELETE' })
  }

  const review = async (result: 'REVIEWED' | 'APPROVED') => {
    const updated = await $fetch<RoomSession>(`/api/sessions/${sessionId}/review`, {
      method: 'POST',
      body: { result },
    })

    if (updated && typeof updated === 'object' && 'id' in updated) {
      session.value = updated
    }
  }

  const archive = async () => {
    await $fetch(`/api/sessions/${sessionId}/archive`, { method: 'POST' })
  }

  const restore = async () => {
    const updated = await $fetch<RoomSession>(`/api/sessions/${sessionId}/restore`, {
      method: 'POST',
    })

    if (updated && typeof updated === 'object' && 'id' in updated) {
      session.value = updated
    }
  }

  const remove = async () => {
    await $fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
  }

  const markRead = async () => {
    await $fetch(`/api/sessions/${sessionId}/read`, { method: 'POST' })
  }

  onBeforeUnmount(() => {
    socket?.close()
  })

  return {
    user,
    session,
    messages,
    pages,
    books,
    currentPage,
    currentPageId,
    connected,
    load,
    connect,
    sendMessage,
    uploadPages,
    deletePage,
    addStroke,
    undoLastStroke,
    review,
    archive,
    restore,
    remove,
    markRead,
    refreshBooks,
    isPageFresh,
    markPageSeen,
    gameVersion,
  }
}
