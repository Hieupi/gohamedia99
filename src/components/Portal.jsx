import { createPortal } from 'react-dom'

/**
 * Portal — renders children directly into document.body,
 * bypassing any CSS transform/stacking context from parent components.
 * This ensures modals are always fixed to the viewport.
 */
export default function Portal({ children }) {
    return createPortal(children, document.body)
}
