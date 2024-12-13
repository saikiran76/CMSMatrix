import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import axios from '../utils/axios';
import { FiRefreshCw } from 'react-icons/fi';

const ChatList = ({ rooms, onSelectRoom, selectedView }) => {
  // No internal fetching, just use the passed-in rooms
  console.log('Rooms in ChatList:', rooms);

  if (!rooms || rooms.length === 0) {
    return (
      <div className="p-6 text-center text-gray-400">
        {selectedView === 'slack' ? 'No Slack channels found.' : 'No rooms found.'}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          {selectedView === 'slack' ? 'Slack Channels' : 'Active Rooms'}
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-lighter">
              <th className="text-left py-4 px-6 text-gray-400 font-medium">Channel/Room</th>
              <th className="text-left py-4 px-6 text-gray-400 font-medium">Members</th>
              <th className="text-left py-4 px-6 text-gray-400 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map(chat => (
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
                <td className="py-4 px-6 text-gray-400">{chat.memberCount}</td>
                <td className="py-4 px-6 text-gray-400">
  {chat.created instanceof Date ? chat.created.toLocaleString() : 'No date'}
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
