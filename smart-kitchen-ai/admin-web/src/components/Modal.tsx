// Hộp thoại dùng chung cho chi tiết, biểu mẫu và xác nhận thao tác.
// Khóa cuộn nền, quản lý focus, đóng bằng Escape hoặc nhấn nền bên ngoài.
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export default function Modal({
  title,
  onClose,
  children,
  className = "",
  header,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  header?: ReactNode;
}) {
  const id = useId();
  const ref = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", escape);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`dialog ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const elements = e.currentTarget.querySelectorAll<HTMLElement>(
            "button:not(:disabled), input, select, a[href]",
          );
          const first = elements[0],
            last = elements[elements.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }}
      >
        <button
          ref={ref}
          className="dialog-close icon-button"
          aria-label="Đóng"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        {header}
        <h2 id={id}>{title}</h2>
        {children}
      </section>
    </div>
  );
}
