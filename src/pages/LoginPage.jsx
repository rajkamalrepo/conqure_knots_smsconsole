import { useState } from "react";
import { Alert, Button, Card, Container, Form, Spinner } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import cknLogo from "../assets/conqure-knots-logo.png";

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || "/send", { replace: true });
    } catch {
      // error is already surfaced via auth.error
    }
  };

  return (
    <Container fluid className="ckn-auth-shell">
      <Card className="ckn-card ckn-auth-card p-4 bg-white">
        <div className="text-center mb-4">
          <img src={cknLogo} alt="Conqure Knots" className="ckn-brand-logo mb-2" />
          <div className="text-muted small">Sign in to the SMS Console</div>
        </div>

        <Form onSubmit={submit}>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>

          {error ? (
            <Alert variant="danger" className="py-2 small">
              {error}
            </Alert>
          ) : null}

          <Button type="submit" className="ckn-gradient-btn w-100" disabled={loading}>
            {loading ? <Spinner size="sm" animation="border" className="me-2" /> : null}
            Sign in
          </Button>
        </Form>

        <div className="text-center mt-3 small">
          New to Conqure Knots?{" "}
          <Link to="/register" className="ckn-link-accent">
            Create an account
          </Link>
        </div>
      </Card>
    </Container>
  );
}
