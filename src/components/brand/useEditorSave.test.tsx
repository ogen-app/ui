import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorSave } from './editor'

/**
 * Every Foundation editor saves through this, so the rules worth pinning are
 * the ones that lose or duplicate work when they break: nothing is written on
 * open, an edit is written once after the pause, leaving flushes it, and a
 * delete stops the flush from writing a row that is gone.
 */

type Props = { draft: { name: string }; stored?: boolean; blocked?: boolean }

function setup(initial: Props) {
  const save = vi.fn((_draft: { name: string }) => Promise.resolve())
  const hook = renderHook(
    ({ draft, stored = true, blocked = false }: Props) =>
      useEditorSave({ draft, stored, blocked, save }),
    { initialProps: initial },
  )
  return { save, hook }
}

async function pass(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useEditorSave', () => {
  it('writes nothing on open', async () => {
    const { save, hook } = setup({ draft: { name: 'Founder' } })
    await pass(2000)
    expect(save).not.toHaveBeenCalled()
    expect(hook.result.current.saving).toBe(false)
  })

  it('writes an edit once, after the pause, and reports saving until it lands', async () => {
    const { save, hook } = setup({ draft: { name: 'Founder' } })
    hook.rerender({ draft: { name: 'Founder, dry' } })
    expect(hook.result.current.saving).toBe(true)

    await pass(599)
    expect(save).not.toHaveBeenCalled()
    await pass(1)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ name: 'Founder, dry' })
    expect(hook.result.current.saving).toBe(false)

    await pass(2000)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('sends nothing for an edit undone inside the pause', async () => {
    const { save, hook } = setup({ draft: { name: 'Founder' } })
    hook.rerender({ draft: { name: 'Founders' } })
    await pass(300)
    hook.rerender({ draft: { name: 'Founder' } })
    await pass(2000)
    expect(save).not.toHaveBeenCalled()
  })

  it('holds a blocked edit and sends it once unblocked', async () => {
    const { save, hook } = setup({ draft: { name: 'Founder' } })
    hook.rerender({ draft: { name: '' }, blocked: true })
    await pass(2000)
    expect(save).not.toHaveBeenCalled()

    hook.rerender({ draft: { name: 'Founder, dry' } })
    await pass(600)
    expect(save).toHaveBeenCalledWith({ name: 'Founder, dry' })
  })

  it('flushes a pending edit on the way out', async () => {
    const { save, hook } = setup({ draft: { name: 'Founder' } })
    hook.rerender({ draft: { name: 'Founder, dry' } })
    hook.unmount()
    expect(save).toHaveBeenCalledWith({ name: 'Founder, dry' })
  })

  it('writes nothing after hold, even on the way out', async () => {
    const { save, hook } = setup({ draft: { name: 'Founder' } })
    hook.rerender({ draft: { name: 'Founder, dry' } })
    act(() => hook.result.current.hold())
    hook.unmount()
    await pass(2000)
    expect(save).not.toHaveBeenCalled()
  })

  it('leaves a new entry to its create, and says it is unsaved', async () => {
    const { save, hook } = setup({ draft: { name: '' }, stored: false })
    hook.rerender({ draft: { name: 'Founder' }, stored: false })
    await pass(2000)
    expect(save).not.toHaveBeenCalled()
    expect(hook.result.current.unsaved).toBe(true)
    expect(hook.result.current.saving).toBe(false)
  })

  it('tries again on the next edit after a failed write', async () => {
    const save = vi
      .fn((_draft: { name: string }) => Promise.resolve())
      .mockRejectedValueOnce(new Error('offline'))
    const hook = renderHook(
      ({ draft }: { draft: { name: string } }) =>
        useEditorSave({ draft, stored: true, save }),
      { initialProps: { draft: { name: 'Founder' } } },
    )
    hook.rerender({ draft: { name: 'Founder, dry' } })
    await pass(600)
    expect(save).toHaveBeenCalledTimes(1)

    hook.rerender({ draft: { name: 'Founder, dry.' } })
    await pass(600)
    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith({ name: 'Founder, dry.' })
  })

  it('writes again after a released hold — a delete that failed', async () => {
    const { save, hook } = setup({ draft: { name: 'Founder' } })
    hook.rerender({ draft: { name: 'Founder, dry' } })
    let release = () => {}
    act(() => {
      release = hook.result.current.hold()
    })
    await pass(2000)
    expect(save).not.toHaveBeenCalled()

    act(() => release())
    await pass(600)
    expect(save).toHaveBeenCalledWith({ name: 'Founder, dry' })
  })

  it('sends a refused write again on the way out', async () => {
    const save = vi
      .fn((_draft: { name: string }) => Promise.resolve())
      .mockRejectedValueOnce(new Error('offline'))
    const hook = renderHook(
      ({ draft }: { draft: { name: string } }) =>
        useEditorSave({ draft, stored: true, save }),
      { initialProps: { draft: { name: 'Founder' } } },
    )
    hook.rerender({ draft: { name: 'Founder, dry' } })
    await pass(600)
    expect(save).toHaveBeenCalledTimes(1)

    hook.unmount()
    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith({ name: 'Founder, dry' })
  })

  it('never sends a blocked draft on the way out', async () => {
    const { save, hook } = setup({ draft: { name: 'Founder' } })
    hook.rerender({ draft: { name: '' }, blocked: true })
    hook.unmount()
    expect(save).not.toHaveBeenCalled()
  })

  it('asks before the tab closes on a blocked edit', async () => {
    const add = vi.spyOn(window, 'addEventListener')
    const { hook } = setup({ draft: { name: 'Founder' } })
    const unloads = () =>
      add.mock.calls.filter(([type]) => type === 'beforeunload').length
    const before = unloads()
    hook.rerender({ draft: { name: '' }, blocked: true })
    expect(unloads()).toBe(before + 1)
    expect(hook.result.current.saving).toBe(false)
    add.mockRestore()
  })
})
