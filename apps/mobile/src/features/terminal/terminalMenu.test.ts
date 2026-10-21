import { describe, expect, it } from "vite-plus/test";

import { DEFAULT_TERMINAL_ID } from "@t3tools/contracts";

import { getTerminalLabel } from "@t3tools/shared/terminalLabels";

import {
  buildThreadTerminalMenu,
  nextOpenTerminalId,
  previousLiveTerminalId,
  resolveProjectScriptTerminalId,
  type TerminalMenuSession,
} from "./terminalMenu";
import { androidHeaderMenuActions } from "../../components/ui/headerMenu.android";

describe("thread terminal menu", () => {
  const build = {
    id: "build",
    name: "Build",
    command: "bun run build",
    icon: "build" as const,
    runOnWorktreeCreate: false,
  };
  const menu = (canOperateTerminal: boolean) =>
    buildThreadTerminalMenu({
      projectScripts: [build],
      terminalSessions: [makeMenuSession({ terminalId: "term-2", status: "running" })],
      canOperateTerminal,
      onRunProjectScript: async () => {},
      onOpenTerminal: () => {},
      onOpenNewTerminal: () => {},
    });

  it("offers saved actions alongside existing sessions and a new shell on Android", () => {
    expect(
      androidHeaderMenuActions(menu(true).items).map(({ id, title, subtitle }) => ({
        id,
        title,
        subtitle,
      })),
    ).toEqual([
      { id: "script-build", title: "Build", subtitle: "bun run build" },
      { id: "terminal-term-2", title: "Terminal 2", subtitle: "Ready" },
      {
        id: "terminal-new",
        title: "Open new terminal",
        subtitle: "Start another shell for this thread",
      },
    ]);
  });

  it("keeps sessions accessible while disabling commands for read-only connections", () => {
    expect(
      androidHeaderMenuActions(menu(false).items).map((item) => Boolean(item.attributes?.disabled)),
    ).toEqual([true, false, true]);
  });
});

function makeMenuSession(input: {
  readonly terminalId: string;
  readonly status: TerminalMenuSession["status"];
}): TerminalMenuSession {
  return {
    terminalId: input.terminalId,
    cwd: null,
    status: input.status,
    hasRunningSubprocess: false,
    displayLabel: getTerminalLabel(input.terminalId),
    updatedAt: null,
  };
}

describe("nextOpenTerminalId", () => {
  it("allocates separate terminals on repeated visits without readable metadata", () => {
    const first = nextOpenTerminalId({
      listedTerminalIds: [],
      uniqueSuffix: "783c91cc-a413-47c7-8312-c2a5a1f05e40",
    });
    const nextVisit = nextOpenTerminalId({
      listedTerminalIds: [],
      uniqueSuffix: "102315fc-ceef-45c4-b978-c4d4947d3c26",
    });
    expect(first).not.toBe(DEFAULT_TERMINAL_ID);
    expect(nextVisit).not.toBe(first);
  });

  it("avoids the mounted primary tab when the session list is still empty", () => {
    expect(
      nextOpenTerminalId({
        listedTerminalIds: [],
        activeRouteTerminalId: DEFAULT_TERMINAL_ID,
      }),
    ).toBe("term-2");
  });
});

describe("previousLiveTerminalId", () => {
  it("prefers the nearest live session below the exited id", () => {
    expect(
      previousLiveTerminalId({
        sessions: [
          makeMenuSession({ terminalId: DEFAULT_TERMINAL_ID, status: "running" }),
          makeMenuSession({ terminalId: "term-2", status: "running" }),
          makeMenuSession({ terminalId: "term-3", status: "exited" }),
          makeMenuSession({ terminalId: "term-4", status: "running" }),
        ],
        exitedTerminalId: "term-3",
      }),
    ).toBe("term-2");
  });

  it("falls back to the nearest live session above when the exited id was lowest", () => {
    expect(
      previousLiveTerminalId({
        sessions: [
          makeMenuSession({ terminalId: DEFAULT_TERMINAL_ID, status: "exited" }),
          makeMenuSession({ terminalId: "term-2", status: "starting" }),
          makeMenuSession({ terminalId: "term-4", status: "running" }),
        ],
        exitedTerminalId: DEFAULT_TERMINAL_ID,
      }),
    ).toBe("term-2");
  });
});

describe("resolveProjectScriptTerminalId", () => {
  it("never targets an unseen default terminal when metadata is unavailable", () => {
    const terminalId = resolveProjectScriptTerminalId({
      existingTerminalIds: [],
      hasRunningTerminal: false,
      uniqueSuffix: "783c91cc-a413-47c7-8312-c2a5a1f05e40",
    });
    expect(terminalId).not.toBe(DEFAULT_TERMINAL_ID);
    expect(getTerminalLabel(terminalId)).toBe("Terminal 1");
  });
});
