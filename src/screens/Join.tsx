import { useState } from "react";
import { PhoneFrame } from "@web/design/PhoneFrame";
import { Button, ScreenHeader } from "@web/design/primitives";
import { joinRoomByCode } from "@web/state/store";
import { navigate } from "@web/nav/router";
import { DesktopStage } from "./DesktopStage";
import { FooterBar, Hint, ScreenBody } from "@web/design/layout";

const KEYS: string[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "ABC", "0", "⌫"];
const CODE_LEN = 6;

/**
 * Code-entry screen. Layout mirrors the design mockup exactly:
 *   header · hint · 6 code cells · keypad grid · footer CTA.
 * Cells render `data-focus="true"` on the active slot so the CSS
 * handles the accent border + blinking cursor — no per-cell inline
 * styling.
 */
export function JoinScreen() {
  const [code, setCode] = useState("");
  const canSubmit = code.length === CODE_LEN;

  function press(k: string) {
    if (k === "⌫") setCode((c) => c.slice(0, -1));
    else if (k === "ABC") {
      const c = prompt("영문 입력") ?? "";
      if (c) setCode((prev) => (prev + c.toUpperCase()).slice(0, CODE_LEN));
    } else if (code.length < CODE_LEN) setCode((c) => c + k);
  }

  return (
    <DesktopStage>
      <PhoneFrame>
        <ScreenHeader title="코드로 입장" onBack={() => navigate({ name: "home" })} />
        <ScreenBody>
          <Hint>방장이 공유한 {CODE_LEN}자리 코드를 입력하세요</Hint>
          <div className="code-cells">
            {Array.from({ length: CODE_LEN }).map((_, i) => (
              <span key={i} className="code-cell" data-focus={code.length === i ? "true" : "false"}>
                {code[i] ?? (code.length === i ? <span className="caret" /> : "")}
              </span>
            ))}
          </div>
          <div className="keypad" style={{ marginTop: 8 }}>
            {KEYS.map((k) => (
              <button
                key={k}
                type="button"
                className={k === "⌫" || k === "ABC" ? "secondary" : ""}
                onClick={() => press(k)}
              >
                {k}
              </button>
            ))}
          </div>
        </ScreenBody>
        <FooterBar>
          <Button
            full
            variant="primary"
            disabled={!canSubmit}
            onClick={() => joinRoomByCode(code)}
          >
            입장하기 ▶
          </Button>
        </FooterBar>
      </PhoneFrame>
    </DesktopStage>
  );
}
