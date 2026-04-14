import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

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
  onFilter: (filtered: Product[]) => void;
}

export default function ChatAI({ products, onFilter }: ChatAIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{text: string, isUser: boolean}>>([
    { text: "Hi! I'm your AI assistant. Ask me about products you'd like to see, like 'show me cat feeders' or 'recommend toys for kittens'.", isUser: false }
  ]);
  const [input, setInput] = useState('');
  const { darkMode } = useTheme();

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = { text: input, isUser: true };
    setMessages(prev => [...prev, userMessage]);

    // Enhanced AI logic - better keyword matching and responses
    const query = input.toLowerCase();
    let response = "I can help you find feeders, toys, food, or budget options. Try asking 'show me cat feeders'!";
    let filteredProducts: Product[] = [];

    // Clear filter if asked
    if (query.includes('all') || query.includes('show all') || query.includes('clear')) {
      filteredProducts = products;
      response = `Showing all ${products.length} products.`;
    }
    // Feeders and food
    else if (query.includes('feeder') || query.includes('food') || query.includes('feed')) {
      filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes('feeder') ||
        p.description.toLowerCase().includes('feed') ||
        p.description.toLowerCase().includes('food')
      );
      response = filteredProducts.length > 0
        ? `Found ${filteredProducts.length} feeder/food products: ${filteredProducts.map(p => p.name).join(', ')}`
        : "No feeder or food products found.";
    }
    // Toys and play
    else if (query.includes('toy') || query.includes('play') || query.includes('fun')) {
      filteredProducts = products.filter(p =>
        p.description.toLowerCase().includes('toy') ||
        p.description.toLowerCase().includes('play') ||
        p.name.toLowerCase().includes('toy')
      );
      response = filteredProducts.length > 0
        ? `Here are ${filteredProducts.length} fun toys: ${filteredProducts.map(p => p.name).join(', ')}`
        : "No toys found.";
    }
    // Budget/cheap
    else if (query.includes('cheap') || query.includes('budget') || query.includes('affordable') || query.includes('low price')) {
      filteredProducts = products.filter(p => p.price < 50).sort((a, b) => a.price - b.price);
      response = filteredProducts.length > 0
        ? `Budget options under $50: ${filteredProducts.map(p => `${p.name} ($${p.price})`).join(', ')}`
        : "No budget products found.";
    }
    // Premium/expensive
    else if (query.includes('expensive') || query.includes('premium') || query.includes('luxury') || query.includes('high end')) {
      filteredProducts = products.filter(p => p.price > 100).sort((a, b) => b.price - a.price);
      response = filteredProducts.length > 0
        ? `Premium products: ${filteredProducts.map(p => `${p.name} ($${p.price})`).join(', ')}`
        : "No premium products found.";
    }
    // Search by name or description
    else {
      filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
      response = filteredProducts.length > 0
        ? `Found ${filteredProducts.length} products matching "${input}": ${filteredProducts.map(p => p.name).join(', ')}`
        : `No products found for "${input}". Try different keywords!`;
    }

    onFilter(filteredProducts.length > 0 ? filteredProducts : null);

    const aiMessage = { text: response, isUser: false };
    setMessages(prev => [...prev, aiMessage]);
    setInput('');
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