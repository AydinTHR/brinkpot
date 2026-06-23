import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useGameLoop } from "../hooks/useGameLoop";
import { useGameStore } from "../state/gameStore";
import { GameScreen } from "./GameScreen";

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center p-8 text-center text-muted">
      <p className="max-w-md">{children}</p>
    </div>
  );
}

export function App() {
  const appPhase = useGameStore((s) => s.appPhase);
  const init = useGameStore((s) => s.init);
  const started = useRef(false);

  useGameLoop();

  useEffect(() => {
    if (started.current) return; // survive StrictMode's double mount in dev
    started.current = true;
    void init();
  }, [init]);

  if (appPhase === "loading") return <Centered>Dealing you in...</Centered>;
  if (appPhase === "unsupported") {
    return (
      <Centered>
        Brinkpot needs the Web Crypto API for its provably-fair core, which requires a secure
        context (https or localhost).
      </Centered>
    );
  }
  return <GameScreen />;
}
