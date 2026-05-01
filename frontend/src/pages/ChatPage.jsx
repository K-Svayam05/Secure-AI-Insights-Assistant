import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';
import PolicyBadge from '../components/PolicyBadge';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [blockBanner, setBlockBanner] = useState(null);
  const messagesEndRef = useRef(null);

  const suggestedQueries = [
    "Why is Comedy underperforming?",
    "Tell me about Stellar Run's trend",
    "Which city had the highest April 2025 engagement?",
    "Compare Dark Orbit vs Last Kingdom",
    "What are the 9 strategic recommendations from Q1?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    // Auto-send the initial message on first mount
    if (messages.length === 0) {
      handleSend("Hello! Summarise the current platform health in 3 bullet points.", true);
    }
  }, []);

  const handleSend = async (text = null, isInitial = false) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    if (!isInitial) {
      setInput('');
    }

    const newMessages = [...messages, { role: 'user', content: messageText }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await apiClient.post('/api/chat', {
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        session_id: "dashboard-session-1"
      });

      if (res.data.blocked) {
        setBlockBanner(`Request blocked: ${res.data.block_reason} — Policy v3.25`);
        setTimeout(() => setBlockBanner(null), 6000);
      }

      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: res.data.reply, 
          references: res.data.data_references 
        }
      ]);
    } catch (err) {
      console.error("Chat error", err);
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: "⚠ Watch: System error occurred while fetching insights. Please try again or check backend logs." 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageContent = (msg) => {
    if (msg.role === 'user') return <p className="text-sm font-medium">{msg.content}</p>;

    const lines = msg.content.split('\n');
    
    return lines.map((line, idx) => {
      if (!line.trim()) return <div key={idx} className="h-2"></div>;

      let blockType = 'normal';
      let cleanLine = line;

      // Detect special blocks
      if (line.includes('⚠ Watch:')) {
        blockType = 'watch';
        cleanLine = line.replace('⚠ Watch:', '').trim();
      } else if (line.includes('💡 Recommendation:')) {
        blockType = 'recommendation';
        cleanLine = line.replace('💡 Recommendation:', '').trim();
      }

      // Escape HTML entities to prevent XSS during innerHTML injection
      let formattedHtml = cleanLine
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      // Highlight Entity References (Titles, Cities)
      if (msg.references && msg.references.length > 0) {
        // Sort descending by length to prevent partial subset replacements
        const sortedRefs = [...msg.references].sort((a, b) => b.length - a.length);
        sortedRefs.forEach(ref => {
          // Escape regex characters
          const escapedRef = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(${escapedRef})`, 'gi');
          formattedHtml = formattedHtml.replace(regex, '<span class="font-semibold text-purple-600 dark:text-purple-400">$1</span>');
        });
      }

      // Highlight % numbers globally
      formattedHtml = formattedHtml.replace(/(\b\d+(?:\.\d+)?%)/g, '<span class="font-bold text-green-600 dark:text-green-400">$1</span>');

      // Render based on blocktype
      if (blockType === 'watch') {
        return (
          <div key={idx} className="my-2 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700/50 rounded-lg flex items-start shadow-sm">
            <span className="text-yellow-600 dark:text-yellow-500 mr-3 text-lg">⚠</span>
            <p className="text-yellow-900 dark:text-yellow-200 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formattedHtml }} />
          </div>
        );
      } else if (blockType === 'recommendation') {
        return (
          <div key={idx} className="my-2 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50 rounded-lg flex items-start shadow-sm">
            <span className="text-blue-600 dark:text-blue-400 mr-3 text-lg">💡</span>
            <p className="text-blue-900 dark:text-blue-200 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formattedHtml }} />
          </div>
        );
      } else {
        return (
          <p key={idx} className="mb-2 text-sm text-gray-800 dark:text-gray-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: formattedHtml }} />
        );
      }
    });
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden font-sans">
      
      {/* Sidebar - 35% */}
      <div className="w-[35%] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-sm z-10">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center tracking-tight">
            <span className="mr-3 text-2xl">⚡</span> Quick Insights
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
            Tap a query below to instantly run deep analytical searches across the platform's knowledge base and real-time streams.
          </p>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto space-y-3">
          {suggestedQueries.map((query, i) => (
            <button 
              key={i}
              onClick={() => handleSend(query)}
              className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 group shadow-sm"
            >
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-400">
                {query}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Window - 65% */}
      <div className="w-[65%] flex flex-col relative bg-gray-50 dark:bg-gray-900">
        
        {/* Header */}
        <div className="h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">AI Intelligence Core</h3>
          </div>
        </div>

        {/* Block Banner */}
        {blockBanner && (
          <div className="bg-red-500 text-white px-6 py-2.5 text-sm font-medium shadow-md z-20 flex justify-between items-center animate-fade-in absolute top-16 left-0 right-0">
            <div className="flex items-center">
              <span className="mr-2 text-lg">🛡️</span>
              <span>{blockBanner}</span>
            </div>
            <button onClick={() => setBlockBanner(null)} className="hover:text-red-200 bg-red-600/50 rounded-full w-6 h-6 flex items-center justify-center transition-colors">✕</button>
          </div>
        )}

        {/* Messages List Area */}
        <div className="flex-1 p-6 overflow-y-auto scroll-smooth">
          <div className="space-y-6 max-w-4xl mx-auto pb-4">
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  
                  {/* Assistant Avatar */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white mr-3 flex-shrink-0 mt-1 shadow-md font-bold text-xs">
                      AI
                    </div>
                  )}
                  
                  <div className={`max-w-[85%] rounded-2xl p-5 shadow-sm ${
                    isUser 
                      ? 'bg-purple-600 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-tl-none'
                  }`}>
                    {renderMessageContent(msg)}
                  </div>
                  
                  {/* User Avatar */}
                  {isUser && (
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 ml-3 flex-shrink-0 mt-1 font-bold text-xs">
                      U
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white mr-3 flex-shrink-0 mt-1 shadow-md font-bold text-xs">
                  AI
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-none p-5 shadow-sm flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Footer Area */}
        <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
          <div className="max-w-4xl mx-auto relative flex items-center">
            
            {/* Mic Placeholder */}
            <button className="absolute left-4 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <div className="absolute left-12">
              <PolicyBadge />
            </div>
            
            <input
              type="text"
              className="w-full pl-24 pr-16 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm dark:text-gray-100 shadow-inner transition-shadow"
              placeholder="Ask anything about platform performance, risks, or titles..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isLoading}
            />
            
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white w-10 h-10 rounded-full flex items-center justify-center transition-all shadow"
            >
              <svg className="w-4 h-4 translate-x-[-1px] translate-y-[1px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          
          <p className="text-center text-xs text-gray-400 mt-3 font-medium">
            AI Assistant may produce inaccurate information about titles or regions. Verify critical metrics.
          </p>
        </div>
      </div>
    </div>
  );
}
