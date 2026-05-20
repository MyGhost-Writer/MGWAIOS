export type ConnectorKind = "manual-upload" | "microsoft-graph" | "salesforce" | "google-drive";

export interface ConnectorDescriptor {
  kind: ConnectorKind;
  displayName: string;
  readOnly: boolean;
  status: "planned" | "available";
}

export const plannedConnectors: ConnectorDescriptor[] = [
  {
    kind: "manual-upload",
    displayName: "Manual Upload",
    readOnly: true,
    status: "planned",
  },
  {
    kind: "microsoft-graph",
    displayName: "Microsoft Graph",
    readOnly: true,
    status: "planned",
  },
  {
    kind: "salesforce",
    displayName: "Salesforce",
    readOnly: true,
    status: "planned",
  },
  {
    kind: "google-drive",
    displayName: "Google Drive",
    readOnly: true,
    status: "planned",
  },
];
