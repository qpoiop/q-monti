import { useState } from "react";
import { PhoneFrame } from "@web/design/PhoneFrame";
import { BottomBar, Button, ScreenHeader } from "@web/design/primitives";
import { send } from "@web/state/store";
import { navigate } from "@web/nav/router";
import { DesktopStage } from "./DesktopStage";

export function JoinScreen() {
  const [code, setCode] = useState("");

  return (
    <DesktopStage>
      <PhoneFrame>
        <ScreenHeader title="코드로 입장" onBack={() => navigate({ name: "home" })} />
        <div style={{ padding: "8px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ color: "var(--text-5)", fontSize: 11.5 }}>
            방장이 공유한 6자리 코드를 입력하세요
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: 38,
                  height: 52,
                  borderRadius: 11,
                  background:
                    code.length === i
                      ? "var(--accent-soft)"
                      : "var(--glass-3)",
                  border:
                    code.length === i
                      ? "2px solid var(--accent-1)"
                      : "1px solid var(--glass-border-3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-brand)",
                  fontWeight: 800,
                  fontSize: 24,
                  color: "#fff",
                  boxShadow:
                    code.length === i ? "0 0 12px var(--accent-glow)" : undefined,
                }}
              >
                {code[i] ?? ""}
                {code.length === i ? (
                  <span
                    style={{
                      width: 1,
                      height: 22,
                      background: "var(--accent-1)",
                      marginLeft: 2,
                      animation: "m-blink 1s infinite",
                    }}
                  />
                ) : null}
              </span>
            ))}
          </div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "ABC", "0", "⌫"].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (k === "⌫") setCode(code.slice(0, -1));
                  else if (k === "ABC") {
                    const c = prompt("영문 입력");
                    if (c) setCode((code + c.toUpperCase()).slice(0, 6));
                  } else if (code.length < 6) setCode(code + k);
                }}
                style={{
                  padding: "14px 0",
                  borderRadius: 12,
                  background: "var(--glass-3)",
                  color: "var(--text-2)",
                  fontFamily: "var(--font-brand)",
                  fontWeight: 700,
                  fontSize: k === "⌫" || k === "ABC" ? 14 : 18,
                }}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <BottomBar>
          <Button
            full
            variant="primary"
            disabled={code.length !== 6}
            onClick={() => send({ t: "joinRoom", code })}
          >
            입장하기 ▶
          </Button>
        </BottomBar>
      </PhoneFrame>
    </DesktopStage>
  );
}
