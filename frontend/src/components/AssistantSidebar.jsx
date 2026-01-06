import React, { useState } from "react";

import AssistantPanel from "./AssistantPanel.jsx";
import ApiKeysPanel from "./ApiKeysPanel.jsx";

export default function AssistantSidebar({
  sidebarWidth,
  onResizeStart,
  prompt,
  onPromptChange,
  onExplain,
  explainDisabled,
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
  provider,
  onProviderChange,
  model,
  onModelChange,
  parsingModel,
  onParsingModelChange,
  apiKey,
  onApiKeyChange,
  onSaveKeys,
  keyStatus,
}) {
  const [tab, setTab] = useState("assistant");

  return (
    <aside className="assistant" style={{ width: `${sidebarWidth}px` }}>
      <div
        className="assistant-resizer"
        onMouseDown={onResizeStart}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize assistant panel"
      />
      <div className="assistant-tabs">
        <button
          className={tab === "assistant" ? "tab active" : "tab"}
          onClick={() => setTab("assistant")}
        >
          Assistant
        </button>
        <button
          className={tab === "keys" ? "tab active" : "tab"}
          onClick={() => setTab("keys")}
        >
          API Keys
        </button>
      </div>

      {tab === "assistant" ? (
        <AssistantPanel
          prompt={prompt}
          onPromptChange={onPromptChange}
          onExplain={onExplain}
          disabled={explainDisabled}
          assistantStatus={assistantStatus}
          assistantText={assistantText}
          isStreaming={isStreaming}
          assistantError={assistantError}
          parseWithLlm={parseWithLlm}
          onToggleParseWithLlm={onToggleParseWithLlm}
          followUpPrompt={followUpPrompt}
          onFollowUpChange={onFollowUpChange}
          onFollowUpSubmit={onFollowUpSubmit}
          showFollowUp={showFollowUp}
          followUpMessages={followUpMessages}
        />
      ) : (
        <ApiKeysPanel
          provider={provider}
          onProviderChange={onProviderChange}
          model={model}
          onModelChange={onModelChange}
          parsingModel={parsingModel}
          onParsingModelChange={onParsingModelChange}
          apiKey={apiKey}
          onApiKeyChange={onApiKeyChange}
          onSave={onSaveKeys}
          keyStatus={keyStatus}
        />
      )}
    </aside>
  );
}
