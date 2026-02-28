import { Type } from "@google/genai";

export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
}

export interface ReceiptData {
  restaurantName?: string;
  date?: string;
  items: ReceiptItem[];
  tax: number;
  tip: number;
  total: number;
  currency: string;
  itemsIncludeTax: boolean;
}

export interface Assignment {
  itemId: string;
  people: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

declare global {
  interface Window {
  }
}

export const RECEIPT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    restaurantName: { type: Type.STRING, description: "The name of the restaurant or store" },
    date: { type: Type.STRING, description: "The date on the receipt in a human-readable format, e.g. 'March 15, 2024'. Omit if not present." },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          price: { type: Type.NUMBER }
        },
        required: ["name", "price"]
      }
    },
    tax: { type: Type.NUMBER },
    tip: { type: Type.NUMBER },
    total: { type: Type.NUMBER },
    currency: { type: Type.STRING },
    itemsIncludeTax: { type: Type.BOOLEAN, description: "True if the individual item prices already include the tax amount" }
  },
  required: ["items", "tax", "total", "itemsIncludeTax"]
};

export const COMMAND_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    assignments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          itemName: { type: Type.STRING, description: "The name of the item from the receipt" },
          people: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Names of people to assign this item to" },
          action: { type: Type.STRING, enum: ["add", "remove", "set"], description: "Whether to add people to the item, remove them, or set the list entirely" }
        },
        required: ["itemName", "people", "action"]
      }
    },
    newPeople: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Any new names mentioned that weren't in the system yet"
    },
    response: {
      type: Type.STRING,
      description: "A friendly confirmation message of what was updated"
    }
  },
  required: ["assignments", "response"]
};
