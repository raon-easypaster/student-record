import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ActiveSemesterProvider } from './context/ActiveSemesterContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Pricing } from './pages/Pricing';
import { PaymentSuccess } from './pages/PaymentSuccess';
import { PaymentFail } from './pages/PaymentFail';
import { Dashboard } from './pages/Dashboard';
import { Academic } from './pages/Academic';
import { Activities } from './pages/Activities';
import { Growth } from './pages/Growth';
import { Goals } from './pages/Goals';
import { University } from './pages/University';
import { Library } from './pages/Library';
import { ShareView } from './pages/ShareView';

const App: React.FC = () => {
  return (
    <ActiveSemesterProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth Route */}
          <Route path="/login" element={<Login />} />
          
          {/* Payment Routes */}
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/fail" element={<PaymentFail />} />

          {/* Anonymized Counseling Shared Link */}
          <Route path="/share/:token" element={<ShareView />} />

          {/* Core App Layout and Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="academic" element={<Academic />} />
            <Route path="activities" element={<Activities />} />
            <Route path="growth" element={<Growth />} />
            <Route path="goals" element={<Goals />} />
            <Route path="university" element={<University />} />
            <Route path="library" element={<Library />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ActiveSemesterProvider>
  );
};

export default App;
