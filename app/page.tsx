"use client";

import { useState } from "react";

type EventPlan = {
  summary: string;
  timeline: string[];
  tasks: string[];
  risks: string[];
};

type PlanReview = {
  issues: string[];
  addedTasks: string[];
};

type Draft = {
  title: string;
  content: string;
};

type ActivityEntry = {
  agent: string;
  action: string;
};

type WorkspaceTab = "plan" | "tasks" | "review" | "draft";

const sampleIdea =
  "Our data science club wants to host a beginner-friendly hack night for 60 students where teams build mini projects using public datasets, get help from mentors, eat snacks, and present their projects at the end of the night.";

export default function Home() {
  const [idea, setIdea] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [plan, setPlan] = useState<EventPlan | null>(null);
  const [review, setReview] = useState<PlanReview | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("plan");
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isReviewingPlan, setIsReviewingPlan] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [error, setError] = useState("");

  const answeredCount = answers.filter((answer) => answer.trim()).length;
  const isWorking =
    isGeneratingQuestions ||
    isGeneratingPlan ||
    isReviewingPlan ||
    isGeneratingDraft;

  function addActivity(agent: string, action: string) {
    setActivityLog((currentLog) => [
      ...currentLog,
      {
        agent,
        action,
      },
    ]);
  }

  async function generateQuestions() {
    setError("");
    setSubmitted(false);
    setPlan(null);
    setReview(null);
    setDraft(null);
    setCompletedTasks([]);
    setActivityLog([]);
    setActiveTab("plan");

    if (!idea.trim()) {
      setError("Type an event idea first.");
      return;
    }

    setIsGeneratingQuestions(true);

    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idea }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to generate questions.");
      }

      setQuestions(data.questions);
      setAnswers(Array(data.questions.length).fill(""));
      addActivity(
        "Planning Agent",
        `Generated ${data.questions.length} clarifying questions.`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong.",
      );
    } finally {
      setIsGeneratingQuestions(false);
    }
  }

  function updateAnswer(index: number, value: string) {
    const nextAnswers = [...answers];
    nextAnswers[index] = value;
    setAnswers(nextAnswers);
  }

  function submitAnswers() {
    setSubmitted(true);
    setPlan(null);
    setReview(null);
    setDraft(null);
    setCompletedTasks([]);
    setActiveTab("plan");
  }

  async function generatePlan() {
    setError("");
    setReview(null);
    setDraft(null);
    setCompletedTasks([]);
    setActiveTab("plan");
    setIsGeneratingPlan(true);

    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idea, questions, answers }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to generate the plan.");
      }

      setPlan(data);
      addActivity(
        "Plan Generator Agent",
        `Created a plan with ${data.timeline.length} timeline items, ${data.tasks.length} tasks, and ${data.risks.length} risks.`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong.",
      );
    } finally {
      setIsGeneratingPlan(false);
    }
  }

  async function reviewPlan() {
    if (!plan) {
      return;
    }

    setError("");
    setActiveTab("review");
    setIsReviewingPlan(true);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idea, questions, answers, plan }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to review the plan.");
      }

      setReview(data);
      addActivity(
        "Critic Agent",
        `Found ${data.issues.length} issues and suggested ${data.addedTasks.length} additional tasks.`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong.",
      );
    } finally {
      setIsReviewingPlan(false);
    }
  }

  async function generateDraft() {
    if (!plan) {
      return;
    }

    setError("");
    setActiveTab("draft");
    setIsGeneratingDraft(true);

    try {
      const response = await fetch("/api/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idea, plan }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to generate the draft.");
      }

      setDraft(data);
      addActivity(
        "Drafting Agent",
        "Created a campus event announcement from the plan.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong.",
      );
    } finally {
      setIsGeneratingDraft(false);
    }
  }

  function toggleTask(task: string) {
    setCompletedTasks((currentTasks) =>
      currentTasks.includes(task)
        ? currentTasks.filter((currentTask) => currentTask !== task)
        : [...currentTasks, task],
    );
  }

  function formatPlanForExport() {
    if (!plan) {
      return "";
    }

    return [
      "# CampusOps Event Plan",
      "",
      "## Event Idea",
      idea,
      "",
      "## Summary",
      plan.summary,
      "",
      "## Timeline",
      ...plan.timeline.map((item) => `- ${item}`),
      "",
      "## Tasks",
      ...plan.tasks.map((task) => `- [ ] ${task}`),
      "",
      "## Risks",
      ...plan.risks.map((risk) => `- ${risk}`),
      "",
      review ? "## Review Issues" : "",
      ...(review?.issues.map((issue) => `- ${issue}`) ?? []),
      review ? "" : "",
      review ? "## Suggested Tasks" : "",
      ...(review?.addedTasks.map((task) => `- [ ] ${task}`) ?? []),
      draft ? "" : "",
      draft ? "## Draft Announcement" : "",
      draft ? `### ${draft.title}` : "",
      draft?.content ?? "",
    ]
      .filter((line, index, lines) => line || lines[index - 1])
      .join("\n");
  }

  async function copyPlan() {
    if (!plan) {
      return;
    }

    await navigator.clipboard.writeText(formatPlanForExport());
    addActivity("Workspace", "Copied the event plan to the clipboard.");
  }

  function exportPlan() {
    if (!plan) {
      return;
    }

    const file = new Blob([formatPlanForExport()], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = "campusops-event-plan.md";
    link.click();
    URL.revokeObjectURL(url);
    addActivity("Workspace", "Exported the event plan as a Markdown file.");
  }

  async function copyDraft() {
    if (!draft) {
      return;
    }

    await navigator.clipboard.writeText(`${draft.title}\n\n${draft.content}`);
    addActivity("Drafting Agent", "Copied the announcement draft.");
  }

  return (
    <main className="min-h-screen bg-[#0B1020] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-white/10 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-md bg-sky-400 font-black text-slate-950">
                C
              </div>
              <div>
                <p className="text-lg font-semibold">CampusOps Agent</p>
                <p className="text-sm text-slate-400">
                  Agentic planning workspace for campus teams
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <StatusPill label="Planning" active={questions.length > 0} />
            <StatusPill label="Plan" active={Boolean(plan)} />
            <StatusPill label="Review" active={Boolean(review)} />
            <StatusPill label="Draft" active={Boolean(draft)} />
          </div>
        </header>

        {error && (
          <div className="mt-4 rounded-md border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="grid flex-1 gap-4 py-4 lg:grid-cols-[360px_minmax(0,1fr)_320px]">
          <aside className="space-y-4 lg:sticky lg:top-4 lg:h-[calc(100vh-120px)] lg:overflow-y-auto">
            <section className="rounded-lg border border-white/10 bg-indigo-950/25 p-5 shadow-2xl shadow-black/20">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                    Operation Intake
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold">
                    Describe the campus initiative.
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Start with a rough idea. The Planning Agent will ask a few
                    follow-up questions before creating the full plan.
                  </p>
                </div>
              </div>

              <textarea
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                placeholder="Example: Our AI club wants to host a workshop with alumni speakers and food."
                className="min-h-40 w-full resize-none rounded-md border border-white/10 bg-slate-950/80 p-4 text-sm text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
              />

              <div className="mt-4 rounded-md border border-sky-400/20 bg-sky-400/10 p-4">
                <p className="text-sm font-semibold text-sky-100">
                  First step: let the Planning Agent clarify the idea.
                </p>
                <div className="mt-3 grid gap-2 text-sm text-slate-300">
                  <p>1. Enter a rough event or initiative idea.</p>
                  <p>2. Answer the agent&apos;s follow-up questions.</p>
                  <p>3. Generate the plan, review, and announcement.</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setIdea(sampleIdea)}
                  className="rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-sky-400/60 hover:bg-sky-400/10"
                >
                  Use Sample
                </button>
                <button
                  onClick={generateQuestions}
                  disabled={isGeneratingQuestions}
                  className="rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {isGeneratingQuestions
                    ? "Planning Agent is reading..."
                    : "Ask Follow-Up Questions"}
                </button>
              </div>
            </section>

            {questions.length > 0 && (
              <section className="animate-[fadeIn_240ms_ease-out] rounded-lg border border-white/10 bg-indigo-950/25 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                      Clarifying Context
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">
                      Answer the agent&apos;s questions.
                    </h2>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                    {answeredCount}/{questions.length}
                  </span>
                </div>

                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <label key={question} className="block">
                      <span className="mb-2 block text-sm text-slate-300">
                        <span className="mr-2 text-sky-300">{index + 1}.</span>
                        {question}
                      </span>

                      <input
                        value={answers[index] ?? ""}
                        onChange={(event) =>
                          updateAnswer(index, event.target.value)
                        }
                        placeholder="Type your answer..."
                        className="w-full rounded-md border border-white/10 bg-slate-950/80 p-3 text-sm text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                      />
                    </label>
                  ))}
                </div>

                <button
                  onClick={submitAnswers}
                  className="mt-5 w-full rounded-md bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  Save Answers
                </button>
              </section>
            )}
          </aside>

          <section className="min-w-0 rounded-lg border border-white/10 bg-indigo-950/20 shadow-2xl shadow-black/20">
            <div className="border-b border-white/10 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                    Workspace
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    Event execution output
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={generatePlan}
                    disabled={!submitted || isGeneratingPlan}
                    className="rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                  >
                    {isGeneratingPlan ? "Generating..." : "Generate Plan"}
                  </button>
                  <button
                    onClick={reviewPlan}
                    disabled={!plan || isReviewingPlan}
                    className="rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-amber-300/60 hover:bg-amber-300/10 disabled:cursor-not-allowed disabled:text-slate-500"
                  >
                    {isReviewingPlan ? "Reviewing..." : "Review Plan"}
                  </button>
                  <button
                    onClick={generateDraft}
                    disabled={!plan || isGeneratingDraft}
                    className="rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-emerald-300/60 hover:bg-emerald-300/10 disabled:cursor-not-allowed disabled:text-slate-500"
                  >
                    {isGeneratingDraft ? "Drafting..." : "Draft Announcement"}
                  </button>
                  <button
                    onClick={copyPlan}
                    disabled={!plan}
                    className="rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-sky-400/60 hover:bg-sky-400/10 disabled:cursor-not-allowed disabled:text-slate-500"
                  >
                    Copy Plan
                  </button>
                  <button
                    onClick={exportPlan}
                    disabled={!plan}
                    className="rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-sky-400/60 hover:bg-sky-400/10 disabled:cursor-not-allowed disabled:text-slate-500"
                  >
                    Export Plan
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Metric label="Questions" value={questions.length} />
                <Metric label="Tasks" value={plan?.tasks.length ?? 0} />
                <Metric label="Risks" value={plan?.risks.length ?? 0} />
                <Metric label="Agents" value={activityLog.length} />
              </div>
            </div>

            <div className="border-b border-white/10 px-5 pt-4">
              <div className="flex gap-2 overflow-x-auto">
                <TabButton
                  label="Plan"
                  active={activeTab === "plan"}
                  onClick={() => setActiveTab("plan")}
                />
                <TabButton
                  label="Tasks"
                  active={activeTab === "tasks"}
                  onClick={() => setActiveTab("tasks")}
                  disabled={!plan}
                />
                <TabButton
                  label="Review"
                  active={activeTab === "review"}
                  onClick={() => setActiveTab("review")}
                  disabled={!review && !isReviewingPlan}
                />
                <TabButton
                  label="Draft"
                  active={activeTab === "draft"}
                  onClick={() => setActiveTab("draft")}
                  disabled={!draft && !isGeneratingDraft}
                />
              </div>
            </div>

            <div className="min-h-[540px] p-5">
              {isWorking && <LoadingBanner />}

              {activeTab === "plan" && (
                <div className="animate-[fadeIn_240ms_ease-out] space-y-5">
                  {!plan ? (
                    <EmptyState
                      title="No plan generated yet"
                      body="Ask follow-up questions, save your answers, then run the Plan Generator Agent."
                    />
                  ) : (
                    <>
                      <section className="rounded-lg border border-white/10 bg-slate-950/50 p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                          Summary
                        </p>
                        <p className="mt-3 text-lg leading-8 text-slate-100">
                          {plan.summary}
                        </p>
                      </section>

                      <section>
                        <SectionTitle
                          label="Timeline"
                          caption="Suggested execution sequence"
                        />
                        <div className="mt-4 grid gap-3">
                          {plan.timeline.map((item, index) => (
                            <div
                              key={item}
                              className="rounded-lg border border-white/10 bg-white/[0.03] p-4 transition hover:border-sky-400/40"
                            >
                              <p className="text-sm font-semibold text-sky-300">
                                Step {index + 1}
                              </p>
                              <p className="mt-2 text-slate-300">{item}</p>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section>
                        <SectionTitle
                          label="Risks"
                          caption="Operational issues to watch"
                        />
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {plan.risks.map((risk) => (
                            <div
                              key={risk}
                              className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-50"
                            >
                              {risk}
                            </div>
                          ))}
                        </div>
                      </section>
                    </>
                  )}
                </div>
              )}

              {activeTab === "tasks" && (
                <div className="animate-[fadeIn_240ms_ease-out]">
                  {!plan ? (
                    <EmptyState
                      title="Tasks will appear after plan generation"
                      body="The Plan Generator Agent creates the first execution checklist."
                    />
                  ) : (
                    <div>
                      <SectionTitle
                        label="Task Board"
                        caption="Mark tasks as complete while planning"
                      />
                      <div className="mt-4 grid gap-3">
                        {plan.tasks.map((task) => {
                          const isComplete = completedTasks.includes(task);

                          return (
                            <label
                              key={task}
                              className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 transition hover:border-sky-400/40"
                            >
                              <input
                                type="checkbox"
                                checked={isComplete}
                                onChange={() => toggleTask(task)}
                                className="mt-1 size-4 accent-sky-400"
                              />
                              <span
                                className={
                                  isComplete
                                    ? "text-sm leading-6 text-slate-500 line-through"
                                    : "text-sm leading-6 text-slate-200"
                                }
                              >
                                {task}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "review" && (
                <div className="animate-[fadeIn_240ms_ease-out]">
                  {!review ? (
                    <EmptyState
                      title="No critique yet"
                      body="Run the Critic Agent to find weak assumptions, missing steps, and suggested improvements."
                    />
                  ) : (
                    <div className="space-y-6">
                      <section>
                        <SectionTitle
                          label="Issues Found"
                          caption="Gaps the Critic Agent noticed"
                        />
                        <div className="mt-4 grid gap-3">
                          {review.issues.map((issue) => (
                            <div
                              key={issue}
                              className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50"
                            >
                              {issue}
                            </div>
                          ))}
                        </div>
                      </section>

                      <section>
                        <SectionTitle
                          label="Suggested Tasks"
                          caption="Additional actions to strengthen the plan"
                        />
                        <div className="mt-4 grid gap-3">
                          {review.addedTasks.map((task) => (
                            <div
                              key={task}
                              className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-slate-200"
                            >
                              {task}
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "draft" && (
                <div className="animate-[fadeIn_240ms_ease-out]">
                  {!draft ? (
                    <EmptyState
                      title="No announcement drafted yet"
                      body="Generate an announcement after the plan exists."
                    />
                  ) : (
                    <section className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-5">
                      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                            Announcement
                          </p>
                          <h3 className="mt-2 text-2xl font-semibold">
                            {draft.title}
                          </h3>
                        </div>
                        <button
                          onClick={copyDraft}
                          className="rounded-md bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
                        >
                          Copy Draft
                        </button>
                      </div>
                      <div className="whitespace-pre-wrap rounded-md border border-white/10 bg-slate-950/60 p-4 text-sm leading-7 text-slate-200">
                        {draft.content}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-4 lg:h-[calc(100vh-120px)] lg:overflow-y-auto">
            <section className="rounded-lg border border-white/10 bg-indigo-950/25 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                Agent Activity
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                Workflow timeline
              </h2>

              <div className="mt-5 space-y-4">
                {activityLog.length === 0 ? (
                  <p className="rounded-md border border-dashed border-white/15 p-4 text-sm leading-6 text-slate-400">
                    Agent runs will appear here as the workspace generates
                    questions, plans, reviews, and drafts.
                  </p>
                ) : (
                  activityLog.map((entry, index) => (
                    <div
                      key={`${entry.agent}-${entry.action}-${index}`}
                      className="relative border-l border-sky-400/40 pl-4"
                    >
                      <div className="absolute -left-[5px] top-1 size-2.5 rounded-full bg-sky-400" />
                      <p className="text-sm font-semibold text-white">
                        {entry.agent}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        {entry.action}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-indigo-950/25 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                Session
              </p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <ChecklistItem checked={Boolean(idea.trim())} label="Idea added" />
                <ChecklistItem checked={questions.length > 0} label="Questions generated" />
                <ChecklistItem checked={submitted} label="Context saved" />
                <ChecklistItem checked={Boolean(plan)} label="Plan generated" />
                <ChecklistItem checked={Boolean(review)} label="Plan reviewed" />
                <ChecklistItem checked={Boolean(draft)} label="Announcement drafted" />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function StatusPill({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={
        active
          ? "rounded-full bg-sky-400 px-3 py-1 font-medium text-slate-950"
          : "rounded-full border border-white/10 px-3 py-1 text-slate-400"
      }
    >
      {label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/50 p-3">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
    </div>
  );
}

function TabButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        active
          ? "border-b-2 border-sky-400 px-4 py-3 text-sm font-semibold text-sky-200"
          : "border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-slate-400 transition hover:text-slate-100 disabled:cursor-not-allowed disabled:text-slate-600"
      }
    >
      {label}
    </button>
  );
}

function SectionTitle({
  label,
  caption,
}: {
  label: string;
  caption: string;
}) {
  return (
    <div>
      <h3 className="text-xl font-semibold">{label}</h3>
      <p className="mt-1 text-sm text-slate-400">{caption}</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid min-h-[360px] place-items-center rounded-lg border border-dashed border-white/15 bg-slate-950/30 p-8 text-center">
      <div className="max-w-md">
        <p className="text-xl font-semibold text-white">{title}</p>
        <p className="mt-3 text-sm leading-6 text-slate-400">{body}</p>
      </div>
    </div>
  );
}

function LoadingBanner() {
  return (
    <div className="mb-5 rounded-md border border-sky-400/30 bg-sky-400/10 p-4 text-sm text-sky-100">
      <div className="flex items-center gap-3">
        <span className="size-2.5 animate-pulse rounded-full bg-sky-400" />
        Agent is working on the latest request...
      </div>
    </div>
  );
}

function ChecklistItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={
          checked
            ? "grid size-5 place-items-center rounded-full bg-sky-400 text-xs font-bold text-slate-950"
            : "size-5 rounded-full border border-white/15"
        }
      >
        {checked ? "✓" : ""}
      </span>
      <span className={checked ? "text-slate-200" : "text-slate-500"}>
        {label}
      </span>
    </div>
  );
}
