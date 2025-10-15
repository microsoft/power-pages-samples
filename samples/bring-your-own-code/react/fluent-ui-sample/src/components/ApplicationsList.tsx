import {
  makeStyles,
  DataGrid,
  DataGridBody,
  DataGridRow,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridCell,
  TableColumnDefinition,
  createTableColumn,
  Badge,
  Card,
  Title3,
  Body1,
  tokens,
} from '@fluentui/react-components';
import { useLoanContext } from '../context/LoanContext';
import { LoanApplication } from '../types/LoanApplication';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXL,
    maxWidth: '1400px',
    margin: '0 auto',
    padding: tokens.spacingVerticalXXL,
  },
  card: {
    padding: tokens.spacingVerticalXXL,
  },
  noApplications: {
    textAlign: 'center',
    padding: tokens.spacingVerticalXXXL,
    color: tokens.colorNeutralForeground3,
  },
  dataGrid: {
    width: '100%',
  },
});

const getStatusBadgeProps = (status: LoanApplication['status']) => {
  switch (status) {
    case 'Pending':
      return { appearance: 'outline' as const, color: 'warning' as const };
    case 'Under Review':
      return { appearance: 'outline' as const, color: 'informative' as const };
    case 'Approved':
      return { appearance: 'filled' as const, color: 'success' as const };
    case 'Rejected':
      return { appearance: 'outline' as const, color: 'danger' as const };
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

export const ApplicationsList = () => {
  const styles = useStyles();
  const { applications } = useLoanContext();

  const columns: TableColumnDefinition<LoanApplication>[] = [
    createTableColumn<LoanApplication>({
      columnId: 'id',
      compare: (a, b) => a.id.localeCompare(b.id),
      renderHeaderCell: () => 'Application ID',
      renderCell: (item) => item.id,
    }),
    createTableColumn<LoanApplication>({
      columnId: 'applicant',
      compare: (a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
      renderHeaderCell: () => 'Applicant',
      renderCell: (item) => `${item.firstName} ${item.lastName}`,
    }),
    createTableColumn<LoanApplication>({
      columnId: 'email',
      compare: (a, b) => a.email.localeCompare(b.email),
      renderHeaderCell: () => 'Email',
      renderCell: (item) => item.email,
    }),
    createTableColumn<LoanApplication>({
      columnId: 'loanAmount',
      compare: (a, b) => a.loanAmount - b.loanAmount,
      renderHeaderCell: () => 'Loan Amount',
      renderCell: (item) => formatCurrency(item.loanAmount),
    }),
    createTableColumn<LoanApplication>({
      columnId: 'loanPurpose',
      compare: (a, b) => a.loanPurpose.localeCompare(b.loanPurpose),
      renderHeaderCell: () => 'Purpose',
      renderCell: (item) => item.loanPurpose,
    }),
    createTableColumn<LoanApplication>({
      columnId: 'loanTerm',
      compare: (a, b) => a.loanTerm - b.loanTerm,
      renderHeaderCell: () => 'Term (months)',
      renderCell: (item) => item.loanTerm.toString(),
    }),
    createTableColumn<LoanApplication>({
      columnId: 'annualIncome',
      compare: (a, b) => a.annualIncome - b.annualIncome,
      renderHeaderCell: () => 'Annual Income',
      renderCell: (item) => formatCurrency(item.annualIncome),
    }),
    createTableColumn<LoanApplication>({
      columnId: 'status',
      compare: (a, b) => a.status.localeCompare(b.status),
      renderHeaderCell: () => 'Status',
      renderCell: (item) => {
        const badgeProps = getStatusBadgeProps(item.status);
        return <Badge {...badgeProps}>{item.status}</Badge>;
      },
    }),
    createTableColumn<LoanApplication>({
      columnId: 'submittedDate',
      compare: (a, b) => new Date(a.submittedDate).getTime() - new Date(b.submittedDate).getTime(),
      renderHeaderCell: () => 'Submitted Date',
      renderCell: (item) => formatDate(item.submittedDate),
    }),
  ];

  if (applications.length === 0) {
    return (
      <div className={styles.container}>
        <Card className={styles.card}>
          <Title3>Loan Applications</Title3>
          <div className={styles.noApplications}>
            <Body1>No loan applications submitted yet.</Body1>
            <Body1>Submit your first application to get started!</Body1>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <Title3>Loan Applications ({applications.length})</Title3>
        <Body1>View and track all submitted loan applications</Body1>
        
        <DataGrid
          items={applications}
          columns={columns}
          sortable
          className={styles.dataGrid}
          resizableColumns
        >
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => (
                <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
              )}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<LoanApplication>>
            {({ item, rowId }) => (
              <DataGridRow<LoanApplication> key={rowId}>
                {({ renderCell }) => (
                  <DataGridCell>{renderCell(item)}</DataGridCell>
                )}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      </Card>
    </div>
  );
};
