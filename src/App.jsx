import { Navigate, Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import SendSmsPage from "./pages/SendSmsPage.jsx";
import ApiGatewayPage from "./pages/ApiGatewayPage.jsx";
import ApplicationsPage from "./pages/ApplicationsPage.jsx";

export default function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/" element={<Navigate to="/send" replace />} />
        <Route
          path="/send"
          element={
            <ProtectedRoute>
              <SendSmsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/api-gateway"
          element={
            <ProtectedRoute>
              <ApiGatewayPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/applications"
          element={
            <ProtectedRoute>
              <ApplicationsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/send" replace />} />
      </Routes>
    </>
  );
}
