import { useEffect, useState } from "react";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 1200);
    const remove = setTimeout(onFinish, 1800);
    return () => { clearTimeout(timer); clearTimeout(remove); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}
    >
      <img
        src="/icons/icon-512.png"
        alt="Learning Plus"
        className="w-24 h-24 mb-4 animate-in zoom-in-50 duration-500"
      />
      <h1 className="text-2xl font-bold text-primary animate-in fade-in slide-in-from-bottom-2 duration-700">
        Learning Plus
      </h1>
      <p className="text-sm text-muted-foreground mt-1 animate-in fade-in duration-1000 delay-300">
        IELTS Practice
      </p>
    </div>
  );
};

export default SplashScreen;
