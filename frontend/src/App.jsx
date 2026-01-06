import React, { useEffect, useMemo, useRef, useState } from "react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PDFDocument } from "pdf-lib";

import AssistantSidebar from "./components/AssistantSidebar.jsx";
import PdfViewer from "./components/PdfViewer.jsx";
import Toolbar from "./components/Toolbar.jsx";

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

  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pageIndex, setPageIndex] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.1);

  const [sidebarOpen, setSidebarOpen] = useState(true);
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
  const [followUpPrompt, setFollowUpPrompt] = useState("");
  const [hasResponse, setHasResponse] = useState(false);
  const [followUpMessages, setFollowUpMessages] = useState([]);

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

  const handleExplain = async (customPrompt, isFollowUp = false) => {
    if (!customPrompt.trim()) return;
    if (!pdfDoc || !pdfBytes) {
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
    formData.append("follow_up", String(isFollowUp));

    if (!isFollowUp) {
      setAssistantText("");
      setHasResponse(false);
      setFollowUpMessages([]);
    }
    setAssistantStatus("Thinking...");
    setAssistantError(false);
    setIsStreaming(true);

    if (isFollowUp) {
      setFollowUpMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-q`, type: "question", text: customPrompt },
      ]);
    }

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
          if (isFollowUp) {
            setFollowUpMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last && last.type === "answer") {
                last.text += data;
              } else {
                next.push({ id: `${Date.now()}-a`, type: "answer", text: data });
              }
              return next;
            });
          } else {
            setAssistantText((prev) => prev + data);
          }
          fullResponse += data;
        }
      }

      console.log("Assistant full response:", fullResponse);
      setAssistantStatus("Done");
      setHasResponse(true);
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
      <Toolbar
        onFileOpen={handleFileOpen}
        onPrev={prevPage}
        onNext={nextPage}
        canPaginate={canPaginate}
        pageIndex={pageIndex}
        numPages={numPages}
        scale={scale}
        onScaleChange={(event) => setScale(Number(event.target.value))}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      <main className="content-area">
        <PdfViewer canvasRef={canvasRef} hasPdf={Boolean(pdfDoc)} />

        {sidebarOpen && (
          <AssistantSidebar
            sidebarWidth={sidebarWidth}
            onResizeStart={() => setIsResizing(true)}
            prompt={prompt}
            onPromptChange={(event) => setPrompt(event.target.value)}
            onExplain={() => handleExplain(prompt)}
            explainDisabled={!pdfDoc || isStreaming}
            assistantStatus={assistantStatus}
            assistantText={assistantText}
            isStreaming={isStreaming}
            assistantError={assistantError}
            parseWithLlm={parseWithLlm}
            onToggleParseWithLlm={(event) => setParseWithLlm(event.target.checked)}
            followUpPrompt={followUpPrompt}
            onFollowUpChange={(event) => setFollowUpPrompt(event.target.value)}
            onFollowUpSubmit={() => {
              if (!followUpPrompt.trim()) return;
              const question = followUpPrompt.trim();
              setFollowUpPrompt("");
              handleExplain(question, true);
            }}
            showFollowUp={hasResponse}
            followUpMessages={followUpMessages}
            provider={provider}
            onProviderChange={(event) => setProvider(event.target.value)}
            model={model}
            onModelChange={(event) => setModel(event.target.value)}
            parsingModel={parsingModel}
            onParsingModelChange={(event) => setParsingModel(event.target.value)}
            apiKey={apiKey}
            onApiKeyChange={(event) => setApiKey(event.target.value)}
            onSaveKeys={handleSaveKeys}
            keyStatus={keyStatus}
          />
        )}
      </main>
    </div>
  );
}
