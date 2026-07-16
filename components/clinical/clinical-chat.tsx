"use client";

import { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isReasoningUIPart,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { RiSendPlane2Line } from "@remixicon/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ClinicalAssistantUIMessage } from "@/lib/agents/clinical-assistant";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Marker, MarkerContent } from "@/components/ui/marker";
import {
  Message,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PatientCard } from "@/lib/types/session";
import { cn } from "@/lib/utils";

const TOOL_STEP_LABELS: Record<string, string> = {
  listPatients: "List patients",
  searchSessions: "Search sessions",
  getSessionSummary: "Load session summary",
  getPatientMemory: "Load patient memory",
  listDocuments: "List documents",
  readDocument: "Read document",
  askClarifyingQuestion: "Ask clarifying question",
};

function toolLabel(type: string) {
  const name = type.replace(/^tool-/, "");
  return TOOL_STEP_LABELS[name] ?? name;
}

function AssistantMarkdown({ children }: { children: string }) {
  return (
    <div className="typeset typeset-chat">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

function ReasoningBlock({
  id,
  text,
  state,
}: {
  id: string;
  text: string;
  state?: "streaming" | "done";
}) {
  const streaming = state === "streaming";
  const hasText = Boolean(text.trim());
  const [value, setValue] = useState<string[]>(
    streaming || hasText ? [id] : [],
  );

  useEffect(() => {
    if (streaming || hasText) setValue([id]);
  }, [streaming, hasText, id]);

  if (!hasText && !streaming) return null;

  return (
    <Accordion
      value={value}
      onValueChange={setValue}
      keepMounted
      className="max-w-[80%] border-border/80"
    >
      <AccordionItem value={id}>
        <AccordionTrigger
          className={cn(
            "px-3 py-2 text-muted-foreground hover:no-underline",
            streaming && "shimmer",
          )}
        >
          {streaming && !hasText
            ? "Thinking…"
            : streaming
              ? "Reasoning…"
              : "Reasoning"}
        </AccordionTrigger>
        <AccordionContent className="whitespace-pre-wrap text-muted-foreground">
          {hasText ? text : "…"}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function ToolStepMarker({
  label,
  status,
  detail,
}: {
  label: string;
  status: "running" | "done" | "error" | "denied";
  detail?: string;
}) {
  const prefix =
    status === "running"
      ? "Running"
      : status === "done"
        ? "Used"
        : status === "denied"
          ? "Denied"
          : "Failed";

  return (
    <Marker
      variant={status === "error" || status === "denied" ? "border" : "default"}
    >
      <MarkerContent>
        <span className="text-muted-foreground">{prefix}</span> {label}
        {detail ? (
          <span className="text-muted-foreground"> — {detail}</span>
        ) : null}
      </MarkerContent>
    </Marker>
  );
}

function ApprovalCard({
  toolName,
  detail,
  onApprove,
  onDeny,
}: {
  toolName: string;
  detail: string;
  onApprove: () => void;
  onDeny: () => void;
}) {
  return (
    <div className="max-w-md rounded-2xl border border-border bg-muted/40 p-3 text-sm">
      <p className="font-medium text-foreground">Approval required</p>
      <p className="mt-1 text-muted-foreground">
        Allow <span className="font-medium text-foreground">{toolName}</span>
        {detail ? `: ${detail}` : ""}?
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={onApprove}>
          Approve
        </Button>
        <Button size="sm" variant="outline" onClick={onDeny}>
          Deny
        </Button>
      </div>
    </div>
  );
}

function ChatMessageParts({
  message,
  addToolApprovalResponse,
  sendMessage,
}: {
  message: ClinicalAssistantUIMessage;
  addToolApprovalResponse: (args: {
    id: string;
    approved: boolean;
  }) => void | PromiseLike<void>;
  sendMessage: (args: { text: string }) => void | PromiseLike<void>;
}) {
  const toolParts = message.parts.filter(isToolUIPart);
  const hasToolSteps = toolParts.length > 0;
  const toolsRunning = toolParts.some(
    (part) =>
      part.state === "input-streaming" ||
      part.state === "input-available" ||
      part.state === "approval-responded",
  );

  return (
    <>
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          if (!part.text.trim()) return null;
          return (
            <Bubble
              key={`${message.id}-text-${index}`}
              variant={message.role === "user" ? "default" : "secondary"}
              align={message.role === "user" ? "end" : "start"}
            >
              <BubbleContent>
                {message.role === "assistant" ? (
                  <AssistantMarkdown>{part.text}</AssistantMarkdown>
                ) : (
                  part.text
                )}
              </BubbleContent>
            </Bubble>
          );
        }

        if (isReasoningUIPart(part)) {
          return (
            <ReasoningBlock
              key={`${message.id}-reasoning-${index}`}
              id={`${message.id}-reasoning-${index}`}
              text={part.text}
              state={part.state}
            />
          );
        }

        if (!isToolUIPart(part)) return null;

        const isFirstTool =
          message.parts.findIndex((candidate) => isToolUIPart(candidate)) ===
          index;

        const name = toolLabel(part.type);
        const key = `${message.id}-${part.toolCallId}-${part.state}`;

        const stepNode = (() => {
          if (part.state === "approval-requested" && !part.approval.isAutomatic) {
            const input = part.input as Record<string, unknown> | undefined;
            const detail = String(
              input?.documentId ??
                input?.sessionId ??
                input?.patientId ??
                "",
            );

            return (
              <ApprovalCard
                toolName={name}
                detail={detail}
                onApprove={() =>
                  void addToolApprovalResponse({
                    id: part.approval.id,
                    approved: true,
                  })
                }
                onDeny={() =>
                  void addToolApprovalResponse({
                    id: part.approval.id,
                    approved: false,
                  })
                }
              />
            );
          }

          if (part.state === "output-denied") {
            return (
              <ToolStepMarker
                label={name}
                status="denied"
                detail={part.approval.reason}
              />
            );
          }

          if (
            part.type === "tool-askClarifyingQuestion" &&
            part.state === "output-available"
          ) {
            const output = part.output as {
              question: string;
              options: string[];
            };
            return (
              <div className="flex max-w-lg flex-col gap-2">
                <ToolStepMarker label={name} status="done" />
                <Bubble variant="outline" align="start">
                  <BubbleContent>
                    <AssistantMarkdown>{output.question}</AssistantMarkdown>
                  </BubbleContent>
                </Bubble>
                {output.options.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {output.options.map((option) => (
                      <Button
                        key={option}
                        size="sm"
                        variant="outline"
                        onClick={() => void sendMessage({ text: option })}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          if (
            part.state === "input-streaming" ||
            part.state === "input-available" ||
            part.state === "approval-responded"
          ) {
            return <ToolStepMarker label={name} status="running" />;
          }

          if (part.state === "output-available") {
            return <ToolStepMarker label={name} status="done" />;
          }

          if (part.state === "output-error") {
            return (
              <ToolStepMarker
                label={name}
                status="error"
                detail={part.errorText}
              />
            );
          }

          return null;
        })();

        if (!stepNode) return null;

        return (
          <div key={key} className="flex w-full flex-col gap-1.5">
            {isFirstTool && hasToolSteps ? (
              <p
                className={cn(
                  "text-xs font-medium tracking-wide text-muted-foreground uppercase",
                  toolsRunning && "shimmer",
                )}
              >
                {toolsRunning ? "Steps…" : "Steps"}
              </p>
            ) : null}
            {stepNode}
          </div>
        );
      })}
    </>
  );
}

interface ClinicalChatProps {
  /** Page uses a taller header; drawer is compact for the Sheet. */
  variant?: "page" | "drawer";
  className?: string;
}

export function ClinicalChat({
  variant = "page",
  className,
}: ClinicalChatProps) {
  const [input, setInput] = useState("");
  const [patients, setPatients] = useState<PatientCard[]>([]);
  const [pinnedPatientId, setPinnedPatientId] = useState<string>("");

  useEffect(() => {
    void fetch("/api/patients")
      .then((res) => (res.ok ? res.json() : { patients: [] }))
      .then((data: { patients: PatientCard[] }) => setPatients(data.patients))
      .catch(() => setPatients([]));
  }, []);

  const { messages, sendMessage, status, addToolApprovalResponse, error } =
    useChat<ClinicalAssistantUIMessage>({
      transport: new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          pinnedPatientId: pinnedPatientId || undefined,
        }),
      }),
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    });

  const busy = status === "submitted" || status === "streaming";
  const isDrawer = variant === "drawer";

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-4",
        isDrawer ? "h-full p-4 pt-2" : "h-[calc(100svh-3rem)]",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-end justify-between gap-3",
          isDrawer && "gap-2",
        )}
      >
        <div className="min-w-0 space-y-1">
          {isDrawer ? (
            <p className="text-sm text-muted-foreground">
              Ask across patients, sessions, memory, and documents.
            </p>
          ) : (
            <>
              <h1 className="font-serif text-4xl font-normal tracking-tight">
                Chat
              </h1>
              <p className="text-sm text-muted-foreground">
                Ask across patients, sessions, memory, and documents. Sensitive
                reads pause for approval.
              </p>
            </>
          )}
        </div>
        <div className={cn(isDrawer ? "w-full sm:w-48" : "w-56")}>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Pin patient (optional)
          </label>
          <Select
            value={pinnedPatientId || "__none__"}
            onValueChange={(value) =>
              setPinnedPatientId(!value || value === "__none__" ? "" : value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="No pin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No pin</SelectItem>
              {patients.map((patient) => (
                <SelectItem
                  key={patient.patient_id}
                  value={patient.patient_id}
                >
                  {patient.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <MessageScrollerProvider>
        <MessageScroller className="min-h-0 flex-1 rounded-2xl border border-border bg-background">
          <MessageScrollerViewport className="px-4 py-4">
            <MessageScrollerContent>
              {messages.length === 0 && (
                <div className="flex flex-1 items-center justify-center py-16 text-sm text-muted-foreground">
                  Try “List patients” or pin a patient and ask about their
                  latest visit.
                </div>
              )}
              {messages.map((message, messageIndex) => (
                <MessageScrollerItem
                  key={message.id}
                  scrollAnchor={messageIndex === messages.length - 1}
                >
                  <Message
                    align={message.role === "user" ? "end" : "start"}
                  >
                    <MessageContent>
                      <MessageHeader>
                        {message.role === "user" ? "You" : "Assistant"}
                      </MessageHeader>
                      <ChatMessageParts
                        message={message}
                        addToolApprovalResponse={addToolApprovalResponse}
                        sendMessage={sendMessage}
                      />
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      {error && (
        <p className="text-sm text-destructive">
          {error.message || "Chat request failed"}
        </p>
      )}

      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const text = input.trim();
          if (!text || busy) return;
          void sendMessage({ text });
          setInput("");
        }}
      >
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about a patient, session, or document…"
          disabled={busy}
          className="min-h-12 flex-1"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <Button type="submit" size="icon-lg" disabled={busy || !input.trim()}>
          <RiSendPlane2Line />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}
