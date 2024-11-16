import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import axios from '../utils/axios';
import { FiRefreshCw } from 'react-icons/fi';

const ChatList = ({ onSelectRoom }) => {
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/rooms');
      setChats(response.data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      setError('Failed to load rooms');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-error mb-4">{error}</div>
        <button onClick={fetchRooms} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Active Rooms</h2>
        <button 
          onClick={fetchRooms}
          className="btn-primary flex items-center gap-2"
        >
          <FiRefreshCw className="text-lg" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-lighter">
              <th className="text-left py-4 px-6 text-gray-400 font-medium">Room</th>
              <th className="text-left py-4 px-6 text-gray-400 font-medium">Last Message</th>
              <th className="text-left py-4 px-6 text-gray-400 font-medium">Status</th>
              <th className="text-left py-4 px-6 text-gray-400 font-medium">Assignee</th>
              <th className="text-left py-4 px-6 text-gray-400 font-medium">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {chats.map(chat => (
              <tr 
                key={chat.id}
                onClick={() => onSelectRoom(chat.id)}
                className="border-b border-dark-lighter hover:bg-dark-lighter cursor-pointer transition-colors"
              >
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${chat.isActive ? 'bg-success' : 'bg-error'}`} />
                    <span>{chat.name}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-gray-400">{chat.lastMessage}</td>
                <td className="py-4 px-6">
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    chat.status === 'active' ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
                  }`}>
                    {chat.status}
                  </span>
                </td>
                <td className="py-4 px-6 text-gray-400">{chat.assignee}</td>
                <td className="py-4 px-6 text-gray-400">
                  {format(new Date(chat.lastActive), 'MMM dd, HH:mm')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChatList;