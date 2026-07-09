import { useEffect, useState } from "react";
import { closeExitConfirm, confirmExit, subscribeExitConfirm } from "@web/nav/router";
import { Button } from "@web/design/primitives";
import { DialogCard, OverlayScrim, Row } from "@web/design/layout";

export function ExitConfirm() {
  const [open, setOpen] = useState(false);
  useEffect(() => subscribeExitConfirm(setOpen), []);
  if (!open) return null;
  return (
    <OverlayScrim align="center" onClose={closeExitConfirm}>
      <DialogCard>
        <div style={{ fontSize: 26 }}>👋</div>
        <div className="dialog-title">모몬티를 종료할까요?</div>
        <div className="dialog-sub">진행 중인 방이 있으면 자동으로 유지돼요</div>
        <Row gap={8} className="dialog-actions">
          <Button full variant="ghost" onClick={closeExitConfirm}>
            취소
          </Button>
          <Button full variant="primary" onClick={confirmExit}>
            종료
          </Button>
        </Row>
      </DialogCard>
    </OverlayScrim>
  );
}
