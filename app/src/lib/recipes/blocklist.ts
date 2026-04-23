const BAD_STARTS = [
  /\bxmrig\b/i,
  /\bminerd\b/i,
  /\bnbminer\b/i,
  /\bt-rex\b/i,
  /\blolminer\b/i,
  /\bethminer\b/i,
  /\bcpuminer\b/i,
  /\bnc\s+-[a-z]*l/i,
  /\bnetcat\s+-[a-z]*l/i,
  /python\s+-m\s+http\.server.*0\.0\.0\.0/i,
  /\bmsfvenom\b/i,
  /\btor\s+--hiddenserviceport\b/i,
  /curl[^|]*\|\s*sh\b/i,
  /wget[^|]*\|\s*sh\b/i,
];

export function isAbusiveStartCmd(cmd: string): boolean {
  return BAD_STARTS.some((rx) => rx.test(cmd));
}

export function assertSafeStartCmd(cmd: string): void {
  if (isAbusiveStartCmd(cmd)) {
    throw new Error(
      "recipe rejected: start command matched a known-abuse pattern",
    );
  }
}
