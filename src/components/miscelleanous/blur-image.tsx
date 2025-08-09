"use client";

import Image from "next/image";
import { useState } from "react";

import type { ComponentProps } from "react";
import { cn } from "../../../lib/utils";

export default function BlurImage(props: ComponentProps<typeof Image>) {
  const [isLoading, setLoading] = useState(true);

  return (
    <Image
      {...props}
      alt={props.alt}
      className={cn(
        "duration-500 ease-in-out",
        isLoading ? "blur-md" : "blur-0",
        props.className
      )}
      onLoad={() => {
        setTimeout(() => {
          setLoading(false);
        }, 300);
      }}
    />
  );
}
