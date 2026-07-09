import { useEffect } from "react";
import { getTransport, useStore } from "./state/store";
import { HomeScreen } from "./screens/Home";
import { LibraryScreen } from "./screens/Library";
import { CreateScreen } from "./screens/Create";
import { JoinScreen } from "./screens/Join";
import { LobbyScreen } from "./screens/Lobby";
import { PlayScreen } from "./screens/Play";
import { ResultScreen } from "./screens/Result";
import { ConnectionOverlay } from "./screens/ConnectionOverlay";
import { Toast } from "./screens/Toast";
import { InstallLayer } from "./screens/InstallLayer";
import { ExitConfirm } from "./screens/ExitConfirm";
import { RulesSheet } from "./screens/RulesSheet";
import { EventFx } from "./design/effects/EventFx";
import { initRouter } from "./nav/router";
import { registerSW } from "./pwa/register";

export function App() {
  useEffect(() => {
    getTransport(); // subscribe to status/messages — no WS opened yet.
    initRouter();
    registerSW();
  }, []);
  const route = useStore((s) => s.route);
  const gameId = useStore((s) => s.room?.gameId ?? "momonty");

  const body = (() => {
    switch (route.name) {
      case "home":
        return <HomeScreen />;
      case "library":
        return <LibraryScreen />;
      case "create":
        return <CreateScreen gameId={route.gameId} />;
      case "join":
        return <JoinScreen />;
      case "lobby":
        return <LobbyScreen />;
      case "play":
        return <PlayScreen />;
      case "result":
        return <ResultScreen />;
    }
  })();

  return (
    <div data-accent={accentForGame(gameId)} style={{ minHeight: "100%" }}>
      <div
        key={route.name + ("gameId" in route ? route.gameId : "")}
        style={{
          animation: "m-fade-in var(--dur-med) var(--easing) both",
        }}
      >
        {body}
      </div>
      <EventFx />
      <InstallLayer />
      <ConnectionOverlay />
      <ExitConfirm />
      <RulesSheet />
      <Toast />
    </div>
  );
}

function accentForGame(id: string): string {
  return id === "momonty"
    ? "momonty"
    : id === "querymo"
    ? "querymo"
    : id === "binchi"
    ? "binchi"
    : id === "indient"
    ? "indient"
    : id === "moorumon"
    ? "moorumon"
    : "momonty";
}
