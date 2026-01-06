import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

export default function AssistantPanel({
  prompt,
  onPromptChange,
  onExplain,
  disabled,
  assistantStatus,
  assistantText,
  isStreaming,
  assistantError,
  parseWithLlm,
  onToggleParseWithLlm,
  followUpPrompt,
  onFollowUpChange,
  onFollowUpSubmit,
  showFollowUp,
  followUpMessages,
}) {
  const outputRef = useRef(null);

  useEffect(() => {
    if (!outputRef.current) return;
    outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [assistantText, followUpMessages, isStreaming]);

  const handlePromptKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onExplain();
    }
  };

  const handleFollowUpKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onFollowUpSubmit();
    }
  };

  return (
    <div className="assistant-body">
      <div className="assistant-controls">
        <label className="control">
          Prompt
          <textarea
            value={prompt}
            onChange={onPromptChange}
            placeholder="help me understand this page"
            onKeyDown={handlePromptKeyDown}
          />
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={parseWithLlm}
            onChange={onToggleParseWithLlm}
          />
          Parse with LLM
          <span
            className="info-bubble"
            data-tooltip="Ideal for scanned pages but more expensive."
            aria-label="Ideal for scanned pages but more expensive."
          >
            i
          </span>
        </label>
        <button className="primary" onClick={onExplain} disabled={disabled}>
          Help me understand this page
        </button>
      </div>
      <div className="assistant-output-wrap" ref={outputRef}>
        <div className="assistant-output">
          <div className={assistantError ? "status status-error" : "status"}>
            Status: {assistantStatus}
          </div>
          {assistantText ? (
            <div className="assistant-markdown">
              <ReactMarkdown>{assistantText}</ReactMarkdown>
            </div>
          ) : isStreaming ? (
            <div className="assistant-empty">Thinking...</div>
          ) : (
            <div className="assistant-empty">Awaiting your prompt.</div>
          )}
        </div>
        {followUpMessages?.length > 0 && (
          <div className="assistant-thread">
            {followUpMessages.map((item) => (
              <div
                key={item.id}
                className={item.type === "question" ? "assistant-bubble bubble-question" : "assistant-bubble bubble-answer"}
              >
                {item.type === "answer" ? (
                  <ReactMarkdown>{item.text}</ReactMarkdown>
                ) : (
                  item.text
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {showFollowUp && (
        <div className="assistant-followup">
          <textarea
            className="followup-input"
            value={followUpPrompt}
            onChange={onFollowUpChange}
            onKeyDown={handleFollowUpKeyDown}
            placeholder="Ask a follow up question"
          />
          <button className="toolbar-button" onClick={onFollowUpSubmit} disabled={isStreaming}>
            Send follow up
          </button>
        </div>
      )}
    </div>
  );
}
