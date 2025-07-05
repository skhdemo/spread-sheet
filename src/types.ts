export interface Family {
  id: string;
  name: string;
}

export interface Activity {
  id: string;
  name: string;
  cost: number;
  paidBy: string; // Family ID
  participants: { familyId: string; count: number }[]; // Per-family participation
  date: string; // Date of the activity (YYYY-MM-DD format)
}

export interface ExpenseResult {
  familyId: string;
  familyName: string;
  totalPaid: number;
  totalOwed: number;
  netAmount: number; // positive = gets money back, negative = owes money
}

export interface MemberParticipation {
  familyId: string;
  memberName: string;
  fullId: string; // format: "familyId:memberName"
}
