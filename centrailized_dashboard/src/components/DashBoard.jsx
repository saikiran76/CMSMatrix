import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatList from './ChatList';
import RoomManager from './roomManager';
import ConversationSummary from './ConversationSummary';
import CustomerDetails from './CustomerDetails';
import MessageViewer from './MessageViewer';
import axios from '../utils/axios';

const Dashboard = ({ user }) => {
  const [selectedView, setSelectedView] = useState('chats');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeComponent, setActiveComponent] = useState('messages');
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setIsLoading(true);
        setError(null);
  
        if (selectedView === 'slack') {
          const response = await axios.get('/slack/channels');
          console.log('Slack channels in frontend:', response.data);
          setRooms(response.data); // This sets the rooms state to the list of Slack channels
        } else if (selectedView === 'chats') {
          const response = await axios.get('/rooms');
          setRooms(response.data); // matrix rooms
        }
      } catch (error) {
        console.error('Dashboard initialization failed:', error);
        setError(error.message || 'Failed to initialize dashboard');
      } finally {
        setIsLoading(false);
      }
    };
  
    initializeDashboard();
  }, [selectedView]);
  


  // Define renderRoomContent function
  // const renderRoomContent = () => {
  //   if (!selectedRoom) return null;

  //   switch (activeComponent) {
  //     case 'messages':
  //       return <MessageViewer roomId={selectedRoom} />;
  //     case 'summary':
  //       return <ConversationSummary roomId={selectedRoom} />;
  //     case 'details':
  //       return <CustomerDetails roomId={selectedRoom} />;
  //     default:
  //       return null;
  //   }
  // };
  const renderRoomContent = () => {
    if (!selectedRoom) return null;
  
    switch (activeComponent) {
      case 'messages':
        return <MessageViewer roomId={selectedRoom} selectedView={selectedView} />;
      case 'summary':
        return <ConversationSummary roomId={selectedRoom} selectedView={selectedView} />;
      case 'details':
        return selectedView === 'slack'
        ? <div>No customer details for Slack channels</div>
        : <CustomerDetails roomId={selectedRoom} selectedView={selectedView} />;
      default:
        return null;
    }
  };
  

  // Define renderMainContent function
  const renderMainContent = () => {
    if (selectedView === 'chats') {
      return (
        <div className="flex h-full">
          {/* Left Panel - Chat List */}
          <div className={`${selectedRoom ? 'w-1/3' : 'w-full'} border-r border-dark-lighter`}>
            {/* <ChatList 
              onSelectRoom={(roomId) => {
                setSelectedRoom(roomId);
                setActiveComponent('messages');
              }}
              selectedRoom={selectedRoom}
              rooms={rooms}
            /> */}
            <ChatList
              rooms={rooms}
              selectedRoom={selectedRoom}
              selectedView={selectedView}
              onSelectRoom={(id) => {
                setSelectedRoom(id);
                setActiveComponent('messages');
              }}
            />


          </div>

          {/* Right Panel - Room Details */}
          {selectedRoom && (
            <div className="w-2/3 flex flex-col">
              {/* Tab Navigation */}
              <div className="flex border-b border-dark-lighter">
                <button
                  onClick={() => setActiveComponent('messages')}
                  className={`px-6 py-3 text-sm font-medium ${activeComponent === 'messages'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-gray-400 hover:text-white'
                    }`}
                >
                  Messages
                </button>
                <button
                  onClick={() => setActiveComponent('summary')}
                  className={`px-6 py-3 text-sm font-medium ${activeComponent === 'summary'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-gray-400 hover:text-white'
                    }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setActiveComponent('details')}
                  className={`px-6 py-3 text-sm font-medium ${activeComponent === 'details'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-gray-400 hover:text-white'
                    }`}
                >
                  Customer Details
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-auto p-6">
                {renderRoomContent()}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (selectedView === 'discovery') {
      return (
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Technology Stack</h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="card">
              <h3 className="text-lg font-medium mb-2">MongoDB Database</h3>
              <p className="text-gray-400">Connected and Active</p>
            </div>
            <div className="card">
              <h3 className="text-lg font-medium mb-2">Matrix Protocol</h3>
              <p className="text-gray-400">Secure Communication</p>
            </div>
            <div className="card">
              <h3 className="text-lg font-medium mb-2">Node.js Backend</h3>
              <p className="text-gray-400">High Performance</p>
            </div>
          </div>
        </div>
      );
    }

    if (selectedView === 'slack') {
      // Similar logic for Slack channels
      return (
        <div className="flex h-full">
          <div className={`${selectedRoom ? 'w-1/3' : 'w-full'} border-r border-dark-lighter`}>
            <ChatList
              onSelectRoom={(roomId) => {
                setSelectedRoom(roomId);
                setActiveComponent('messages');
              }}
              selectedRoom={selectedRoom}
              rooms={rooms} // This is Slack channels now
              selectedView={selectedView}
            />
          </div>
          {selectedRoom && (
            <div className="w-2/3 flex flex-col">
              {/* Tab Navigation for Slack */}
              <div className="flex border-b border-dark-lighter">
                <button
                  onClick={() => setActiveComponent('messages')}
                  className={activeComponent === 'messages' ? 'text-primary' : 'text-gray-400'}
                >
                  Messages
                </button>
                <button
                  onClick={() => setActiveComponent('summary')}
                  className={activeComponent === 'summary' ? 'text-primary' : 'text-gray-400'}
                >
                  Summary
                </button>
                {/* Skip details tab for Slack if you have no equivalent */}
              </div>
  
              <div className="flex-1 overflow-auto p-6">
                {renderRoomContent()}
              </div>
            </div>
          )}
        </div>
      );
    }
  
    

    return null;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        selectedView={selectedView}
        onViewChange={(view) => {
          setSelectedView(view);
          setSelectedRoom(null);
          setActiveComponent('messages');
        }}
        user={user}
      />
      <main className="flex-1 overflow-hidden bg-dark">
        <div className="h-full flex flex-col">
          <header className="bg-dark-lighter px-6 py-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold">
              {selectedRoom
                ? `Room ${selectedRoom} - ${activeComponent.charAt(0).toUpperCase() + activeComponent.slice(1)}`
                : selectedView.charAt(0).toUpperCase() + selectedView.slice(1)
              }
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-400">{user?.email}</span>
            </div>
          </header>
          <div className="flex-1 overflow-auto">
            {renderMainContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;