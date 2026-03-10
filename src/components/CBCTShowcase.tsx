import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import cbctAxial from "@/assets/cbct-axial.png";
import cbctCoronal from "@/assets/cbct-coronal.png";
import cbctOcclusal from "@/assets/cbct-occlusal.png";

const images = [
  { src: cbctAxial, alt: "Axial CBCT scan", label: "Axial View" },
  { src: cbctCoronal, alt: "Coronal CBCT scan", label: "Coronal View" },
  { src: cbctOcclusal, alt: "Occlusal CBCT scan", label: "Occlusal View" },
];

const CBCTShowcase = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const opacity1 = useTransform(scrollYProgress, [0, 0.15, 0.3, 0.4], [0, 1, 1, 0.3]);
  const opacity2 = useTransform(scrollYProgress, [0.2, 0.4, 0.55, 0.65], [0, 1, 1, 0.3]);
  const opacity3 = useTransform(scrollYProgress, [0.45, 0.6, 0.75, 0.9], [0, 1, 1, 0.6]);

  const y1 = useTransform(scrollYProgress, [0, 0.15, 0.3, 0.4], [60, 0, 0, -20]);
  const y2 = useTransform(scrollYProgress, [0.2, 0.4, 0.55, 0.65], [60, 0, 0, -20]);
  const y3 = useTransform(scrollYProgress, [0.45, 0.6, 0.75, 0.9], [60, 0, 0, -20]);

  const scale1 = useTransform(scrollYProgress, [0, 0.15, 0.3, 0.4], [0.9, 1, 1, 0.95]);
  const scale2 = useTransform(scrollYProgress, [0.2, 0.4, 0.55, 0.65], [0.9, 1, 1, 0.95]);
  const scale3 = useTransform(scrollYProgress, [0.45, 0.6, 0.75, 0.9], [0.9, 1, 1, 0.95]);

  const opacities = [opacity1, opacity2, opacity3];
  const ys = [y1, y2, y3];
  const scales = [scale1, scale2, scale3];

  return (
    <section
      ref={containerRef}
      className="relative py-24 bg-[hsl(220,30%,8%)]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Image grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {images.map((image, index) => (
            <motion.div
              key={index}
              style={{
                opacity: opacities[index],
                y: ys[index],
                scale: scales[index],
              }}
              className="relative group"
            >
              <div className="relative overflow-hidden rounded-xl bg-black border border-white/10">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full aspect-square object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* Overlay label */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <span className="text-xs tracking-[0.2em] uppercase text-accent font-medium">
                    {image.label}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CBCTShowcase;
