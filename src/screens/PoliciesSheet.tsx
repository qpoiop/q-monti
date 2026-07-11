import { useEffect, useState } from "react";
import "./policies-sheet.css";

/**
 * PoliciesSheet — minimal service info modal.
 *
 * The service stores no personal data server-side (no accounts, no
 * database rows keyed to a user). All identifiers — nickname, session
 * id — live in the browser's localStorage. IPs are handled only by
 * Cloudflare for standard abuse protection. We don't need a formal
 * privacy policy, but users appreciate a plain-language note.
 */
export function openPolicies(): void {
  window.dispatchEvent(new CustomEvent("momonti:policies:open"));
}

export function PoliciesSheet() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("momonti:policies:open", onOpen);
    return () => window.removeEventListener("momonti:policies:open", onOpen);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!open) return null;

  return (
    <div className="policies-scrim" onClick={() => setOpen(false)}>
      <div className="policies-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="policies-grabber" />
        <div className="policies-head">
          <span className="policies-title">이용 안내</span>
          <button
            type="button"
            className="policies-close"
            onClick={() => setOpen(false)}
            aria-label="close"
          >
            ✕
          </button>
        </div>
        <div className="policies-body">
          <div className="policies-hero">
            <span className="policies-hero-icon">🔒</span>
            <div>
              <div className="policies-hero-title">서버에 개인정보를 저장하지 않습니다</div>
              <div className="policies-hero-sub">
                회원가입·로그인 없이 이용하는 무료 서비스입니다.
              </div>
            </div>
          </div>
          <ul className="policies-list">
            <li>
              <b>닉네임 · 세션 ID</b> — 이용자 브라우저(localStorage)에만 저장됩니다.
              브라우저 데이터 삭제 시 함께 사라집니다.
            </li>
            <li>
              <b>방 상태</b> — 진행 중인 경기의 좌석·카드·점수만 서버 메모리에
              임시 유지, 방 종료 또는 유휴 10분 후 자동 파기.
            </li>
            <li>
              <b>IP 주소</b> — Cloudflare가 표준 어뷰징 방지(Rate limit) 목적으로
              처리. 별도 저장하지 않습니다.
            </li>
            <li>
              <b>쿠키 · 광고 트래킹</b> — 사용하지 않습니다.
            </li>
          </ul>
          <div className="policies-footnote">
            개인 취미 프로젝트로 무상 제공되며 서비스 중단·변경이 있을 수 있어요.
            문의는 GitHub 이슈 페이지로 부탁드립니다.
          </div>
        </div>
      </div>
    </div>
  );
}
