import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

export function QrMark({
  value,
  size = 180,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: { dark: "#1f1b16", light: "#faf7f2" },
    }).then((url) => {
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [value, size]);

  if (!src) {
    return <div className={cn("bg-secondary", className)} style={{ width: size, height: size }} />;
  }

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={`QR code ${value}`}
      className={cn("rounded-md bg-surface", className)}
    />
  );
}
