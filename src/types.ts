export interface Family {
  id: string;
  name: string;
  memberCount: number; // Number of members instead of individual names
}

export interface Activity {
  id: string;
  name: string;
  cost: number;
  paidBy: string; // Family ID
  participants: { familyId: string; count: number }[]; // Per-family participation
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
