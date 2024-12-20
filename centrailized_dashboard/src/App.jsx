import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Onboarding from './pages/Onboarding.jsx';
import ConnectPlatform from './pages/ConnectPlatform.jsx';
import DashBoard from './components/DashBoard.jsx'
import { ContactProvider } from './context/ContactContext';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const App = () => {
  return (
    <ContactProvider>

    <Router>
       <ToastContainer position="top-right" autoClose={5000} />
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/connect/:platform" element={<ConnectPlatform />} />
        <Route path="/dashboard" element={<DashBoard />} />
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>

    </ContactProvider>
  );
};

export default App;
