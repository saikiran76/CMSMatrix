// frontend/src/pages/PlatformSelection.jsx
import React, { useEffect, useState } from 'react';
import api from '../utils/axios';
import { useNavigate } from 'react-router-dom';

const PlatformSelection = () => {
  const [platforms, setPlatforms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/platforms').then(res => setPlatforms(res.data.platforms));
  }, []);

  const handleSelect = (p) => {
    navigate(`/connect/${p.id}`);
  };

  return (
    <div className="p-6 text-white bg-dark min-h-screen">
      <h1 className="text-xl font-semibold mb-4">Add an account to get started</h1>
      <div className="grid grid-cols-4 gap-4">
        {platforms.map(p => (
          <div key={p.id} className="text-center p-4 bg-dark-lighter rounded cursor-pointer hover:bg-primary/20"
               onClick={() => handleSelect(p)}>
            <img src={p.icon} alt={p.name} className="mx-auto mb-2 h-8 w-8" />
            <span>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlatformSelection;
