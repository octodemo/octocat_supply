import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CopilotKit } from '@copilotkit/react-core';
import { CopilotPopup } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';
import Navigation from './components/Navigation';
import Welcome from './components/Welcome';
import About from './components/About';
import Footer from './components/Footer';
import Products from './components/entity/product/Products';
import Login from './components/Login';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AdminProducts from './components/admin/AdminProducts';
import { useTheme } from './context/ThemeContext';
import { COPILOT_RUNTIME_URL } from './api/config';
import CopilotActions from './components/copilot/CopilotActions';

// Wrapper component to apply theme classes
function ThemedApp() {
  const { darkMode } = useTheme();

  return (
    <Router>
      <div
        className={`flex flex-col min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} transition-colors duration-300`}
      >
        <Navigation />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/about" element={<About />} />
            <Route path="/products" element={<Products />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/products" element={<AdminProducts />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

function App() {
  return (
    <CopilotKit runtimeUrl={COPILOT_RUNTIME_URL}>
      <AuthProvider>
        <ThemeProvider>
          <ThemedApp />
        </ThemeProvider>
      </AuthProvider>
      <CopilotActions />
      <CopilotPopup
        labels={{
          title: 'OctoCAT Assistant',
          initial: "Hi! I'm your OctoCAT Supply assistant 🐱 Ask me to show product prices, compare suppliers, find deals, or track orders — I'll show you interactive visuals right here in chat!",
        }}
        defaultOpen={false}
      />
    </CopilotKit>
  );
}

export default App;
