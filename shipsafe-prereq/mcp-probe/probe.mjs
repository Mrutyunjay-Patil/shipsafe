// C12. Start @paypal/mcp against the sandbox, list tools, call read-only ones.
// Usage: PAYPAL_ACCESS_TOKEN=... node probe.mjs <order_id> [order_id2]
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { writeFileSync } from "node:fs";

const EV = new URL("../evidence/", import.meta.url).pathname;
const transport = new StdioClientTransport({
  command: "node_modules/.bin/mcp",
  args: ["--tools=all"],
  env: { ...process.env, PAYPAL_ENVIRONMENT: "SANDBOX" },
});
const client = new Client({ name: "shipsafe-probe", version: "0.0.1" });
await client.connect(transport);
const { tools } = await client.listTools();
writeFileSync(EV + "mcp-tools.json", JSON.stringify(tools.map(t => ({ name: t.name, description: t.description?.slice(0, 200), input: Object.keys(t.inputSchema?.properties || {}) })), null, 2));
console.log("tools:", tools.length, tools.map(t => t.name).join(", "));

const today = new Date();
const start = new Date(today.getTime() - 25 * 86400e3);
const calls = [
  ["list_transactions", { start_date: start.toISOString().slice(0, 19) + "Z", end_date: today.toISOString().slice(0, 19) + "Z" }],
  ["list_disputes", {}],
  ...process.argv.slice(2).flatMap(id => [["get_order", { id }], ["get_shipment_tracking", { order_id: id }]]),
];
const results = [];
for (const [name, args] of calls) {
  if (!tools.find(t => t.name === name)) { results.push({ name, skipped: "tool not exposed" }); continue; }
  const t0 = Date.now();
  try {
    const r = await client.callTool({ name, arguments: args });
    const text = (r.content || []).map(c => c.text || "").join("\n");
    results.push({ name, args, ms: Date.now() - t0, isError: !!r.isError, output: text.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "<email>").slice(0, 3000) });
  } catch (e) {
    results.push({ name, args, error: String(e).slice(0, 500) });
  }
  const last = results.at(-1);
  console.log(name, last.isError ? "ERROR" : last.error ? "THREW" : "ok", (last.output || last.error || "").slice(0, 200).replace(/\n/g, " "));
}
writeFileSync(EV + "c12-calls.json", JSON.stringify(results, null, 2));
await client.close();
