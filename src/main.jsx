import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import './App.css';
import './styles/layout.css';
import './styles/auth.css';
import Dashboard from './pages/Dashboard.jsx';
import NewLecture from './pages/NewLecture.jsx';
import MyLectures from './pages/MyLectures.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/SignUp.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Landing from './pages/Landing.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/new" element={<ProtectedRoute><NewLecture /></ProtectedRoute>} />
        <Route path="/lectures" element={<ProtectedRoute><MyLectures /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
