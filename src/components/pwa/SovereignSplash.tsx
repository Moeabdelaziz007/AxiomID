"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";

export default function SovereignSplash() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show the splash once per session to avoid blocking every navigation.
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("axiom_splash_shown") === "true") return;

    sessionStorage.setItem("axiom_splash_shown", "true");
    const initTimer = setTimeout(() => {
      setIsVisible(true);
    }, 0);

    // Simulate a brief "identity check" for premium feel
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

    return () => {
      clearTimeout(initTimer);
      clearTimeout(timer);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
          className="fixed inset-0 z-[9999] bg-[#10131a] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Background ambient glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-electric-blue/10 via-transparent to-transparent" />
          
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative flex flex-col items-center"
          >
            {/* Animated Ring */}
            <div className="relative w-24 h-24 mb-6">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                className="absolute inset-0 border-2 border-dashed border-electric-blue/30 rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="p-4 bg-black/40 border border-glass-hover rounded-full backdrop-blur-xl">
                  <ShieldCheck className="w-10 h-10 text-electric-blue" />
                </div>
              </div>
            </div>

            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-mono text-white/80 tracking-widest"
            >
              AXIOM<span className="text-electric-blue">ID</span>
            </motion.h2>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="mt-4 text-[10px] font-mono text-white/30 uppercase tracking-tighter"
            >
              Initializing Sovereign Identity...
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
