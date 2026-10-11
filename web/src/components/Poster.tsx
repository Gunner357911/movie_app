import { useEffect, useRef, useState } from 'react'

// Card thumbnail; tap or click to see the poster full screen.
export default function Poster({ src, title }: { src: string; title: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="poster-btn" aria-label={`Show the ${title} poster`} onClick={() => setOpen(true)}>
        <img className="poster" src={src} alt="" loading="lazy" />
      </button>
      {open && <PosterViewer src={src} title={title} onClose={() => setOpen(false)} />}
    </>
  )
}

// Mounted only while open. Esc, the close button, or a tap anywhere closes it.
function PosterViewer({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog || dialog.open) return
    dialog.showModal()
    dialog.focus() // instead of the auto-focused close button, which would show a focus ring
  }, [])

  return (
    <dialog ref={ref} className="poster-viewer" tabIndex={-1} aria-label={`${title} poster`} onClose={onClose} onClick={() => ref.current?.close()}>
      <button type="button" className="icon poster-close" aria-label="Close">
        ✕
      </button>
      <figure>
        <img src={src} alt={`${title} poster`} />
        <figcaption>{title}</figcaption>
      </figure>
    </dialog>
  )
}
