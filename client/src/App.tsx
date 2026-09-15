import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import DoctorDetails from './pages/DoctorDetails';
import AdminDashboard from './pages/AdminDashboard';
import CreateDoctor from './pages/CreateDoctor';
import CreateSlot from './pages/CreateSlot';
import Login from './pages/Login';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="doctor/:id" element={<DoctorDetails />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/create-doctor" element={<CreateDoctor />} />
            <Route path="admin/create-slot" element={<CreateSlot />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
