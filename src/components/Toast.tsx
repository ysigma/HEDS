interface ToastProps {
  message: string | null;
}

/** Non-blocking confirmation, announced politely to screen readers. */
export function Toast({ message }: ToastProps) {
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {message && <div className="toast">{message}</div>}
    </div>
  );
}
