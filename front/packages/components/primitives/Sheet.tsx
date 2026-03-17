import React from "react";
import { AnimatePresence, motion } from "framer-motion";

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  placement = "bottom",
  sheetClassName = "",
  overlay = "dim",
  showClose = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  placement?: "bottom" | "top";
  sheetClassName?: string;
  overlay?: "dim" | "none";
  showClose?: boolean;
}) {
  const isTop = placement === "top";
  const overlayStyle =
    overlay === "dim"
      ? { backgroundColor: "rgba(15, 23, 42, 0.45)" }
      : { backgroundColor: "transparent" };
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="overlay"
            className="fixed inset-0 z-40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={overlayStyle}
          />
          <motion.div
            key="sheet"
            className={`fixed inset-x-0 z-50 mx-auto w-full max-w-2xl border border-lp-border bg-white shadow-lp-xl ${
              isTop
                ? "top-0 rounded-b-2xl border-t-0"
                : "bottom-0 rounded-t-2xl"
            } ${sheetClassName}`}
            initial={{ y: isTop ? -24 : 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: isTop ? -24 : 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <div className="px-4 pt-3">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-lp-text">{title}</div>
                  {subtitle ? <div className="text-xs text-lp-muted">{subtitle}</div> : null}
                </div>
                {showClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-lp-border px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    Закрыть
                  </button>
                ) : null}
              </div>
            </div>
            <div className="max-h-[70vh] overflow-auto px-4 pb-6 pt-4">{children}</div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
