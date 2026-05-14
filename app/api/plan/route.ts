import { NextResponse } from "next/server";

function createFallbackPlan(idea: string) {
  return {
    summary: `Plan and run this campus initiative: ${idea}`,
    timeline: [
      "Week 1: Confirm goals, approvals, budget, venue needs, and the organizing team.",
      "Week 2: Reserve space, recruit partners or speakers, and draft promotion materials.",
      "Week 3: Finalize logistics, confirm supplies, assign volunteers, and launch promotion.",
      "Week 4: Send reminders, prepare day-of materials, run the event, and collect feedback.",
    ],
    tasks: [
      "Assign one lead organizer and one backup owner.",
      "Confirm required approvals with student activities and any faculty advisor.",
      "Reserve an appropriate campus space with needed equipment.",
      "Create a simple budget for food, supplies, promotion, and contingency costs.",
      "Recruit volunteers for setup, check-in, support, and cleanup.",
      "Create a promotional message and share it through club channels.",
      "Confirm vendors, speakers, mentors, or partners at least one week before the event.",
      "Prepare day-of materials, signage, check-in process, and feedback form.",
    ],
    risks: [
      "Campus approvals or room reservations may take longer than expected.",
      "Attendance may be lower than expected without early promotion.",
      "Budget or supply needs may change once logistics are finalized.",
      "Volunteer roles may be unclear without a day-of staffing plan.",
    ],
  };
}

export async function POST(request: Request) {
  const { idea, questions, answers } = await request.json();

  if (!idea || typeof idea !== "string") {
    return NextResponse.json(
      { error: "Please provide an event idea." },
      { status: 400 },
    );
  }

  if (!Array.isArray(questions) || !Array.isArray(answers)) {
    return NextResponse.json(
      { error: "Please provide questions and answers." },
      { status: 400 },
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({
      ...createFallbackPlan(idea),
      demoFallback: true,
    });
  }

  const context = questions
    .map((question: string, index: number) => {
      const answer = answers[index] || "No answer provided.";
      return `Q: ${question}\nA: ${answer}`;
    })
    .join("\n\n");

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "You are the Plan Generator Agent for CampusOps. Turn a campus event idea and clarifying answers into a practical execution plan for student organizers. Be specific, realistic, and action-oriented.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Event idea:\n${idea}\n\nClarifying context:\n${context}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              summary: {
                type: "STRING",
              },
              timeline: {
                type: "ARRAY",
                minItems: 4,
                maxItems: 6,
                items: {
                  type: "STRING",
                },
              },
              tasks: {
                type: "ARRAY",
                minItems: 8,
                maxItems: 12,
                items: {
                  type: "STRING",
                },
              },
              risks: {
                type: "ARRAY",
                minItems: 3,
                maxItems: 5,
                items: {
                  type: "STRING",
                },
              },
            },
            required: ["summary", "timeline", "tasks", "risks"],
          },
        },
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json({
      ...createFallbackPlan(idea),
      demoFallback: true,
    });
  }

  const outputText =
    data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("") ?? "";

  if (!outputText) {
    return NextResponse.json(
      { error: "The model did not return text." },
      { status: 500 },
    );
  }

  return NextResponse.json(JSON.parse(outputText));
}
