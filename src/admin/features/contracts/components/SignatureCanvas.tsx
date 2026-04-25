import { useEffect, useRef, useState } from "react";
import { Button } from "@shared/components/ui/button";
import { Eraser } from "lucide-react";

interface Props {
  width?: number;
  height?: number;
  onChange?: (dataUrl: string | null) => void;
  initialUrl?: string | null;
}

/** Simple HTML5-canvas pad that produces a transparent-background PNG data URL. */
export default function SignatureCanvas({ width = 480, height = 180, onChange, initialUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111111";

    if (initialUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        setIsEmpty(false);
      };
      img.src = initialUrl;
    }
  }, [width, height, initialUrl]);

  const getCoords = (e: PointerEvent | React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * canvas.width, y: ((e.clientY - rect.top) / rect.height) * canvas.height };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drawing.current = true;
    lastPt.current = getCoords(e);
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const pt = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(lastPt.current!.x, lastPt.current!.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPt.current = pt;
    setIsEmpty(false);
  };

  const onPointerUp = () => {
    drawing.current = false;
    lastPt.current = null;
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    onChange?.(dataUrl);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange?.(null);
  };

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-border bg-white">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none cursor-crosshair"
          style={{ height }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{isEmpty ? "Vẽ chữ ký bằng chuột hoặc cảm ứng" : "Đã có chữ ký"}</span>
        <Button type="button" variant="ghost" size="sm" onClick={clear} className="h-7 px-2">
          <Eraser className="h-3.5 w-3.5 mr-1" />
          Xóa
        </Button>
      </div>
    </div>
  );
}
