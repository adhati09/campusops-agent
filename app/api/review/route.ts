import { NextResponse } from "next/server";

const fallbackReview = {
  issues: [
    "The plan should name specific owners for approvals, venue booking, promotion, and day-of operations.",
    "The timeline should include a clear deadline for campus approval and room confirmation.",
    "The budget needs a backup option in case food, supplies, or partner costs are higher than expected.",
    "The day-of staffing plan should define setup, check-in, support, cleanup, and emergency contacts.",
  ],
  addedTasks: [
    "Create an owner matrix that assigns each major task to a specific student organizer.",
    "Confirm approval and venue deadlines with student activities this week.",
    "Build a low-cost backup plan for food, supplies, and promotion.",
    "Write a day-of run sheet with timing, volunteer roles, and contact information.",
  ],
};

export async function POST(request: Request) {
  const { idea, questions, answers, plan } = await request.json();

  if (!idea || typeof idea !== "string") {
    return NextResponse.json(
      { error: "Please provide an event idea." },
      { status: 400 },
    );
  }

  if (!plan || typeof plan !== "object") {
    return NextResponse.json(
      { error: "Please provide a plan to review." },
      { status: 400 },
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({
      ...fallbackReview,
      demoFallback: true,
    });
  }

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
              text: "You are the Critic Agent for CampusOps. Review an event execution plan for missing steps, weak assumptions, unrealistic timing, vague ownership, and operational risks. Be practical and concise.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: JSON.stringify(
                  {
                    idea,
                    questions,
                    answers,
                    plan,
                  },
                  null,
                  2,
                ),
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              issues: {
                type: "ARRAY",
                minItems: 3,
                maxItems: 5,
                items: {
                  type: "STRING",
                },
              },
              addedTasks: {
                type: "ARRAY",
                minItems: 3,
                maxItems: 5,
                items: {
                  type: "STRING",
                },
              },
            },
            required: ["issues", "addedTasks"],
          },
        },
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json({
      ...fallbackReview,
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
