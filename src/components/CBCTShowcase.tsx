import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import cbctAxial from "@/assets/cbct-axial.png";
import cbctCoronal from "@/assets/cbct-coronal.png";
import cbctOcclusal from "@/assets/cbct-occlusal.png";

const images = [
  { src: cbctAxial, alt: "CBCT scan 1" },
  { src: cbctCoronal, alt: "CBCT scan 2" },
  { src: cbctOcclusal, alt: "CBCT scan 3" },
];

const CBCTBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const y2 = useTransform(scrollYProgress, [0, 1], [60, -180]);
  const y3 = useTransform(scrollYProgress, [0, 1], [120, -240]);

  const ys = [y1, y2, y3];

  return (
    <div
      ref={containerRef}
      className="fixed top-0 right-0 w-[280px] lg:w-[360px] h-screen pointer-events-none z-0 hidden md:flex flex-col gap-6 pt-24 pr-6"
    >
      {images.map((image, index) => (
        <motion.div
          key={index}
          style={{ y: ys[index] }}
          className="relative"
        >
          <img
            src={image.src}
            alt={image.alt}
            className="w-full rounded-xl object-cover opacity-[0.08]"
          />
        </motion.div>
      ))}
    </div>
  );
};

export default CBCTBackground;
