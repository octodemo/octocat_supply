import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';

export default function Checkout() {
  const { state, clearCart } = useCart();
  const { darkMode } = useTheme();
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    zipCode: '',
  });
  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
  });
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');

  const totalPrice = state.items.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );

  const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShippingInfo({ ...shippingInfo, [e.target.name]: e.target.value });
  };

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentInfo({ ...paymentInfo, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Dummy checkout - just simulate success
    const newOrderId = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    setOrderId(newOrderId);
    setOrderPlaced(true);
    clearCart();
  };

  if (state.items.length === 0 && !orderPlaced) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className={`text-3xl font-bold mb-8 ${darkMode ? 'text-light' : 'text-gray-800'}`}>
          Checkout
        </h1>
        <p className={`${darkMode ? 'text-light' : 'text-gray-600'}`}>
          Your cart is empty. Add some products before checking out.
        </p>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className={`max-w-2xl mx-auto p-8 rounded-lg border ${
          darkMode ? 'bg-dark border-gray-600' : 'bg-white border-gray-200'
        } shadow-sm`}>
          <div className="text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-light' : 'text-gray-800'}`}>
              Order Confirmed!
            </h1>
            <p className={`text-lg mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Thank you for your order. Your order ID is <strong>{orderId}</strong>.
            </p>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              You will receive a confirmation email shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className={`text-3xl font-bold mb-8 ${darkMode ? 'text-light' : 'text-gray-800'}`}>
        Checkout
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div className={`p-6 rounded-lg border ${
          darkMode ? 'bg-dark border-gray-600' : 'bg-white border-gray-200'
        } shadow-sm`}>
          <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-light' : 'text-gray-800'}`}>
            Order Summary
          </h2>
          <div className="space-y-4">
            {state.items.map((item) => (
              <div key={item.product.productId} className="flex justify-between">
                <div>
                  <p className={`font-medium ${darkMode ? 'text-light' : 'text-gray-800'}`}>
                    {item.product.name}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Quantity: {item.quantity}
                  </p>
                </div>
                <p className={`font-medium ${darkMode ? 'text-light' : 'text-gray-800'}`}>
                  ${(item.product.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
          <div className={`border-t mt-4 pt-4 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
            <div className="flex justify-between text-lg font-bold">
              <span className={darkMode ? 'text-light' : 'text-gray-800'}>Total:</span>
              <span className="text-primary">${totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Checkout Form */}
        <div className={`p-6 rounded-lg border ${
          darkMode ? 'bg-dark border-gray-600' : 'bg-white border-gray-200'
        } shadow-sm`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-light' : 'text-gray-800'}`}>
                Shipping Information
              </h3>
              <div className="space-y-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={shippingInfo.name}
                  onChange={handleShippingChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-light placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-800'
                  } focus:border-primary focus:ring-1 focus:ring-primary`}
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={shippingInfo.email}
                  onChange={handleShippingChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-light placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-800'
                  } focus:border-primary focus:ring-1 focus:ring-primary`}
                />
                <input
                  type="text"
                  name="address"
                  placeholder="Address"
                  value={shippingInfo.address}
                  onChange={handleShippingChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-light placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-800'
                  } focus:border-primary focus:ring-1 focus:ring-primary`}
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="city"
                    placeholder="City"
                    value={shippingInfo.city}
                    onChange={handleShippingChange}
                    required
                    className={`px-3 py-2 border rounded-md ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-light placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-800'
                    } focus:border-primary focus:ring-1 focus:ring-primary`}
                  />
                  <input
                    type="text"
                    name="zipCode"
                    placeholder="ZIP Code"
                    value={shippingInfo.zipCode}
                    onChange={handleShippingChange}
                    required
                    className={`px-3 py-2 border rounded-md ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-light placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-800'
                    } focus:border-primary focus:ring-1 focus:ring-primary`}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-light' : 'text-gray-800'}`}>
                Payment Information (Dummy)
              </h3>
              <div className="space-y-4">
                <input
                  type="text"
                  name="cardNumber"
                  placeholder="Card Number (e.g., 1234 5678 9012 3456)"
                  value={paymentInfo.cardNumber}
                  onChange={handlePaymentChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-light placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-800'
                  } focus:border-primary focus:ring-1 focus:ring-primary`}
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="expiryDate"
                    placeholder="MM/YY"
                    value={paymentInfo.expiryDate}
                    onChange={handlePaymentChange}
                    required
                    className={`px-3 py-2 border rounded-md ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-light placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-800'
                    } focus:border-primary focus:ring-1 focus:ring-primary`}
                  />
                  <input
                    type="text"
                    name="cvv"
                    placeholder="CVV"
                    value={paymentInfo.cvv}
                    onChange={handlePaymentChange}
                    required
                    className={`px-3 py-2 border rounded-md ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-light placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-800'
                    } focus:border-primary focus:ring-1 focus:ring-primary`}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-accent text-white py-3 px-4 rounded-md font-medium transition-colors"
            >
              Place Order
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}