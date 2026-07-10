import { useEffect, useRef, useState } from "react";
import { closeChat, openChat, sendChat, toggleChat, useStore } from "@web/state/store";
import "./chat-dock.css";

/**
 * Room chat — available from lobby through match result.
 *
 * Two pieces that share the global chat store so they can live in
 * different parts of the tree:
 *   - <ChatToggle/>  — a slim header chip (💬 + unread badge). Drop it in
 *     any screen's HeaderActions.
 *   - <ChatDock/>    — the sliding panel itself. Mount once per screen,
 *     inside PhoneFrame, so it clips to the phone shell. It floats over
 *     the lower portion of the board and never dims it, so players keep
 *     watching the table while they chat.
 */

export function ChatToggle() {
  const unread = useStore((s) => s.chatUnread);
  const open = useStore((s) => s.chatOpen);
  return (
    <button
      type="button"
      className="chat-toggle chip-btn"
      aria-label="채팅"
      aria-pressed={open}
      onClick={() => toggleChat()}
    >
      💬
      {unread > 0 ? (
        <span className="chat-toggle-badge">{unread > 99 ? "99+" : unread}</span>
      ) : null}
    </button>
  );
}

export function ChatDock() {
  const open = useStore((s) => s.chatOpen);
  const chat = useStore((s) => s.chat);
  const connection = useStore((s) => s.connection);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pin to the newest message whenever the log grows or the panel opens.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, chat.length]);

  // Focus the field when the panel opens so a tap-to-open flows straight
  // into typing on desktop. (Mobile keeps the keyboard user-initiated.)
  useEffect(() => {
    if (open && matchMedia("(pointer: fine)").matches) inputRef.current?.focus();
  }, [open]);

  function submit() {
    const text = draft;
    setDraft("");
    sendChat(text);
    inputRef.current?.focus();
  }

  const offline = connection !== "connected";

  return (
    <div className={`chat-dock ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <div className="chat-dock-head">
        <span className="chat-dock-title">💬 채팅</span>
        <button
          type="button"
          className="chat-dock-close"
          aria-label="채팅 닫기"
          onClick={() => closeChat()}
        >
          ✕
        </button>
      </div>
      <div className="chat-dock-log" ref={listRef}>
        {chat.length === 0 ? (
          <div className="chat-dock-empty">아직 메시지가 없어요.<br />먼저 인사를 건네보세요 👋</div>
        ) : (
          chat.map((m) => (
            <div key={m.id} className={`chat-msg ${m.self ? "is-self" : ""}`}>
              {!m.self ? <span className="chat-msg-from">{m.from}</span> : null}
              <span className="chat-msg-bubble">{m.text}</span>
            </div>
          ))
        )}
      </div>
      <form
        className="chat-dock-input"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          maxLength={300}
          placeholder={offline ? "연결 중…" : "메시지 입력"}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => openChat()}
          enterKeyHint="send"
        />
        <button type="submit" className="chat-send-btn" disabled={!draft.trim() || offline}>
          전송
        </button>
      </form>
    </div>
  );
}
