import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContacts } from '../context/ContactContext';
import api from '../utils/axios';
import Sidebar from '../components/Sidebar';
import UnifiedInbox from '../components/UnifiedInbox';
import LoadingSpinner from '../components/LoadingSpinner';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const navigate = useNavigate();
  const { updateContacts } = useContacts();

  const [accounts, setAccounts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [activeComponent, setActiveComponent] = useState('messages');
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);

  const socketRef = useRef(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const accRes = await api.get('/accounts');
        console.log('User account state: ', accRes.data.accounts);
        setAccounts(accRes.data.accounts);
        if (accRes.data.accounts.length===0) {
          setLoading(false);
          navigate('/onboarding');
          return;
        }
  
        const msgRes = await api.get('/accounts/inbox');
        setMessages(msgRes.data.messages || []);
  
        const contactRes = await api.get('/accounts/contacts');
        updateContacts(contactRes.data.contacts || {});
  
        socketRef.current = io('http://localhost:3001', {
          path: '/socket.io',
          transports: ['websocket'],
          withCredentials: true
        });
  
        socketRef.current.on('connect', () => {
          console.log('WebSocket connected');
        });
  
        socketRef.current.on('new_message', (newMsg) => {
          setMessages(prev => {
            const updated = [...prev, newMsg].sort((a,b)=>(new Date(b.timestamp)-new Date(a.timestamp)));
            return updated;
          });
        });
  
        socketRef.current.on('disconnect', () => {
          console.log('WebSocket disconnected');
        });
  
      } catch (err) {
        console.error('Error loading data in Dashboard:', err);
        if (err.response?.status === 401) {
          toast.warn('Session expired. Redirecting...');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setTimeout(() => navigate('/login'), 2000);
        } else {
          toast.error('Failed to load data. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };
  
    fetchInitialData();
  }, [navigate, updateContacts]); // If needed, dependencies can be empty. Just ensure it runs on mount.
  
  

  const handleSelectRoom = (id) => {
    setSelectedRoom(id);
    setActiveComponent('messages');
    setPanelOpen(true);
  };

  const handleClosePanel = () => {
    setSelectedRoom(null);
    setActiveComponent('messages');
    setPanelOpen(false);
  };

  const handleGenerateReport = async () => {
    try {
      const res = await api.get('/report/generate');
      toast.info(`AI Summary: ${res.data.summary}`);
    } catch (err) {
      console.error('Generate report error:', err);
      toast.error('Failed to generate report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-dark text-white">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-dark text-white">
      <Sidebar
        accounts={accounts}
        selectedPlatform={selectedPlatform}
        onPlatformChange={setSelectedPlatform}
      />
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4">
          {/* Generate Report Button */}
          <button onClick={handleGenerateReport} className="px-4 py-2 bg-primary text-white rounded">
            Generate Report
          </button>
        </div>
        <UnifiedInbox
          accounts={accounts}
          messages={messages}
          selectedPlatform={selectedPlatform}
          onSelectRoom={handleSelectRoom}
          selectedRoom={selectedRoom}
          activeComponent={activeComponent}
          setActiveComponent={setActiveComponent}
          panelOpen={panelOpen}
          handleClosePanel={handleClosePanel}
        />
      </main>
    </div>
  );
};

export default Dashboard;
