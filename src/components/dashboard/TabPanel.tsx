"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

interface TabPanelProps {
  children: ReactNode;
  id: string;
  activeTab: string;
}

export function TabPanel({ children, id, activeTab }: TabPanelProps) {
  return (
    <AnimatePresence mode="wait">
      {activeTab === id && (
        <motion.div
          key={id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
