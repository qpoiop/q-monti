import { useMemo, useState } from "react";
import { PlayingCard } from "@web/design/PlayingCard";
import { Button } from "@web/design/primitives";
import { Hint, Row, Stack } from "@web/design/layout";
import { send } from "@web/state/store";
import type { Card as MCard, MomontyView } from "@shared/games/momonty/logic";

/**
 * Phase — TAXATION.
 *
 *   Peon-side  (upload > 0)  → highest cards auto-picked, submit to give up.
 *   Momonty-side (ret > 0)   → user picks which cards to return.
 *   Bystander              → no controls.
 *
 * A revolution shortcut is offered when the seat holds ≥2 jesters (regardless
 * of side).
 */
export function Taxation({ view }: { view: MomontyView }) {
  const [selected, setSelected] = useState<string[]>([]);
  const hand = view.myHand ?? [];
  const upload = view.taxation.myPendingUpload ?? 0;
  const ret = view.taxation.myPendingReturn ?? 0;
  const canRevolt =
    view.config.revolutionEnabled &&
    !view.taxation.revolutionUsed &&
    hand.filter((c) => c.value === null).length >= 2;

  const autoPicked = useMemo(() => {
    if (!upload) return [];
    return [...hand]
      .sort((a, b) => (a.value ?? 99) - (b.value ?? 99))
      .slice(0, upload)
      .map((c) => c.id);
  }, [hand, upload]);

  const effective = upload ? autoPicked : selected;

  return (
    <Stack gap={12}>
      <Row gap={8}>
        <span style={{ fontSize: 18 }}>{upload ? "⛏" : "👑"}</span>
        <Stack gap={4} className="grow">
          <span className="body" style={{ color: "var(--text-1)", fontWeight: 700 }}>
            {upload ? `${upload}장 상납` : ret ? `${ret}장 반환` : "대기 중"}
          </span>
          <Hint>
            {upload
              ? "가장 강한 카드가 자동 선택됩니다"
              : ret
              ? "돌려줄 카드를 골라주세요"
              : "다른 플레이어를 기다리는 중"}
          </Hint>
        </Stack>
      </Row>

      <div className="hand-strip">
        {hand.map((c) => {
          const isSel = effective.includes(c.id);
          const disabled = upload > 0; // peon can't edit auto-pick
          return (
            <PlayingCard
              key={c.id}
              value={c.value ?? undefined}
              label={c.value == null ? "★" : undefined}
              size="sm"
              tone={c.value == null ? "jester" : c.value <= 2 ? "royal" : "white"}
              selected={isSel}
              crown={c.value === 1}
              onClick={
                disabled || ret === 0
                  ? undefined
                  : () =>
                      setSelected((prev) =>
                        prev.includes(c.id)
                          ? prev.filter((x) => x !== c.id)
                          : prev.length < ret
                          ? [...prev, c.id]
                          : prev
                      )
              }
            />
          );
        })}
      </div>

      <Row gap={8}>
        {canRevolt ? (
          <Button
            variant="accent"
            onClick={() => send({ t: "action", action: { t: "declareRevolution" } })}
          >
            ✊ 혁명
          </Button>
        ) : null}
        <Button
          variant="primary"
          full
          disabled={effective.length !== (upload || ret) || (upload === 0 && ret === 0)}
          onClick={() =>
            send({
              t: "action",
              action: upload
                ? { t: "uploadCards", cardIds: effective }
                : { t: "returnCards", cardIds: effective },
            })
          }
        >
          {upload ? "상납하기" : "반환하기"} {effective.length}/{upload || ret}
        </Button>
      </Row>
    </Stack>
  );
}
