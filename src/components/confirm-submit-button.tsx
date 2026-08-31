"use client";

export function ConfirmSubmitButton({
  className,
  confirmMessage,
  children,
}: {
  className?: string;
  confirmMessage: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
