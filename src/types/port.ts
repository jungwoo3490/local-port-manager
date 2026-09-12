export type Exposure = "localhost" | "allInterfaces";
export type IpFamily = "v4" | "v6";

export interface PortEntry {
  port: number;
  pid: number;
  processName: string;
  execPath: string;
  bindAddrs: string[];
  exposure: Exposure;
  isSystem: boolean;
  families: IpFamily[];
}
