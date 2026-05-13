import { NextResponse } from "next/server";

function createFallbackDraft(idea: string) {
  return {
    title: "Join Us for an Upcoming Campus Event",
    content: `Hi everyone,\n\nWe are excited to invite you to an upcoming campus event:\n\n${idea}\n\nThis event is designed to bring students together for a practical, engaging experience with clear next steps, useful resources, and a chance to connect with others on campus.\n\nMore details about the date, location, and registration will be shared soon. If you are interested in helping with planning, setup, promotion, or day-of support, please reach out to the organizing team.\n\nWe hope to see you there!`,
  };
}

export async function POST(request: Request) {
  const { idea, plan } = await request.json();

  if (!idea || typeof idea !== "string") {
    return NextResponse.json(
      { error: "Please provide an event idea." },
      { status: 400 },
    );
  }

  if (!plan || typeof plan !== "object") {
    return NextResponse.json(
      { error: "Please generate a plan before creating a draft." },
      { status: 400 },
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY in .env.local." },
      { status: 500 },
    );
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
              text: "You are the Drafting Agent for CampusOps. Write polished, practical student club communications based on an event plan. Keep the writing clear, energetic, and ready to paste into an email or campus announcement.",
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
                    draftType: "campus event announcement",
                    idea,
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
              title: {
                type: "STRING",
              },
              content: {
                type: "STRING",
              },
            },
            required: ["title", "content"],
          },
        },
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json({
      ...createFallbackDraft(idea),
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
