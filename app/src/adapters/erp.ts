export interface ErpJournalEntry {
  id: string;
  date: string;
  accountCode: string;
  debit: number;
  credit: number;
  description: string;
}

export interface ErpAdapter {
  syncLedger(entries: any[]): Promise<string>; // Returns sync job ID
  getSyncStatus(jobId: string): Promise<"pending" | "completed" | "failed">;
}

export class MockMergeErpAdapter implements ErpAdapter {
  async syncLedger(_entries: any[]): Promise<string> {
    return "merge_sync_" + Date.now();
  }

  async getSyncStatus(_jobId: string): Promise<"pending" | "completed" | "failed"> {
    return "completed";
  }
}

export const erp = new MockMergeErpAdapter();
