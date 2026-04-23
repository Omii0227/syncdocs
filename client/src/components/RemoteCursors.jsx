/**
 * RemoteCursors — renders colored cursor lines + name labels
 * over the textarea for each remote user.
 *
 * Uses a hidden mirror div with identical styles to convert
 * character position → pixel (top, left) coordinates.
 */

// ── Step 4: Mirror div technique ─────────────────────────────────────────────
function getCaretCoordinates(element, position) {
  // Get or create the persistent mirror div
  let mirror = document.getElementById('syncdocs-cursor-mirror')
  if (!mirror) {
    mirror = document.createElement('div')
    mirror.id = 'syncdocs-cursor-mirror'
    mirror.style.position = 'absolute'
    mirror.style.top = '0'
    mirror.style.left = '-9999px'
    mirror.style.visibility = 'hidden'
    mirror.style.overflow = 'hidden'
    document.body.appendChild(mirror)
  }

  const cs = window.getComputedStyle(element)

  // Copy exact styles from textarea to mirror
  mirror.style.width = element.offsetWidth + 'px'
  mirror.style.font = cs.font
  mirror.style.fontSize = cs.fontSize
  mirror.style.fontFamily = cs.fontFamily
  mirror.style.fontWeight = cs.fontWeight
  mirror.style.lineHeight = cs.lineHeight
  mirror.style.letterSpacing = cs.letterSpacing
  mirror.style.padding = cs.padding
  mirror.style.paddingTop = cs.paddingTop
  mirror.style.paddingRight = cs.paddingRight
  mirror.style.paddingBottom = cs.paddingBottom
  mirror.style.paddingLeft = cs.paddingLeft
  mirror.style.borderTopWidth = cs.borderTopWidth
  mirror.style.borderRightWidth = cs.borderRightWidth
  mirror.style.borderBottomWidth = cs.borderBottomWidth
  mirror.style.borderLeftWidth = cs.borderLeftWidth
  mirror.style.boxSizing = cs.boxSizing
  mirror.style.whiteSpace = 'pre-wrap'
  mirror.style.wordBreak = 'break-word'
  mirror.style.wordWrap = 'break-word'

  // Text before cursor position
  const textUpToCursor = element.value.substring(0, position)
  mirror.textContent = textUpToCursor

  // Span marker at cursor position
  const span = document.createElement('span')
  span.textContent = '|'
  mirror.appendChild(span)

  const { offsetTop, offsetLeft } = span

  return { top: offsetTop, left: offsetLeft }
}

// ── Step 5: Render cursor overlays ───────────────────────────────────────────
export default function RemoteCursors({ cursors, textareaRef }) {
  const ta = textareaRef.current
  if (!ta || Object.keys(cursors).length === 0) return null

  return (
    <>
      {Object.values(cursors).map((cursor) => {
        const safePos = Math.max(0, Math.min(cursor.position, ta.value.length))
        let coords
        try {
          coords = getCaretCoordinates(ta, safePos)
        } catch {
          return null
        }

        // Adjust for textarea scroll
        const top = coords.top - ta.scrollTop
        const left = coords.left

        // Don't render if scrolled out of view
        if (top < 0 || top > ta.offsetHeight) return null

        return (
          <div
            key={cursor.userId || cursor.userName}
            style={{
              position: 'absolute',
              top: top,
              left: left,
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            {/* Username label ABOVE cursor */}
            <div
              style={{
                position: 'absolute',
                top: '-22px',
                left: '0px',
                backgroundColor: cursor.userColor,
                color: 'white',
                fontSize: '11px',
                fontWeight: '600',
                padding: '2px 6px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
                fontFamily: 'sans-serif',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}
            >
              {cursor.userName}
            </div>

            {/* Cursor vertical line */}
            <div
              style={{
                width: '2px',
                height: '18px',
                backgroundColor: cursor.userColor,
                borderRadius: '1px',
                animation: 'blink 1s step-end infinite',
                boxShadow: `0 0 4px ${cursor.userColor}`,
              }}
            />
          </div>
        )
      })}
    </>
  )
}
