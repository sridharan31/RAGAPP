import { AppProvider } from './providers/AppProvider';
import MainLayout from './layouts/MainLayout';
import './App.css';

function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <MainLayout />
      </div>
    </AppProvider>
  );
}

export default App;
