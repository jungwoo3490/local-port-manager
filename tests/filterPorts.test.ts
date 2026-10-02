import { describe, expect, test } from "bun:test";
import { filterPorts } from "../src/lib/filterPorts";
import type { PortEntry } from "../src/types/port";

function entry(port: number, processName: string, isSystem = false): PortEntry {
  return {
    port,
    pid: port,
    processName,
    execPath: isSystem ? "/System/x" : "/opt/x",
    bindAddrs: ["127.0.0.1"],
    exposure: "localhost",
    isSystem,
    families: ["v4"],
  };
}

const ports: PortEntry[] = [
  entry(3000, "node"),
  entry(3001, "node"),
  entry(5000, "ControlCenter", true),
  entry(8080, "java"),
  entry(40070, "Cursor Helper (Plugin)"),
  entry(49152, "rapportd", true),
];

const off = { query: "", devPortsOnly: false, hideSystem: false };

function portsOf(result: { entries: PortEntry[] }): number[] {
  return result.entries.map((e) => e.port);
}

describe("filterPorts", () => {
  test("필터가 없으면 전부 통과한다", () => {
    expect(portsOf(filterPorts(ports, off))).toEqual([3000, 3001, 5000, 8080, 40070, 49152]);
  });

  test("숫자 검색어는 포트 접두 일치다", () => {
    expect(portsOf(filterPorts(ports, { ...off, query: "300" }))).toEqual([3000, 3001]);
  });

  test("숫자 검색어는 중간 일치를 잡지 않는다", () => {
    expect(portsOf(filterPorts(ports, { ...off, query: "007" }))).toEqual([]);
    expect(portsOf(filterPorts(ports, { ...off, query: "4" }))).toEqual([40070, 49152]);
  });

  test("문자 검색어는 프로세스명 부분 일치이고 대소문자를 무시한다", () => {
    expect(portsOf(filterPorts(ports, { ...off, query: "cursor" }))).toEqual([40070]);
    expect(portsOf(filterPorts(ports, { ...off, query: "NODE" }))).toEqual([3000, 3001]);
    expect(portsOf(filterPorts(ports, { ...off, query: "helper (p" }))).toEqual([40070]);
  });

  test("검색어 앞뒤 공백은 무시한다", () => {
    expect(portsOf(filterPorts(ports, { ...off, query: "  java " }))).toEqual([8080]);
    expect(portsOf(filterPorts(ports, { ...off, query: "   " }))).toHaveLength(6);
  });

  test("개발 포트 필터는 3000~9999만 남긴다", () => {
    expect(portsOf(filterPorts(ports, { ...off, devPortsOnly: true }))).toEqual([3000, 3001, 5000, 8080]);
  });

  test("시스템 숨김은 시스템 프로세스를 빼고 개수를 센다", () => {
    const result = filterPorts(ports, { ...off, hideSystem: true });
    expect(portsOf(result)).toEqual([3000, 3001, 8080, 40070]);
    expect(result.hiddenSystemCount).toBe(2);
  });

  test("숨긴 시스템 개수는 검색어와 무관하다", () => {
    const result = filterPorts(ports, { query: "java", devPortsOnly: false, hideSystem: true });
    expect(portsOf(result)).toEqual([8080]);
    expect(result.hiddenSystemCount).toBe(2);
  });

  test("필터를 모두 켜면 교집합이다", () => {
    const result = filterPorts(ports, { query: "30", devPortsOnly: true, hideSystem: true });
    expect(portsOf(result)).toEqual([3000, 3001]);
  });
});
