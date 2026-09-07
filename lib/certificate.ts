export function getApprovalNumber(applicationId: string, approvedAt: string): string {
  const year = new Date(approvedAt).getFullYear();
  const shortCode = applicationId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `SMIT-${year}-${shortCode}`;
}
