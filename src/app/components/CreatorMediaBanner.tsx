"use client";

import Image from "next/image";
import type { CreatorMediaItem } from "../types";

type CreatorMediaBannerProps = {
  media: CreatorMediaItem | null;
  className?: string;
};

export default function CreatorMediaBanner({
  media,
  className = "",
}: CreatorMediaBannerProps) {
  if (!media) return null;

  return (
    <div
      className={`overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 ${className}`}
    >
      {media.fileType.startsWith("video/") ? (
        <video
          src={media.fileUrl}
          className="max-h-72 w-full object-cover"
          muted
          playsInline
          loop
          autoPlay
          controls
        />
      ) : (
        <div className="relative h-72 w-full">
          <Image
            src={media.fileUrl}
            alt={media.altText || media.title}
            fill
            unoptimized
            sizes="100vw"
            className="object-cover"
          />
        </div>
      )}
      {(media.title || media.altText) && (
        <div className="border-t border-zinc-800 px-4 py-3">
          {media.title && <p className="font-medium text-white">{media.title}</p>}
          {media.altText && <p className="text-sm text-zinc-400">{media.altText}</p>}
        </div>
      )}
    </div>
  );
}
