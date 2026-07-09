import { useEffect } from "react";
import { getTransport, useStore } from "./state/store";
import { HomeScreen } from "./screens/Home";
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
    getTransport();
    initRouter();
    registerSW();
  }, []);
  const route = useStore((s) => s.route);

  const body = (() => {
    switch (route.name) {
      case "home":
        return <HomeScreen />;
      case "create":
        return <CreateScreen />;
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
    <div data-accent="momonty" style={{ minHeight: "100%" }}>
      <div key={route.name} className="route-swap">
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
