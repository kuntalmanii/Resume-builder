import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// A simple SVG Lamp Icon that accepts the isOn state to change colors
const LampIcon = ({ isOn }) => (
  <svg
    width="80"
    height="80"
    viewBox="0 0 24 24"
    fill={isOn ? "#FCD34D" : "#3F3F46"} // Yellow when ON, gray when OFF
    className="transition-colors duration-500 z-20 relative drop-shadow-xl"
  >
    <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2.5 18H9.5v1c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-1z" />
  </svg>
);

export default function LampToggleLogin() {
  const [isOn, setIsOn] = useState(false);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-black overflow-hidden font-sans">
      
      {/* 1. The Glowing Light Effect (Only visible when ON) */}
      <AnimatePresence>
        {isOn && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1.5 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute top-32 w-72 h-72 bg-yellow-500/20 rounded-full blur-[80px] pointer-events-none z-0"
          />
        )}
      </AnimatePresence>

      {/* 2. The Interactive Lamp Button */}
      <motion.div
        className="cursor-pointer z-20 flex flex-col items-center"
        onClick={() => setIsOn(!isOn)}
        animate={{ rotate: isOn ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <LampIcon isOn={isOn} />
      </motion.div>

      {/* 3. The Login Form (Slides in when lamp turns on) */}
      <div className="h-[400px] mt-8 z-10 w-full max-w-md px-4 relative">
        <AnimatePresence>
          {isOn && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 250, damping: 22 }}
              className="absolute left-0 right-0 p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6 text-center text-white">
                Welcome to the Light
              </h2>
              
              <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                <input 
                  type="email" 
                  placeholder="Email address" 
                  className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-white placeholder-zinc-500 transition-all"
                />
                <input 
                  type="password" 
                  placeholder="Password" 
                  className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-white placeholder-zinc-500 transition-all"
                />
                <button 
                  type="submit"
                  className="mt-4 px-4 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-lg hover:brightness-110 transition-all active:scale-95"
                >
                  Authenticate
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Helper Text */}
      <motion.p 
        animate={{ opacity: isOn ? 0.3 : 0.7 }}
        className="absolute bottom-12 text-zinc-400 text-sm tracking-wide"
      >
        {isOn ? "Click the lamp to turn off" : "Click the lamp to reveal login"}
      </motion.p>
    </div>
  );
}