import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import DashBoard from './components/DashBoard';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-dark text-white">
        <Routes>
          {/* <Route path="/login" element={<Login />} /> */}
          {/* <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <DashBoard user={JSON.parse(localStorage.getItem('user') || '{}')} />
              </ProtectedRoute>
            }
          /> */}
          <Route path="/" element={<DashBoard/>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;