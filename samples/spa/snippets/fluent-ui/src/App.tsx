import { useState } from 'react';
import {
  makeStyles,
  FluentProvider,
  webLightTheme,
  tokens,
  TabList,
  Tab,
  SelectTabEvent,
  SelectTabData,
} from '@fluentui/react-components';
import { LoanProvider } from './context/LoanContext';
import { LoanApplicationForm } from './components/LoanApplicationForm';
import { ApplicationsList } from './components/ApplicationsList';

const useStyles = makeStyles({
  root: {
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  header: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    padding: tokens.spacingVerticalXL,
    boxShadow: tokens.shadow8,
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
  },
  title: {
    fontSize: tokens.fontSizeHero800,
    fontWeight: tokens.fontWeightSemibold,
    margin: 0,
  },
  subtitle: {
    fontSize: tokens.fontSizeBase300,
    marginTop: tokens.spacingVerticalS,
    opacity: 0.9,
  },
  nav: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: `0 ${tokens.spacingHorizontalXXL}`,
    display: 'flex',
    justifyContent: 'center',
  },
  navContent: {
    maxWidth: '1400px',
    width: '100%',
  },
});

type TabValue = 'apply' | 'applications';

function App() {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState<TabValue>('apply');

  const onTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setSelectedTab(data.value as TabValue);
  };

  return (
    <FluentProvider theme={webLightTheme}>
      <LoanProvider>
        <div className={styles.root}>
          <header className={styles.header}>
            <div className={styles.headerContent}>
              <h1 className={styles.title}>Bank Loan Application Portal</h1>
              <p className={styles.subtitle}>
                Apply for a loan or view your existing applications
              </p>
            </div>
          </header>

          <nav className={styles.nav}>
            <div className={styles.navContent}>
              <TabList selectedValue={selectedTab} onTabSelect={onTabSelect} size="large">
                <Tab value="apply">Apply for Loan</Tab>
                <Tab value="applications">View Applications</Tab>
              </TabList>
            </div>
          </nav>

          <main>
            {selectedTab === 'apply' && <LoanApplicationForm />}
            {selectedTab === 'applications' && <ApplicationsList />}
          </main>
        </div>
      </LoanProvider>
    </FluentProvider>
  );
}

export default App;
