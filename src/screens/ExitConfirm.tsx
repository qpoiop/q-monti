import { useEffect, useState } from "react";
import { closeExitConfirm, confirmExit, subscribeExitConfirm } from "@web/nav/router";
import { Button } from "@web/design/primitives";

export function ExitConfirm() {
  const [open, setOpen] = useState(false);
  useEffect(() => subscribeExitConfirm(setOpen), []);
  if (!open) return null;
  return (
    <div
      onClick={closeExitConfirm}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6,4,15,.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 320,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--glass-border-3)",
          borderRadius: 20,
          padding: 22,
          maxWidth: 280,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 26 }}>👋</div>
        <div
          style={{
            fontFamily: "var(--font-brand)",
            fontWeight: 800,
            fontSize: 18,
            color: "#fff",
            marginTop: 4,
          }}
        >
          모몬티를 종료할까요?
        </div>
        <div style={{ color: "var(--text-4)", fontSize: 12, marginTop: 6 }}>
          진행 중인 방이 있으면 자동으로 유지돼요
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <Button full variant="ghost" onClick={closeExitConfirm}>
            취소
          </Button>
          <Button full variant="primary" onClick={confirmExit}>
            종료
          </Button>
        </div>
      </div>
    </div>
  );
}
