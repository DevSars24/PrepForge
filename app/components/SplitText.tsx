"use client";

import { motion } from "framer-motion";

export default function SplitText({
  text,
  className = "",
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const words = text.split(" ");

  // Stagger parameters for staggered animation of children
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.03,
        delayChildren: delay,
      },
    },
  };

  // Slide upward with subtle opacity change
  const childVariants = {
    hidden: {
      opacity: 0,
      y: "35%",
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        damping: 14,
        stiffness: 150,
      },
    },
  };

  return (
    <motion.span
      className={`inline-block ${className}`}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
    >
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block whitespace-nowrap mr-[0.25em]">
          {word.split("").map((char, charIndex) => (
            <motion.span
              key={charIndex}
              variants={childVariants}
              className="inline-block"
            >
              {char}
            </motion.span>
          ))}
        </span>
      ))}
    </motion.span>
  );
}
