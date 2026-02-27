import React from 'react';
import { motion } from 'motion/react';

interface LoadingOverlayProps {
  isVisible: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/90 backdrop-blur-md"
    >
      <div className="relative w-80 h-80 flex flex-col items-center justify-center">
        {/* Cash Register Area */}
        <div className="absolute bottom-20 right-10 w-32 h-24 bg-zinc-800 rounded-t-2xl border-b-8 border-zinc-900 shadow-xl">
          {/* Screen */}
          <div className="absolute top-3 left-3 right-3 h-8 bg-zinc-950 rounded-lg border border-zinc-700 flex items-center px-2 overflow-hidden">
            <motion.div 
              animate={{ x: [-100, 100] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-1 bg-emerald-500/40 rounded-full blur-sm"
            />
            <div className="absolute right-2 text-[8px] font-mono text-emerald-500 animate-pulse">$0.00</div>
          </div>
          
          {/* Keypad */}
          <div className="absolute bottom-3 left-3 right-3 grid grid-cols-4 gap-1.5">
            {[...Array(8)].map((_, i) => (
              <motion.div 
                key={i}
                animate={{ backgroundColor: ["#3f3f46", "#52525b", "#3f3f46"] }}
                transition={{ duration: 0.3, delay: i * 0.1, repeat: Infinity }}
                className="h-2.5 bg-zinc-700 rounded-sm" 
              />
            ))}
          </div>

          {/* Bill Slot */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-zinc-950 rounded-full" />
        </div>

        {/* Character Animation */}
        <motion.div
          initial={{ x: -150, opacity: 0 }}
          animate={{ 
            x: [-150, -40, -40, -40, -40, -150],
            opacity: [0, 1, 1, 1, 1, 0]
          }}
          transition={{ 
            duration: 6,
            times: [0, 0.2, 0.4, 0.6, 0.8, 1],
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-20 left-10 z-10"
        >
          <div className="relative">
            {/* Walking Animation */}
            <motion.img 
              animate={{ 
                y: [0, -4, 0],
                rotate: [-2, 2, -2]
              }}
              transition={{ duration: 0.4, repeat: Infinity }}
              src="/character.png" 
              alt="Character" 
              className="w-20 h-20 [image-rendering:pixelated]"
              onError={(e) => {
                // Fallback to a pixel-style placeholder if image is missing
                e.currentTarget.src = "https://api.dicebear.com/7.x/pixel-art/svg?seed=Felix&backgroundColor=transparent";
              }}
            />
            
            {/* Typing Hands Effect */}
            <motion.div
              animate={{ 
                opacity: [0, 0, 1, 1, 0, 0],
                scale: [0.8, 0.8, 1.1, 1.1, 0.8, 0.8]
              }}
              transition={{ 
                duration: 6,
                times: [0, 0.2, 0.3, 0.5, 0.6, 1],
                repeat: Infinity
              }}
              className="absolute -right-2 top-10 flex gap-1"
            >
              <div className="w-2 h-2 bg-zinc-300 rounded-full shadow-sm" />
              <div className="w-2 h-2 bg-zinc-300 rounded-full shadow-sm" />
            </motion.div>
          </div>
        </motion.div>

        {/* Bill Emerging Animation */}
        <motion.div
          initial={{ y: 0, opacity: 0, scaleY: 0 }}
          animate={{ 
            y: [0, 0, -100],
            opacity: [0, 0, 1, 0],
            scaleY: [0, 0, 1, 1]
          }}
          transition={{ 
            duration: 6,
            times: [0, 0.5, 0.8, 1],
            repeat: Infinity,
            ease: "easeOut"
          }}
          className="absolute bottom-44 right-16 origin-bottom"
        >
          <div className="w-12 h-20 bg-white border-2 border-zinc-200 shadow-lg p-2 flex flex-col gap-2 rounded-sm">
            <div className="w-full h-1.5 bg-zinc-100 rounded-full" />
            <div className="w-full h-1.5 bg-zinc-100 rounded-full" />
            <div className="w-3/4 h-1.5 bg-zinc-100 rounded-full" />
            <div className="mt-auto w-full h-2 bg-emerald-100 rounded-full" />
          </div>
        </motion.div>

        {/* Text */}
        <div className="mt-56 text-center space-y-2">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Reading Receipt...</h3>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-[0.2em]">Splitting the bill</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
