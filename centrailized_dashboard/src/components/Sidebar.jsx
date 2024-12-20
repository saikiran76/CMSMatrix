import React from 'react';
import { FiMessageSquare, FiCompass, FiSettings, FiLogOut } from 'react-icons/fi';

// const Sidebar = ({ selectedView, onViewChange }) => {
//   return (
//     <div className="w-64 bg-dark-darker flex flex-col h-full">
//       <div className="p-6">
//         <div className="flex items-center gap-2">
//           <img className="h-8 w-8 rounded-full" src="https://www.shutterstock.com/image-vector/support-icon-can-be-used-600nw-1887496465.jpg" alt="Akazumi" />
//           <span className="text-xl font-semibold text-white">Centralized CMS</span>
//         </div>
//       </div>

//       {/* Navigation Menu */}
//       <nav className="flex-1 px-4 space-y-2">
//         <button
//           onClick={() => onViewChange('chats')}
//           className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${selectedView === 'chats'
//               ? 'bg-primary text-white'
//               : 'text-gray-400 hover:bg-dark-lighter hover:text-white'
//             }`}
//         >
//           {/* <FiMessageSquare className="text-xl" /> */}
//           <img className='size-6' src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRL8rBb0QC69ZLvNqWCbY6fW3FUkpJBdQckyg&s" alt="slack"/>
          
//           <span>Matrix Client</span>
//         </button>

//         <button
//           onClick={() => onViewChange('slack')}
//           className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${selectedView === 'slack'
//               ? 'bg-primary text-white'
//               : 'text-gray-400 hover:bg-dark-lighter hover:text-white'
//             }`}
//         >
//           {/* <FiMessageSquare className="text-xl" /> */}
//           <img className='size-6' src="https://static-00.iconduck.com/assets.00/slack-icon-2048x2048-5nfqoyso.png" alt="slack"/>
//           <span>Slack</span>
//         </button>

//         <button
//           // onClick={() => onViewChange('slack')}
//           className='w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors'
//         >
//           {/* <FiMessageSquare className="text-xl" /> */}
//           {/* <img className='size-6' src="https://static-00.iconduck.com/assets.00/slack-icon-2048x2048-5nfqoyso.png" alt="slack"/> */}
//           <span>More can be added</span>
//         </button>



//         <button
//           onClick={() => onViewChange('discovery')}
//           className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${selectedView === 'discovery'
//               ? 'bg-primary text-white'
//               : 'text-gray-400 hover:bg-dark-lighter hover:text-white'
//             }`}
//         >
//           <FiCompass className="text-xl" />
//           <span>Discovery</span>
//         </button>
//       </nav>

//       {/* Settings & Logout */}
//       <div className="p-4 border-t border-dark-lighter space-y-2">
//         <button
//           onClick={() => onViewChange('settings')}
//           className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-dark-lighter hover:text-white rounded-lg transition-colors"
//         >
//           <FiSettings className="text-xl" />
//           <span>Settings</span>
//         </button>

//         <button
//           onClick={() => {
//             // localStorage.removeItem('token');
//             // window.location.reload();
//             alert("login layer is removed currently")
//           }}
//           className="w-full flex items-center gap-3 px-4 py-3 text-error hover:bg-dark-lighter rounded-lg transition-colors"
//         >
//           <FiLogOut className="text-xl" />
//           <span>Logout</span>
//         </button>
//       </div>
//     </div>
//   );
// };

const Sidebar = ({ accounts, selectedPlatform, onPlatformChange, onAddAccount }) => {
  return (
    <div className="w-64 bg-dark-darker flex flex-col h-full">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <img className="h-8 w-8 rounded-full" src="/icons/user.png" alt="User" />
          <span className="text-xl font-semibold text-white">Centralized CMS</span>
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        <button
          onClick={() => onPlatformChange(null)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${selectedPlatform === null ? 'bg-primary text-white' : 'text-gray-400 hover:bg-dark-lighter hover:text-white'}`}>
          <span>Unified Inbox</span>
        </button>
        {accounts.map(account => (
          <button
            key={account._id}
            onClick={() => onPlatformChange(account.platform)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${selectedPlatform === account.platform ? 'bg-primary text-white' : 'text-gray-400 hover:bg-dark-lighter hover:text-white'}`}>
            <span>{account.platform.charAt(0).toUpperCase() + account.platform.slice(1)}</span>
          </button>
        ))}
        <button
          onClick={onAddAccount}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-dark-lighter hover:text-white rounded-lg"
        >
          <span>Add Account</span>
        </button>
      </nav>
      <div className="p-4 border-t border-dark-lighter space-y-2">
        <button onClick={() => { alert("Logout not implemented"); }} className="w-full flex items-center gap-3 px-4 py-3 text-error hover:bg-dark-lighter rounded-lg">
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};


export default Sidebar;