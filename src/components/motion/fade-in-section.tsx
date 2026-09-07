"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Reduced-motion handling is centralized in <MotionConfig reducedMotion="user"> (root layout). */
export function FadeInSection({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}
