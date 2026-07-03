import { useState } from 'react';
import {
  makeStyles,
  Button,
  Input,
  Field,
  Dropdown,
  Option,
  Card,
  Title3,
  Body1,
  tokens,
} from '@fluentui/react-components';
import { CheckmarkCircle24Regular } from '@fluentui/react-icons';
import { useLoanContext } from '../context/LoanContext';
import { LoanPurpose, EmploymentStatus, LoanTerm } from '../types/LoanApplication';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXL,
    maxWidth: '800px',
    margin: '0 auto',
    padding: tokens.spacingVerticalXXL,
  },
  card: {
    padding: tokens.spacingVerticalXXL,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacingHorizontalL,
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
  buttonContainer: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    justifyContent: 'flex-end',
    marginTop: tokens.spacingVerticalL,
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorPaletteGreenBackground2,
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorPaletteGreenForeground1,
  },
});

const loanPurposes: LoanPurpose[] = [
  'Home Purchase',
  'Home Improvement',
  'Auto Loan',
  'Personal Loan',
  'Business Loan',
  'Education',
  'Debt Consolidation',
  'Other',
];

const employmentStatuses: EmploymentStatus[] = [
  'Employed Full-Time',
  'Employed Part-Time',
  'Self-Employed',
  'Unemployed',
  'Retired',
  'Student',
];

const loanTerms: { value: LoanTerm; label: string }[] = [
  { value: 12, label: '1 year (12 months)' },
  { value: 24, label: '2 years (24 months)' },
  { value: 36, label: '3 years (36 months)' },
  { value: 48, label: '4 years (48 months)' },
  { value: 60, label: '5 years (60 months)' },
  { value: 84, label: '7 years (84 months)' },
  { value: 120, label: '10 years (120 months)' },
  { value: 180, label: '15 years (180 months)' },
  { value: 240, label: '20 years (240 months)' },
  { value: 360, label: '30 years (360 months)' },
];

export const LoanApplicationForm = () => {
  const styles = useStyles();
  const { addApplication } = useLoanContext();
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    loanAmount: '',
    loanPurpose: '' as LoanPurpose,
    loanTerm: '' as unknown as LoanTerm,
    employmentStatus: '' as EmploymentStatus,
    annualIncome: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    addApplication({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      loanAmount: parseFloat(formData.loanAmount),
      loanPurpose: formData.loanPurpose,
      loanTerm: formData.loanTerm,
      employmentStatus: formData.employmentStatus,
      annualIncome: parseFloat(formData.annualIncome),
    });

    setShowSuccess(true);
    resetForm();

    setTimeout(() => {
      setShowSuccess(false);
    }, 5000);
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      loanAmount: '',
      loanPurpose: '' as LoanPurpose,
      loanTerm: '' as unknown as LoanTerm,
      employmentStatus: '' as EmploymentStatus,
      annualIncome: '',
    });
  };

  const isFormValid = () => {
    return (
      formData.firstName &&
      formData.lastName &&
      formData.email &&
      formData.phone &&
      formData.loanAmount &&
      formData.loanPurpose &&
      formData.loanTerm &&
      formData.employmentStatus &&
      formData.annualIncome
    );
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <Title3>Apply for a Loan</Title3>
        <Body1>Fill out the form below to submit your loan application</Body1>

        {showSuccess && (
          <div className={styles.successMessage}>
            <CheckmarkCircle24Regular />
            <Body1>Your loan application has been submitted successfully!</Body1>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <Field label="First Name" required>
              <Input
                value={formData.firstName}
                onChange={(e: any) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Enter your first name"
                required
              />
            </Field>

            <Field label="Last Name" required>
              <Input
                value={formData.lastName}
                onChange={(e: any) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Enter your last name"
                required
              />
            </Field>
          </div>

          <div className={styles.row}>
            <Field label="Email" required>
              <Input
                type="email"
                value={formData.email}
                onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@example.com"
                required
              />
            </Field>

            <Field label="Phone Number" required>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
                required
              />
            </Field>
          </div>

          <div className={styles.row}>
            <Field label="Loan Amount ($)" required>
              <Input
                type="number"
                value={formData.loanAmount}
                onChange={(e: any) => setFormData({ ...formData, loanAmount: e.target.value })}
                placeholder="50000"
                min="1000"
                step="1000"
                required
              />
            </Field>

            <Field label="Loan Purpose" required>
              <Dropdown
                placeholder="Select a purpose"
                value={formData.loanPurpose}
                selectedOptions={formData.loanPurpose ? [formData.loanPurpose] : []}
                onOptionSelect={(_, data) =>
                  setFormData({ ...formData, loanPurpose: data.optionValue as LoanPurpose })
                }
              >
                {loanPurposes.map((purpose) => (
                  <Option key={purpose} value={purpose}>
                    {purpose}
                  </Option>
                ))}
              </Dropdown>
            </Field>
          </div>

          <div className={styles.row}>
            <Field label="Loan Term" required>
              <Dropdown
                placeholder="Select a term"
                value={formData.loanTerm ? loanTerms.find(t => t.value === formData.loanTerm)?.label : ''}
                selectedOptions={formData.loanTerm ? [formData.loanTerm.toString()] : []}
                onOptionSelect={(_, data) =>
                  setFormData({ ...formData, loanTerm: parseInt(data.optionValue as string) as LoanTerm })
                }
              >
                {loanTerms.map((term) => (
                  <Option key={term.value} value={term.value.toString()}>
                    {term.label}
                  </Option>
                ))}
              </Dropdown>
            </Field>

            <Field label="Employment Status" required>
              <Dropdown
                placeholder="Select employment status"
                value={formData.employmentStatus}
                selectedOptions={formData.employmentStatus ? [formData.employmentStatus] : []}
                onOptionSelect={(_, data) =>
                  setFormData({ ...formData, employmentStatus: data.optionValue as EmploymentStatus })
                }
              >
                {employmentStatuses.map((status) => (
                  <Option key={status} value={status}>
                    {status}
                  </Option>
                ))}
              </Dropdown>
            </Field>
          </div>

          <Field label="Annual Income ($)" required>
            <Input
              type="number"
              value={formData.annualIncome}
              onChange={(e: any) => setFormData({ ...formData, annualIncome: e.target.value })}
              placeholder="75000"
              min="0"
              step="1000"
              required
            />
          </Field>

          <div className={styles.buttonContainer}>
            <Button type="button" onClick={resetForm}>
              Clear
            </Button>
            <Button type="submit" appearance="primary" disabled={!isFormValid()}>
              Submit Application
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
