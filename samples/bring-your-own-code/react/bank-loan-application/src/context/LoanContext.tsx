import { createContext, useContext, useState, ReactNode } from 'react';
import { LoanApplication } from '../types/LoanApplication';

interface LoanContextType {
  applications: LoanApplication[];
  addApplication: (application: Omit<LoanApplication, 'id' | 'status' | 'submittedDate'>) => void;
  updateApplicationStatus: (id: string, status: LoanApplication['status']) => void;
}

const LoanContext = createContext<LoanContextType | undefined>(undefined);

export const LoanProvider = ({ children }: { children: ReactNode }) => {
  const [applications, setApplications] = useState<LoanApplication[]>([]);

  const addApplication = (application: Omit<LoanApplication, 'id' | 'status' | 'submittedDate'>) => {
    const newApplication: LoanApplication = {
      ...application,
      id: `LOAN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'Pending',
      submittedDate: new Date(),
    };
    setApplications((prev: LoanApplication[]) => [newApplication, ...prev]);
  };

  const updateApplicationStatus = (id: string, status: LoanApplication['status']) => {
    setApplications((prev: LoanApplication[]) =>
      prev.map((app: LoanApplication) => (app.id === id ? { ...app, status } : app))
    );
  };

  return (
    <LoanContext.Provider value={{ applications, addApplication, updateApplicationStatus }}>
      {children}
    </LoanContext.Provider>
  );
};

export const useLoanContext = () => {
  const context = useContext(LoanContext);
  if (context === undefined) {
    throw new Error('useLoanContext must be used within a LoanProvider');
  }
  return context;
};
