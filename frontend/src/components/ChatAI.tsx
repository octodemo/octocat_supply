import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';

interface Product {
  productId: number;
  name: string;
  description: string;
  price: number;
  imgName: string;
  sku: string;
  unit: string;
  supplierId: number;
  discount?: number;
}

interface ChatAIProps {
  products: Product[];
}

export default function ChatAI({ products }: ChatAIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{text: string, isUser: boolean}>>([
    { text: "Hi! I'm your AI assistant. Ask me about products you'd like to see, like 'show me cat feeders' or 'recommend toys for kittens'.", isUser: false }
  ]);
  const [input, setInput] = useState('');
  const { darkMode } = useTheme();

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { text: input, isUser: true };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await axios.post('/api/chat', {
        message: input,
        products: products
      });

      const aiResponse = response.data.response;
      const aiMessage = { text: aiResponse, isUser: false };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = { text: 'Sorry, I\'m having trouble connecting. Please try again.', isUser: false };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full shadow-lg transition-colors ${
          darkMode ? 'bg-primary text-light hover:bg-accent' : 'bg-primary text-white hover:bg-accent'
        }`}
        aria-label="Open AI Chat"
      >
        <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className={`w-full max-w-md mx-4 rounded-lg shadow-xl ${
            darkMode ? 'bg-dark' : 'bg-white'
          }`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b ${
              darkMode ? 'border-gray-600' : 'border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-light' : 'text-gray-800'}`}>
                AI Product Assistant
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className={`p-1 rounded-full hover:bg-gray-200 ${
                  darkMode ? 'hover:bg-gray-700' : ''
                }`}
                aria-label="Close chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="h-80 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-lg ${
                    message.isUser
                      ? 'bg-primary text-white'
                      : darkMode ? 'bg-gray-700 text-light' : 'bg-gray-200 text-gray-800'
                  }`}>
                    {message.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className={`p-4 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about products..."
                  className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-light placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-800'
                  }`}
                />
                <button
                  onClick={handleSend}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-accent transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}