import { NextResponse } from "next/server";

const fallbackQuestions = [
  "What date or week are you targeting for this initiative?",
  "How many people do you expect to attend or participate?",
  "What campus space, equipment, or materials will you need?",
  "What budget do you have for food, supplies, promotion, or speakers?",
  "Who needs to approve this before it can happen?",
];

export async function POST(request: Request) {
  const { idea } = await request.json();

  if (!idea || typeof idea !== "string") {
    return NextResponse.json(
      { error: "Please provide an event idea." },
      { status: 400 },
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({
      questions: fallbackQuestions,
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
              text: "You are the Planning Agent for CampusOps. Given a campus event or club initiative idea, ask exactly 5 practical clarifying questions. Focus on timing, audience, venue, budget, approvals, staffing, and logistics. Keep each question short and specific.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Event idea: ${idea}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              questions: {
                type: "ARRAY",
                minItems: 5,
                maxItems: 5,
                items: {
                  type: "STRING",
                },
              },
            },
            required: ["questions"],
          },
        },
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json({
      questions: fallbackQuestions,
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
