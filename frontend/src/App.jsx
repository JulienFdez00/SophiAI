import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PDFDocument } from "pdf-lib";

GlobalWorkerOptions.workerSrc = workerSrc;

const DEFAULT_PROMPT = "help me understand this page";

const loadStored = (key, fallback = "") => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

const saveStored = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
};

export default function App() {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pageIndex, setPageIndex] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.1);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState("assistant");
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [isResizing, setIsResizing] = useState(false);

  const [provider, setProvider] = useState(loadStored("provider", "anthropic"));
  const [model, setModel] = useState(loadStored("model", ""));
  const [parsingModel, setParsingModel] = useState(loadStored("parsingModel", ""));
  const [apiKey, setApiKey] = useState("");

  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [assistantText, setAssistantText] = useState("");
  const [assistantStatus, setAssistantStatus] = useState("Idle");
  const [isStreaming, setIsStreaming] = useState(false);
  const [keyStatus, setKeyStatus] = useState("");
  const [parseWithLlm, setParseWithLlm] = useState(false);
  const [assistantError, setAssistantError] = useState(false);

  useEffect(() => {
    saveStored("provider", provider);
  }, [provider]);

  useEffect(() => {
    saveStored("model", model);
  }, [model]);

  useEffect(() => {
    saveStored("parsingModel", parsingModel);
  }, [parsingModel]);

  const canPaginate = useMemo(() => numPages > 0, [numPages]);

  useEffect(() => {
    if (!pdfDoc) return;

    const renderPage = async () => {
      const page = await pdfDoc.getPage(pageIndex);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
    };

    renderPage();
  }, [pdfDoc, pageIndex, scale]);

  const handleFileOpen = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const doc = await getDocument({ data }).promise;
      const originalBytes = await doc.getData();

      setPdfDoc(doc);
      setPdfBytes(originalBytes);
      setNumPages(doc.numPages || 0);
      setPageIndex(1);
      setAssistantText("");
      setAssistantStatus("Ready");
    } catch (error) {
      console.error("Failed to open PDF", error);
      setPdfDoc(null);
      setPdfBytes(null);
      setNumPages(0);
      setAssistantStatus("Failed to load PDF.");
    }
  };

  const nextPage = () => {
    if (pageIndex < numPages) setPageIndex((prev) => prev + 1);
  };

  const prevPage = () => {
    if (pageIndex > 1) setPageIndex((prev) => prev - 1);
  };

  const buildSinglePagePdf = async (sourceBytes, pageNumber) => {
    const normalizedBytes =
      sourceBytes instanceof Uint8Array ? sourceBytes : new Uint8Array(sourceBytes);
    const sourceDoc = await PDFDocument.load(normalizedBytes, { ignoreEncryption: true });
    const newDoc = await PDFDocument.create();
    const [copiedPage] = await newDoc.copyPages(sourceDoc, [pageNumber]);
    newDoc.addPage(copiedPage);
    return newDoc.save();
  };

  const handleExplain = async (customPrompt) => {
    if (!pdfDoc) {
      setAssistantStatus("Open a PDF first.");
      return;
    }
    if (!pdfBytes) {
      setAssistantStatus("Open a PDF first.");
      return;
    }

    let pagePdfBytes;
    try {
      if (pageIndex < 1 || pageIndex > numPages) {
        setAssistantStatus("Invalid page selection.");
        return;
      }
      pagePdfBytes = await buildSinglePagePdf(pdfBytes, pageIndex - 1);
    } catch (error) {
      console.error("Failed to build page PDF", error);
      setAssistantStatus("Could not prepare the page for analysis.");
      return;
    }

    const formData = new FormData();
    formData.append(
      "pdf_bytes",
      new Blob([pagePdfBytes], { type: "application/pdf" }),
      `page-${pageIndex}.pdf`
    );
    formData.append("prompt", customPrompt || DEFAULT_PROMPT);
    formData.append("parse_with_llm", String(parseWithLlm));

    setAssistantText("");
    setAssistantStatus("Thinking...");
    setAssistantError(false);
    setIsStreaming(true);

    try {
      const response = await fetch("http://localhost:8000/explain-page", {
        method: "POST",
        body: formData,
      });

      if (!response.ok || !response.body) {
        const errorBody = await response.json().catch(() => null);
        const errorText = errorBody?.detail
          ? String(errorBody.detail)
          : await response.text().catch(() => "");
        const detailRaw = errorText || `Request failed (${response.status}).`;
        const detail = detailRaw.replaceAll(
          "Set it via /add-llm-keys.",
          'Set it via "API Keys".'
        );
        setAssistantText("");
        setAssistantStatus(detail);
        setAssistantError(true);
        setIsStreaming(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const lines = event.split("\n");
          const isError = lines.some((line) => line.startsWith("event: error"));
          const dataLines = lines
            .filter((line) => line.startsWith("data: "))
            .map((line) => line.slice(6));
          if (!dataLines.length) continue;
          const data = dataLines.join("\n");
          if (data === "[DONE]") continue;
          if (isError) {
            const detail = data.replaceAll(
              "Set it via /add-llm-keys.",
              'Set it via "API Keys".'
            );
            setAssistantStatus(detail);
            setAssistantError(true);
            setIsStreaming(false);
            return;
          }
          setAssistantText((prev) => prev + data);
          fullResponse += data;
        }
      }

      console.log("Assistant full response:", fullResponse);
      setAssistantStatus("Done");
    } catch (error) {
      console.error("Assistant request failed", error);
      setAssistantStatus("Connection error.");
      setAssistantError(true);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSaveKeys = async () => {
    setKeyStatus("");
    if (!apiKey) {
      setKeyStatus("API key is required.");
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/add-llm-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          api_key: apiKey,
          expert_model: model || null,
          parsing_model: parsingModel || null,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        setKeyStatus(errorBody.detail || "Failed to save credentials.");
        return;
      }

      setKeyStatus("Credentials saved to keychain.");
    } catch (error) {
      console.error("Failed to save credentials", error);
      setKeyStatus("Connection error.");
    }
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMove = (event) => {
      const nextWidth = Math.min(Math.max(window.innerWidth - event.clientX, 260), 520);
      setSidebarWidth(nextWidth);
    };

    const handleUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isResizing]);

  return (
    <div className="app-shell">
      <header className="toolbar">
        <div className="toolbar-left">
          <button className="toolbar-button" onClick={() => fileInputRef.current?.click()}>
            Open PDF
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileOpen}
            className="hidden-input"
          />
          <div className="divider" />
          <button className="toolbar-button" onClick={prevPage} disabled={!canPaginate}>
            ◀
          </button>
          <button className="toolbar-button" onClick={nextPage} disabled={!canPaginate}>
            ▶
          </button>
          <span className="page-indicator">
            Page {pageIndex} / {numPages || "-"}
          </span>
          <div className="divider" />
          <label className="zoom">
            Zoom
            <input
              type="range"
              min="0.6"
              max="1.8"
              step="0.1"
              value={scale}
              onChange={(event) => setScale(Number(event.target.value))}
            />
          </label>
        </div>
        <div className="toolbar-right">
          <button
            className="toolbar-button"
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            {sidebarOpen ? "Hide Assistant" : "Show Assistant"}
          </button>
        </div>
      </header>

      <main className="content-area">
        <section className="viewer">
          <div className="canvas-shell">
            <canvas ref={canvasRef} className="pdf-canvas" />
            {!pdfDoc && (
              <div className="empty-state">
                <h2>Open a PDF to get started</h2>
                <p>Drop a spec, contract, or design doc and ask the assistant to explain it.</p>
              </div>
            )}
          </div>
        </section>

        {sidebarOpen && (
          <aside className="assistant" style={{ width: `${sidebarWidth}px` }}>
            <div
              className="assistant-resizer"
              onMouseDown={() => setIsResizing(true)}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize assistant panel"
            />
            <div className="assistant-tabs">
              <button
                className={sidebarTab === "assistant" ? "tab active" : "tab"}
                onClick={() => setSidebarTab("assistant")}
              >
                Assistant
              </button>
              <button
                className={sidebarTab === "keys" ? "tab active" : "tab"}
                onClick={() => setSidebarTab("keys")}
              >
                API Keys
              </button>
            </div>

            {sidebarTab === "assistant" ? (
              <div className="assistant-body">
                <div className="assistant-controls">
                  <label className="control">
                    Prompt
                    <textarea
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      placeholder={DEFAULT_PROMPT}
                    />
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={parseWithLlm}
                      onChange={(event) => setParseWithLlm(event.target.checked)}
                    />
                    Parse with LLM
                    <span
                      className="info-bubble"
                      data-tooltip="Can perform better with scanned pages but more expensive."
                      aria-label="Can perform better with scanned pages but more expensive."
                    >
                      i
                    </span>
                  </label>
                  <button
                    className="primary"
                    onClick={() => handleExplain(prompt)}
                    disabled={!pdfDoc || isStreaming}
                  >
                    Help me understand this page
                  </button>
                </div>
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
              </div>
            ) : (
              <div className="assistant-body">
                <label className="control">
                  Provider
                  <select value={provider} onChange={(event) => setProvider(event.target.value)}>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="gemini">Gemini</option>
                  </select>
                </label>
                <label className="control">
                  Model
                  <input
                    type="text"
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                    placeholder="claude-sonnet-4-5"
                  />
                </label>
                <label className="control">
                  Parsing Model <span className="optional">(optional)</span>
                  <input
                    type="text"
                    value={parsingModel}
                    onChange={(event) => setParsingModel(event.target.value)}
                    placeholder="claude-haiku-4-5"
                  />
                </label>
                <label className="control">
                  API Key
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="sk-..."
                  />
                </label>
                <button className="primary" onClick={handleSaveKeys}>
                  Save Credentials
                </button>
                {keyStatus && <div className="hint">{keyStatus}</div>}
                <div className="hint">
                  Keys are stored securely in your local keychain when you save them.
                </div>
              </div>
            )}
          </aside>
        )}
      </main>
    </div>
  );
}
