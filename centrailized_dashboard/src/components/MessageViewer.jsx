import React, { useState, useEffect, useRef } from 'react';
import axios from '../utils/axios';
import PriorityFilter from './PriorityFilter';
import ResponseSuggestions from './ResponseSuggestions';

const MessageViewer = ({ roomId, selectedView }) => {
  const [messages, setMessages] = useState([]);
  const [selectedPriorities, setSelectedPriorities] = useState(['high', 'medium', 'low']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messageInput, setMessageInput] = useState('');

  const [selectedPriority, setSelectedPriority] = useState('medium');


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setLoading(true);
  };

  const handlePriorityChange = (priority) => {
    setSelectedPriorities(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const filteredMessages = messages.filter(message =>
    selectedPriorities.includes(message.priority)
  );

  const handleMessageClick = (message) => {
    setSelectedMessage(message);
  };

  const handleSendMessage = async (content) => {
    if (!content.trim()) return;
    try {
      const sendEndpoint = selectedView === 'slack'
        ? `/slack/channels/${encodeURIComponent(roomId)}/messages`
        : `/rooms/${encodeURIComponent(roomId)}/messages`;

      // Use selectedPriority chosen by the user
      const response = await axios.post(sendEndpoint, {
        content,
        priority: selectedPriority
      });

      setMessages(prev => [...prev, response.data]);
      setMessageInput('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };


  const handleSuggestionSelect = async (suggestion) => {
    await handleSendMessage(suggestion);
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        setError(null);

        const endpoint = selectedView === 'slack'
          ? `/slack/channels/${encodeURIComponent(roomId)}/messages?limit=50`
          : `/rooms/${encodeURIComponent(roomId)}/messages?limit=50`;

        const response = await axios.get(endpoint, {
          timeout: 10000, // 10 second timeout
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
  }, [roomId, retryCount, selectedView]);

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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-red-500';
      case 'medium':
        return 'border-yellow-500';
      default:
        return 'border-gray-700';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PriorityFilter
        selectedPriorities={selectedPriorities}
        onPriorityChange={handlePriorityChange}
      />
      <div className="p-2 flex items-center gap-2">
        <span className="text-gray-300">Send as:</span>
        {['high', 'medium', 'low'].map(p => (
          <button
            key={p}
            onClick={() => setSelectedPriority(p)}
            className={p === selectedPriority ? 'bg-primary text-white px-3 py-1 rounded' : 'bg-gray-700 text-gray-300 px-3 py-1 rounded'}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredMessages.map((message) => (
          <div
            key={message.id}
            onClick={() => handleMessageClick(message)}
            className="cursor-pointer hover:opacity-90"
          >
            <div
              className={`flex ${message.sender === localStorage.getItem('userId')
                  ? 'justify-end'
                  : 'justify-start'
                }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 border-l-4 ${getPriorityColor(message.priority)
                  } ${message.sender === localStorage.getItem('userId')
                    ? 'bg-primary text-white'
                    : 'bg-gray-700 text-white'
                  }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-300">{message.senderName}</span>
                  <span className={`text-xs px-2 py-1 rounded-full bg-opacity-20 ${message.priority === 'high' ? 'bg-red-500 text-red-200' :
                      message.priority === 'medium' ? 'bg-yellow-500 text-yellow-200' :
                        'bg-gray-500 text-gray-200'
                    }`}>
                    {message.priority}
                  </span>
                </div>
                <div className="break-words">{message.content}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {selectedMessage && (
        selectedMessage.content.includes('Unable to decrypt')
          ? <p className="p-2 text-gray-400">No suggestions for encrypted messages.</p>
          : <ResponseSuggestions message={selectedMessage.content} onSelectSuggestion={handleSuggestionSelect} />
      )}

      <div className="border-t border-dark-lighter p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(messageInput)}
            className="flex-1 bg-dark-lighter rounded px-4 py-2 text-white"
            placeholder="Type a message..."
          />
          <button
            onClick={() => handleSendMessage(messageInput)}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageViewer;