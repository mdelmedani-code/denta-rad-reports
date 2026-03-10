import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import cbctAxial from "@/assets/cbct-axial.png";
import cbctCoronal from "@/assets/cbct-coronal.png";
import cbctOcclusal from "@/assets/cbct-occlusal.png";
import cbctPano from "@/assets/cbct-pano.jpeg";
import cbctMultiview from "@/assets/cbct-multiview.jpeg";

const images = [
  { src: cbctAxial, alt: "Axial CBCT scan" },
  { src: cbctCoronal, alt: "Coronal CBCT scan" },
  { src: cbctOcclusal, alt: "Occlusal CBCT scan" },
  { src: cbctPano, alt: "Panoramic dental X-ray" },
  { src: cbctMultiview, alt: "CBCT multi-view scan" },
];

const CBCTShowcase = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const count = images.length;
  const spread = 0.85;
  const segment = spread / count;
  const overlap = segment * 0.4;

  const opacities = images.map((_, i) => {
    const start = i * segment;
    const fadeIn = start + segment * 0.35;
    const hold = start + segment - overlap * 0.3;
    const fadeOut = start + segment + overlap * 0.5;
    return useTransform(scrollYProgress, [start, fadeIn, hold, Math.min(fadeOut, 1)], [0, 1, 1, i === count - 1 ? 0.8 : 0.4]);
  });

  const ys = images.map((_, i) => {
    const start = i * segment;
    const fadeIn = start + segment * 0.35;
    const hold = start + segment - overlap * 0.3;
    const fadeOut = start + segment + overlap * 0.5;
    return useTransform(scrollYProgress, [start, fadeIn, hold, Math.min(fadeOut, 1)], [40, 0, 0, -10]);
  });

  const scales = images.map((_, i) => {
    const start = i * segment;
    const fadeIn = start + segment * 0.35;
    const hold = start + segment - overlap * 0.3;
    const fadeOut = start + segment + overlap * 0.5;
    return useTransform(scrollYProgress, [start, fadeIn, hold, Math.min(fadeOut, 1)], [0.95, 1, 1, 0.98]);
  });

  return (
    <section
      ref={containerRef}
      className="relative py-24 bg-[hsl(220,30%,8%)]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* First row: 3 images */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-6 lg:mb-8">
          {images.slice(0, 3).map((image, index) => (
            <motion.div
              key={index}
              style={{ opacity: opacities[index], y: ys[index], scale: scales[index] }}
              className="relative group"
            >
              <div className="relative overflow-hidden rounded-xl bg-black border border-white/10">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full aspect-square object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Second row: 2 images */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {images.slice(3).map((image, index) => {
            const i = index + 3;
            return (
              <motion.div
                key={i}
                style={{ opacity: opacities[i], y: ys[i], scale: scales[i] }}
                className="relative group"
              >
                <div className="relative overflow-hidden rounded-xl bg-black border border-white/10">
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full aspect-[16/9] object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CBCTShowcase;
