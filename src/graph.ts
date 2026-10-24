import { StateGraph, END, START } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { enforceSafeDecision, parseAssistantDecision, parseIntentLabel, parseSentimentLabel, shouldEscalate } from "./decision.js";

const CustomerState = z.object({
  customerId: z.string(),
  message: z.string(),
  intent: z.string().optional(),
  sentiment: z.string().optional(),
  action: z.string().optional(),
  response: z.string().optional(),
  escalate: z.boolean().optional(),
});

export type CustomerStateType = z.infer<typeof CustomerState>;

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.2,
});

async function classifyIntent(state: CustomerStateType) {
  const res = await llm.invoke([
    new SystemMessage(
      "Clasifica la intención del cliente en: consulta, queja, cancelacion, compra, soporte_tecnico. Responde solo la categoría."
    ),
    new HumanMessage(state.message),
  ]);
  return { intent: parseIntentLabel(res.content) };
}

async function analyzeSentiment(state: CustomerStateType) {
  const res = await llm.invoke([
    new SystemMessage(
      "Analiza el sentimiento: positivo, neutral, negativo, urgente. Responde solo la categoría."
    ),
    new HumanMessage(state.message),
  ]);
  return { sentiment: parseSentimentLabel(res.content) };
}

async function decideAction(state: CustomerStateType) {
  const escalate = shouldEscalate(state);

  const prompt = `Intención: ${state.intent}
Sentimiento: ${state.sentiment}
Mensaje: ${state.message}

Decide la acción a tomar (responder, escalar, ofrecer_descuento, cerrar_ticket) y genera una respuesta al cliente.`;

  const res = await llm.invoke([
    new SystemMessage(
      "Eres un agente de soporte al cliente. Responde en JSON con campos: action (string) y response (string)."
    ),
    new HumanMessage(prompt),
  ]);

  const decision = enforceSafeDecision(parseAssistantDecision(String(res.content)), escalate);
  return decision;
}

export function buildCustomerGraph() {
  const graph = new StateGraph(CustomerState)
    .addNode("classifyIntent", classifyIntent)
    .addNode("analyzeSentiment", analyzeSentiment)
    .addNode("decideAction", decideAction)
    .addEdge(START, "classifyIntent")
    .addEdge("classifyIntent", "analyzeSentiment")
    .addEdge("analyzeSentiment", "decideAction")
    .addEdge("decideAction", END);

  return graph.compile();
}

export const customerGraph = buildCustomerGraph();
