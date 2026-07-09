import { useState } from "react";
import { PhoneFrame } from "@web/design/PhoneFrame";
import { Button, ScreenHeader } from "@web/design/primitives";
import { joinRoomByCode } from "@web/state/store";
import { navigate } from "@web/nav/router";
import { DesktopStage } from "./DesktopStage";
import { Hint } from "@web/design/layout";
import "./join.css";

const CODE_LEN = 6;
const NUM_KEYS: string[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "abc", "0", "⌫"];
const ALPHA_KEYS: string[] = [
  "A", "B", "C", "D", "E", "F",
  "G", "H", "I", "J", "K", "L",
  "M", "N", "O", "P", "Q", "R",
  "S", "T", "U", "V", "W", "X",
  "Y", "Z", "123", "⌫", "", "",
];

/**
 * Join screen.
 *
 * Mockup layout:
 *   header · hint (top)
 *   code cells (mid-top)
 *   [flex spacer]
 *   keypad (bottom)
 *   submit button (very bottom, below keypad)
 *
 * The keypad is anchored to the bottom of the screen — matches how
 * phone dial pads and OTP inputs feel natively.
 */
export function JoinScreen() {
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"num" | "alpha">("num");
  const canSubmit = code.length === CODE_LEN;
  const keys = mode === "num" ? NUM_KEYS : ALPHA_KEYS;

  function press(k: string) {
    if (k === "⌫") {
      setCode((c) => c.slice(0, -1));
      return;
    }
    if (k === "abc") {
      setMode("alpha");
      return;
    }
    if (k === "123") {
      setMode("num");
      return;
    }
    if (code.length < CODE_LEN) setCode((c) => c + k);
  }

  return (
    <DesktopStage>
      <PhoneFrame>
        <div className="join-page">
          <ScreenHeader title="코드로 입장" onBack={() => navigate({ name: "home" })} />
          <div className="join-top">
            <Hint>방장이 공유한 {CODE_LEN}자리 코드를 입력하세요</Hint>
            <div className="code-cells">
              {Array.from({ length: CODE_LEN }).map((_, i) => (
                <span
                  key={i}
                  className="code-cell"
                  data-focus={code.length === i ? "true" : "false"}
                >
                  {code[i] ?? (code.length === i ? <span className="caret" /> : "")}
                </span>
              ))}
            </div>
          </div>
          <div className="join-bottom">
            <div className={`keypad ${mode === "alpha" ? "keypad-alpha" : ""}`}>
              {keys.map((k, i) =>
                k === "" ? (
                  <span key={`spacer-${i}`} className="keypad-spacer" aria-hidden />
                ) : (
                  <button
                    key={k}
                    type="button"
                    className={
                      k === "⌫" || k === "abc" || k === "123" ? "secondary" : ""
                    }
                    onClick={() => press(k)}
                  >
                    {k}
                  </button>
                )
              )}
            </div>
            <Button
              full
              variant="primary"
              disabled={!canSubmit}
              onClick={() => joinRoomByCode(code)}
            >
              입장하기 ▶
            </Button>
          </div>
        </div>
      </PhoneFrame>
    </DesktopStage>
  );
}
