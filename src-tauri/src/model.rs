use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PortEntry {
    pub port: u16,
    pub pid: u32,
    pub process_name: String,
    pub exec_path: String,
    pub bind_addrs: Vec<String>,
    pub exposure: Exposure,
    pub is_system: bool,
    pub families: Vec<IpFamily>,
}

#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum Exposure {
    Localhost,
    AllInterfaces,
}

#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "camelCase")]
pub enum IpFamily {
    V4,
    V6,
}
