"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  activeLineIdsInclude,
  lineIdsMatch,
  resolveSourceLineIds,
} from "@/lib/line-id";
import type { SourceLine } from "@/lib/types/session";

interface CitationContextValue {
  activeLineIds: string[];
  activeFindingId: string | null;
  activeInsightId: string | null;
  transcriptOpen: boolean;
  setTranscriptOpen: (open: boolean) => void;
  setActiveFromFinding: (findingId: string, lineIds: string[]) => void;
  setActiveFromLine: (lineId: string) => void;
  clearActive: () => void;
  registerLineRef: (lineId: string, element: HTMLElement | null) => void;
  scrollToLine: (lineId: string) => void;
  openTranscriptForFinding: (findingId: string, lineIds: string[]) => void;
  openTranscriptForInsight: (insightId: string, lineIds: string[]) => void;
  openTranscriptForLines: (lineIds: string[]) => void;
  isLineActive: (lineId: string) => boolean;
  isFindingActive: (findingId: string) => boolean;
  isInsightActive: (insightId: string) => boolean;
}

const CitationContext = createContext<CitationContextValue | null>(null);

function findRegisteredLineId(
  lineRefs: Map<string, HTMLElement>,
  lineId: string,
): string | undefined {
  if (lineRefs.has(lineId)) return lineId;

  for (const registeredId of lineRefs.keys()) {
    if (lineIdsMatch(registeredId, lineId)) {
      return registeredId;
    }
  }

  return undefined;
}

export function CitationProvider({
  children,
  sourceLines = [],
}: {
  children: ReactNode;
  sourceLines?: SourceLine[];
}) {
  const [activeLineIds, setActiveLineIds] = useState<string[]>([]);
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);
  const [activeInsightId, setActiveInsightId] = useState<string | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const lineRefs = useRef<Map<string, HTMLElement>>(new Map());
  const pendingScrollLineId = useRef<string | null>(null);
  // Incremented on every scroll request so the scroll effect below re-runs
  // even when the sheet is already open (e.g. clicking a second citation
  // without closing the transcript first) — `transcriptOpen` alone doesn't
  // change in that case, so it can't be the only effect dependency.
  const [scrollRequestId, setScrollRequestId] = useState(0);

  const registerLineRef = useCallback(
    (lineId: string, element: HTMLElement | null) => {
      if (element) {
        lineRefs.current.set(lineId, element);
      } else {
        lineRefs.current.delete(lineId);
      }
    },
    []
  );

  const normalizeLineIds = useCallback(
    (lineIds: string[]) => resolveSourceLineIds(lineIds, sourceLines),
    [sourceLines],
  );

  const scrollToLine = useCallback((lineId: string) => {
    const registeredId = findRegisteredLineId(lineRefs.current, lineId);
    const element = registeredId
      ? lineRefs.current.get(registeredId)
      : undefined;
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      pendingScrollLineId.current = null;
      return;
    }
    pendingScrollLineId.current = lineId;
  }, []);

  const requestScrollToFirstLine = useCallback((lineIds: string[]) => {
    const firstLine = lineIds[0];
    if (firstLine) {
      pendingScrollLineId.current = firstLine;
      setScrollRequestId((id) => id + 1);
    }
  }, []);

  const openTranscriptForLines = useCallback(
    (lineIds: string[]) => {
      const resolvedLineIds = normalizeLineIds(lineIds);
      setActiveFindingId(null);
      setActiveInsightId(null);
      setActiveLineIds(resolvedLineIds);
      setTranscriptOpen(true);
      requestScrollToFirstLine(resolvedLineIds);
    },
    [normalizeLineIds, requestScrollToFirstLine],
  );

  const openTranscriptForFinding = useCallback(
    (findingId: string, lineIds: string[]) => {
      const resolvedLineIds = normalizeLineIds(lineIds);
      setActiveInsightId(null);
      setActiveFindingId(findingId);
      setActiveLineIds(resolvedLineIds);
      setTranscriptOpen(true);
      requestScrollToFirstLine(resolvedLineIds);
    },
    [normalizeLineIds, requestScrollToFirstLine],
  );

  const openTranscriptForInsight = useCallback(
    (insightId: string, lineIds: string[]) => {
      const resolvedLineIds = normalizeLineIds(lineIds);
      setActiveFindingId(null);
      setActiveInsightId(insightId);
      setActiveLineIds(resolvedLineIds);
      setTranscriptOpen(true);
      requestScrollToFirstLine(resolvedLineIds);
    },
    [normalizeLineIds, requestScrollToFirstLine],
  );

  const setActiveFromFinding = useCallback(
    (findingId: string, lineIds: string[]) => {
      setActiveInsightId(null);
      setActiveFindingId(findingId);
      setActiveLineIds(normalizeLineIds(lineIds));
    },
    [normalizeLineIds],
  );

  const setActiveFromLine = useCallback((lineId: string) => {
    setActiveFindingId(null);
    setActiveInsightId(null);
    setActiveLineIds([lineId]);
  }, []);

  const clearActive = useCallback(() => {
    setActiveFindingId(null);
    setActiveInsightId(null);
    setActiveLineIds([]);
  }, []);

  const isLineActive = useCallback(
    (lineId: string) => activeLineIdsInclude(activeLineIds, lineId),
    [activeLineIds],
  );

  const isFindingActive = useCallback(
    (findingId: string) => activeFindingId === findingId,
    [activeFindingId]
  );

  const isInsightActive = useCallback(
    (insightId: string) => activeInsightId === insightId,
    [activeInsightId],
  );

  const value = useMemo(
    () => ({
      activeLineIds,
      activeFindingId,
      activeInsightId,
      transcriptOpen,
      setTranscriptOpen,
      setActiveFromFinding,
      setActiveFromLine,
      clearActive,
      registerLineRef,
      scrollToLine,
      openTranscriptForFinding,
      openTranscriptForInsight,
      openTranscriptForLines,
      isLineActive,
      isFindingActive,
      isInsightActive,
    }),
    [
      activeLineIds,
      activeFindingId,
      activeInsightId,
      transcriptOpen,
      setActiveFromFinding,
      setActiveFromLine,
      clearActive,
      registerLineRef,
      scrollToLine,
      openTranscriptForFinding,
      openTranscriptForInsight,
      openTranscriptForLines,
      isLineActive,
      isFindingActive,
      isInsightActive,
    ],
  );

  return (
    <CitationContext.Provider value={value}>
      <CitationScrollEffect
        transcriptOpen={transcriptOpen}
        scrollRequestId={scrollRequestId}
        pendingScrollLineId={pendingScrollLineId}
        scrollToLine={scrollToLine}
      />
      {children}
    </CitationContext.Provider>
  );
}

function CitationScrollEffect({
  transcriptOpen,
  scrollRequestId,
  pendingScrollLineId,
  scrollToLine,
}: {
  transcriptOpen: boolean;
  scrollRequestId: number;
  pendingScrollLineId: React.MutableRefObject<string | null>;
  scrollToLine: (lineId: string) => void;
}) {
  useEffect(() => {
    if (!transcriptOpen || !pendingScrollLineId.current) return;

    const lineId = pendingScrollLineId.current;
    const attemptScroll = () => scrollToLine(lineId);
    const frame = requestAnimationFrame(attemptScroll);
    const retryShort = window.setTimeout(attemptScroll, 150);
    const retryLong = window.setTimeout(attemptScroll, 400);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(retryShort);
      window.clearTimeout(retryLong);
    };
    // scrollRequestId intentionally drives re-runs: it changes on every
    // openTranscriptForFinding call, including while the sheet is already
    // open, which transcriptOpen alone would miss.
  }, [transcriptOpen, scrollRequestId, scrollToLine, pendingScrollLineId]);

  return null;
}

export function useCitationLink() {
  const context = useContext(CitationContext);
  if (!context) {
    throw new Error("useCitationLink must be used within CitationProvider");
  }
  return context;
}
