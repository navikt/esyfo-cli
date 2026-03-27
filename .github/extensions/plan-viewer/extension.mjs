import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { joinSession } from "@github/copilot-sdk/extension";

let hasAutoOpenedPlan = false;

function getEditorCommand() {
  return process.env.VISUAL || process.env.EDITOR || "code";
}

function getEditorLabel() {
  return process.env.VISUAL || process.env.EDITOR || "standard editor";
}

function openInEditor(filePath) {
  const editorEnv = getEditorCommand();
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

function resolvePlanPath(input, workspacePath) {
  const directPath = String(input.toolArgs?.path || "");
  if (directPath.endsWith("plan.md")) return directPath;

  const argsText =
    typeof input.toolArgs === "string"
      ? input.toolArgs
      : typeof input.toolArgs?.patch === "string"
        ? input.toolArgs.patch
        : JSON.stringify(input.toolArgs || "");

  const match = argsText.match(/\*\*\* (?:Add|Update) File: (.+plan\.md)/);
  if (match) {
    const rawPath = match[1].trim();
    if (rawPath === "plan.md" && workspacePath)
      return join(workspacePath, rawPath);
    return rawPath;
  }

  if (argsText.includes("plan.md") && workspacePath) {
    return join(workspacePath, "plan.md");
  }

  return "";
}

async function handlePlanWrite(filePath) {
  if (!filePath.endsWith("plan.md")) return;

  if (!hasAutoOpenedPlan) {
    hasAutoOpenedPlan = true;
    const opened = openInEditor(filePath);
    const editorLabel = getEditorLabel();

    if (opened) {
      await session.log(
        `📋 Detaljert plan åpnet i ${editorLabel} — si "vis plan" for å åpne den igjen senere`,
      );
      return;
    }

    await session.log(
      `📋 Plan klar — si "vis plan" for å åpne den: ${filePath}`,
    );
    return;
  }

  await session.log('📋 Plan oppdatert — si "vis plan" for å åpne den igjen');
}

const session = await joinSession({
  hooks: {
    onPostToolUse: async (input) => {
      if (!["create", "edit", "apply_patch"].includes(input.toolName)) return;

      const filePath = resolvePlanPath(input, session.workspacePath);
      if (!filePath) return;

      await handlePlanWrite(filePath);
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
        const editorLabel = getEditorLabel();

        if (opened) {
          hasAutoOpenedPlan = true;
          await session.log(
            `📋 Detaljert plan åpnet i ${editorLabel} — følg fremdriften der`,
          );
          return `Plan åpnet i ${editorLabel} (${lines} linjer).`;
        }
        return `Plan klar (${lines} linjer). Åpne manuelt: ${planPath}`;
      },
    },
  ],
});
