import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import DoctorDetails from './pages/DoctorDetails';
import AdminDashboard from './pages/AdminDashboard';
import CreateDoctor from './pages/CreateDoctor';
import CreateSlot from './pages/CreateSlot';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="doctor/:id" element={<DoctorDetails />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/create-doctor" element={<CreateDoctor />} />
          <Route path="admin/create-slot" element={<CreateSlot />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
