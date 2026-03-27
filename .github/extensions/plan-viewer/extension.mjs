import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { joinSession } from "@github/copilot-sdk/extension";

function openInEditor(filePath) {
  const editorEnv = process.env.VISUAL || process.env.EDITOR || "code";
  const parts = editorEnv.split(/\s+/);
  const editor = parts[0];
  const editorArgs = [...parts.slice(1), filePath];
  const isTerminalEditor = /^(vim|nvim|nano|emacs|vi)$/i.test(editor);
  if (isTerminalEditor) return false;
  try {
    execFile(editor, editorArgs, (err) => {
      if (err) session.log(`⚠️ Kunne ikke åpne editor: ${err.message}`);
    });
    return true;
  } catch {
    return false;
  }
}

const session = await joinSession({
  hooks: {
    onPostToolUse: async (input) => {
      const filePath = String(input.toolArgs?.path || "");
      if (!filePath.endsWith("plan.md")) return;
      if (input.toolName !== "create") return;

      const opened = openInEditor(filePath);
      const editorName = process.env.VISUAL || process.env.EDITOR || "VS Code";
      if (opened) {
        await session.log(
          `📋 Detaljert plan åpnet i ${editorName} — følg fremdriften der`,
        );
      }
    },
  },
  tools: [
    {
      name: "view_plan",
      description:
        "Åpner implementasjonsplanen (plan.md) i standard editor for detaljert visning. Bruk denne etter at en plan er opprettet for å la brukeren se den formatert.",
      parameters: {
        type: "object",
        properties: {},
      },
      handler: async () => {
        const ws = session.workspacePath;
        if (!ws) {
          return {
            textResultForLlm: "Ingen aktiv session-workspace funnet.",
            resultType: "failure",
          };
        }

        const planPath = join(ws, "plan.md");
        if (!existsSync(planPath)) {
          return {
            textResultForLlm: "plan.md finnes ikke ennå i session-workspace.",
            resultType: "failure",
          };
        }

        const content = readFileSync(planPath, "utf-8");
        const lines = content.split("\n").length;
        const opened = openInEditor(planPath);
        const editorName =
          process.env.VISUAL || process.env.EDITOR || "VS Code";

        if (opened) {
          await session.log(
            `📋 Detaljert plan åpnet i ${editorName} — følg fremdriften der`,
          );
          return `Plan åpnet i ${editorName} (${lines} linjer).`;
        }
        return `Plan klar (${lines} linjer). Åpne manuelt: ${planPath}`;
      },
    },
  ],
});
