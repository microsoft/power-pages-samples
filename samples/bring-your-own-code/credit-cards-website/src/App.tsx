import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import Home from './pages/Home';
import CardComparison from './pages/CardComparison';
import Application from './pages/Application';
import ApplicationStatus from './pages/ApplicationStatus';
import Applications from './pages/Applications';
import FAQs from './pages/FAQs';
import Contact from './pages/Contact';
import EligibilityCheck from './pages/EligibilityCheck';
import Header from './components/Header';
import Footer from './components/Footer';

const App: React.FC = () => {
  return (<Router>
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={ <Home /> } />
          <Route path="/comparison" element={ <CardComparison /> } />          <Route path="/application" element={ <Application /> } />
          <Route path="/application-status" element={ <ApplicationStatus /> } />
          <Route path="/applications" element={ <Applications /> } />
          <Route path="/eligibility-check" element={ <EligibilityCheck /> } />
          <Route path="/faqs" element={ <FAQs /> } />
          <Route path="/contact" element={ <Contact /> } />
        </Routes>
      </main>
      <Footer />
      <Toaster position="top-right" richColors closeButton />
    </div>
  </Router>
  );
};

export default App;
