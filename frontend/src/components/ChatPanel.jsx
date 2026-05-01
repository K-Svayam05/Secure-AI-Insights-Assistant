import React, { useState } from 'react';

const ChatPanel = () => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    // Implement chat send logic here
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow border border-gray-200 p-4">
      <div className="flex-1 overflow-y-auto mb-4">
        {/* Chat messages will go here */}
        <p className="text-gray-500 text-center mt-10">Start a conversation...</p>
      </div>
      <div className="flex">
        <input
          type="text"
          className="flex-1 border border-gray-300 rounded-l-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ask a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
