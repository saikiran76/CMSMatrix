import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';

const Onboarding = () => {
  const [platforms, setPlatforms] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        const res = await api.get('/platforms');
        setPlatforms(res.data.platforms);
      } catch (err) {
        console.error('Error fetching platforms:', err);
        setError('Failed to load platforms. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchPlatforms();
  }, []);

  const handleSelect = (platform) => {
    // Navigate to the connect page for the selected platform
    // ConnectPlatform.jsx handles the actual initiation and feedback
    navigate(`/connect/${platform}`);
  };

  if (loading) {
    return (
      <div className="p-12 text-white bg-dark min-h-screen">
        <h2 className='font-bold text-2xl'>Connect a Platform</h2>
        <h1 className="text-xl font-semibold mb-4 mt-3">Loading platforms...</h1>
        <div className="loader">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-white bg-dark min-h-screen">
        <h2 className='font-bold text-2xl'>Connect a Platform</h2>
        <h1 className="text-xl font-semibold mb-4 mt-3 text-red-500">{error}</h1>
      </div>
    );
  }

  if (platforms.length === 0) {
    return (
      <div className="p-12 text-white bg-dark min-h-screen">
        <h2 className='font-bold text-2xl'>Connect a Platform</h2>
        <h1 className="text-xl font-semibold mb-4 mt-3">No platforms available at the moment.</h1>
      </div>
    );
  }

  return (
    <div className="p-12 text-white bg-dark min-h-screen">
      <h2 className='font-bold text-2xl'>Connect a Platform</h2>
      <h1 className="text-xl font-semibold mb-4 mt-3">Add an account to get started</h1>
      <div className="grid grid-cols-4 gap-4 mt-7">
        {platforms.map(p => (
          <button 
            key={p.id} 
            className="text-center p-4 bg-dark-lighter rounded cursor-pointer hover:bg-primary/20 transition-colors"
            onClick={() => handleSelect(p.id)}
          >
            <img src={p.icon} alt={p.name} className="mx-auto mb-2 h-8 w-8" />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Onboarding;
