import { useState } from "react";
import { Alert, Button, Card, Container, Form, Spinner } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import cknLogo from "../assets/conqure-knots-logo.png";

export default function RegisterPage() {
  const { register, loading, error } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    if (password !== confirmPassword) {
      setLocalError("Passwords don't match.");
      return;
    }
    try {
      // This creates a new tenant (your company/workspace) and your first admin
      // user under it in one step — architecture doc §11's onboarding flow,
      // simplified for this console.
      await register({ companyName, email, password });
      navigate("/send", { replace: true });
    } catch {
      // error is already surfaced via auth.error
    }
  };

  return (
    <Container fluid className="ckn-auth-shell">
      <Card className="ckn-card ckn-auth-card p-4 bg-white">
        <div className="text-center mb-4">
          <img src={cknLogo} alt="Conqure Knots" className="ckn-brand-logo mb-2" />
          <div className="text-muted small">Create your workspace</div>
        </div>

        <Form onSubmit={submit}>
          <Form.Group className="mb-3">
            {/* <Form.Label>Company / workspace name</Form.Label> */}
            <Form.Label>TenantID/UniqueName</Form.Label>
            <Form.Control
              placeholder="ZYZ_TenantID"
              autoFocus
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Confirm password</Form.Label>
            <Form.Control
              type="password"
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Form.Group>

          {localError || error ? (
            <Alert variant="danger" className="py-2 small">
              {localError || error}
            </Alert>
          ) : null}

          <Button type="submit" className="ckn-gradient-btn w-100" disabled={loading}>
            {loading ? <Spinner size="sm" animation="border" className="me-2" /> : null}
            Create account
          </Button>
        </Form>

        <div className="text-center mt-3 small">
          Already have an account?{" "}
          <Link to="/login" className="ckn-link-accent">
            Sign in
          </Link>
        </div>
      </Card>
    </Container>
  );
}
