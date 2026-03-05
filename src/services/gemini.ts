import { GoogleGenAI } from "@google/genai";
import { RECEIPT_SCHEMA, COMMAND_SCHEMA, ReceiptData } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function parseReceiptImage(base64Image: string, mimeType: string): Promise<ReceiptData> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image.split(',')[1] || base64Image,
            mimeType: mimeType
          }
        },
        { text: "Parse this receipt into a structured JSON format. Extract the restaurant name, the date (if present, in a human-readable format like 'March 15, 2024'), all line items with their prices, the tax amount, the tip (if present), and the total. IMPORTANT: Determine if the line item prices already include tax. If they do, set the 'tax' field to the amount shown but ensure the 'total' reflects the actual final amount on the bill. If the tax is listed separately and NOT included in item prices, ensure the 'total' is the sum of items + tax + tip. If tip is not explicitly listed, set it to 0." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: RECEIPT_SCHEMA as any
    }
  });

  const data = JSON.parse(response.text || "{}");
  data.tip = data.tip ?? 0;
  data.tax = data.tax ?? 0;
  data.currency = data.currency ?? '€';
  // Add IDs to items
  data.items = data.items.map((item: any, index: number) => ({
    ...item,
    id: `item-${index}`
  }));
  return data as ReceiptData;
}

export async function processChatCommand(
  message: string, 
  items: any[], 
  currentPeople: string[],
  currentAssignments: any[]
) {
  const ai = getAI();
  const context = `
    Receipt Items: ${JSON.stringify(items.map((i: any) => ({ id: i.id, name: i.name })))}
    Current People: ${JSON.stringify(currentPeople)}
    Current Assignments: ${JSON.stringify(currentAssignments)}

    User said: "${message}"

    Instructions:
    1. Match item names loosely (e.g. "burger" matches "Cheese Burger $12").
    2. Identify people and what they ordered.
    3. Any name not in Current People → add to newPeople.
    4. Use action "set" when a person is described as having an item (voice input).
    5. Return assignments for every mentioned item.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: context,
    config: {
      responseMimeType: "application/json",
      responseSchema: COMMAND_SCHEMA as any
    }
  });

  return JSON.parse(response.text || "{}");
}
