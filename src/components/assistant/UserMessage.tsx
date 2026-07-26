/**
 * A user turn: a filled bubble pushed to the right of the column, with a tail
 * hanging off its bottom-right corner. Only the user gets a bubble — assistant
 * replies are plain text, so the bubbles mark where the conversation turns.
 */
export function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end pl-8">
      <div className="relative max-w-[85%]">
        <div className="bg-assistant-bubble text-assistant-bubble-foreground px-4 py-3 text-[15px]/[1.5] whitespace-pre-wrap break-words">
          {content}
        </div>
        <span
          aria-hidden
          className="absolute top-full right-0 block size-3 bg-assistant-bubble [clip-path:polygon(0_0,100%_0,100%_100%)]"
        />
      </div>
    </div>
  )
}
