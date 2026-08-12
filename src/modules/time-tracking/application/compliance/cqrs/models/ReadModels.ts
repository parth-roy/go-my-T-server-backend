export interface WorkerComplianceDashboardReadModel {
  id: string; // WorkerId
  organizationId: string;
  status: string;
  activeCredentials: any;
  expiringSoon: any;
  projectionVersion: string;
  updatedAt: Date;
}

export interface OrganizationComplianceReadModel {
  id: string; // OrganizationId
  organizationId: string;
  complianceRate: number;
  totalWorkers: number;
  nonCompliantCount: number;
  projectionVersion: string;
  updatedAt: Date;
}

export interface ComplianceAuditTimelineReadModel {
  id: string;
  workerId: string;
  organizationId: string;
  eventType: string;
  description: string;
  policySnapshot: any;
  timestamp: Date;
}

export interface NotificationFeedReadModel {
  id: string;
  workerId: string;
  notificationType: string;
  payload: any;
  isRead: boolean;
  projectionVersion: string;
  createdAt: Date;
}

export interface ComplianceAlertsDashboardReadModel {
  id: string;
  organizationId: string;
  alertType: string;
  workerId: string;
  details: any;
  status: string;
  projectionVersion: string;
  createdAt: Date;
}
