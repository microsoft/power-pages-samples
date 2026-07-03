export interface LoanApplication {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  loanAmount: number;
  loanPurpose: string;
  loanTerm: number;
  employmentStatus: string;
  annualIncome: number;
  status: 'Pending' | 'Under Review' | 'Approved' | 'Rejected';
  submittedDate: Date;
}

export type LoanPurpose = 
  | 'Home Purchase'
  | 'Home Improvement'
  | 'Auto Loan'
  | 'Personal Loan'
  | 'Business Loan'
  | 'Education'
  | 'Debt Consolidation'
  | 'Other';

export type EmploymentStatus = 
  | 'Employed Full-Time'
  | 'Employed Part-Time'
  | 'Self-Employed'
  | 'Unemployed'
  | 'Retired'
  | 'Student';

export type LoanTerm = 12 | 24 | 36 | 48 | 60 | 84 | 120 | 180 | 240 | 360;
