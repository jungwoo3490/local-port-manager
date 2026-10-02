export interface KillOutcome {
  escalated: boolean;
}

export type KillError =
  | { kind: "permissionDenied" }
  | { kind: "invalidPid" }
  | { kind: "failed"; message: string };
