"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ImageGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);

  function move(direction: number) {
    setActive((current) => (current + direction + images.length) % images.length);
  }

  return (
    <div className="gallery">
      <div className="gallery-main">
        <Image src={images[active]} alt={`${name}, photo ${active + 1}`} fill priority unoptimized sizes="(max-width: 900px) 100vw, 65vw" />
        <span className="photo-count">{active + 1} / {images.length}</span>
        <button className="gallery-arrow gallery-prev" type="button" onClick={() => move(-1)} aria-label="Previous photo"><ChevronLeft size={20} /></button>
        <button className="gallery-arrow gallery-next" type="button" onClick={() => move(1)} aria-label="Next photo"><ChevronRight size={20} /></button>
      </div>
      <div className="gallery-thumbs" aria-label="Vehicle photos">
        {images.map((image, index) => (
          <button key={image} type="button" className={index === active ? "active" : ""} onClick={() => setActive(index)} aria-label={`Show photo ${index + 1}`}>
            <Image src={image} alt="" fill unoptimized sizes="90px" />
          </button>
        ))}
      </div>
    </div>
  );
}
