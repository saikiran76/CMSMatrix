import React, { useState, useEffect, useRef } from 'react';
import axios from '../utils/axios';

const MessageViewer = ({ roomId }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setLoading(true);
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(`/rooms/${encodeURIComponent(roomId)}/messages`, {
          timeout: 10000, // 10 second timeout
          retries: 3,
          retryDelay: 1000
        });

        if (response.data.messages && Array.isArray(response.data.messages)) {
          setMessages(response.data.messages);
          setTimeout(scrollToBottom, 100);
        } else {
          throw new Error('Invalid messages format received');
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        const errorMessage = error.code === 'ERR_NETWORK' 
          ? 'Unable to connect to server. Please check your connection and try again.'
          : error.response?.data?.error || 'Failed to load messages';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (roomId) {
      fetchMessages();
    }
  }, [roomId, retryCount]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-error text-center">
          <p className="mb-4">{error}</p>
          <button 
            onClick={handleRetry}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === localStorage.getItem('userId')
                ? 'justify-end'
                : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.sender === localStorage.getItem('userId')
                  ? 'bg-primary text-white'
                  : 'bg-gray-700 text-white'
              }`}
            >
              <div className="text-sm text-gray-300 mb-1">
                {message.senderName}
              </div>
              <div className="break-words">{message.content}</div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageViewer;