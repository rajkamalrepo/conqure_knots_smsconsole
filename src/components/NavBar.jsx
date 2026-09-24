import { Container, Navbar, Nav, Badge, Button } from "react-bootstrap";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import cknLogo from "../assets/conqure-knots-logo-white.png";

const navLinkClass = ({ isActive }) => `nav-link text-white-50${isActive ? " ckn-nav-active" : ""}`;

export default function NavBar() {
  const { isAuthenticated, email, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <Navbar expand="lg" variant="dark" className="ckn-navbar py-3" sticky="top">
      <Container fluid="lg">
        <Navbar.Brand className="d-flex align-items-center gap-2">
          <img src={cknLogo} alt="Conqure Knots" className="ckn-brand-logo" />
          <span className="text-white-50 small d-none d-md-inline">SMS Console</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="ckn-nav" />
        <Navbar.Collapse id="ckn-nav">
          {isAuthenticated ? (
            <Nav className="me-auto">
              <NavLink to="/send" className={navLinkClass}>
                Send SMS
              </NavLink>
              <NavLink to="/api-gateway" className={navLinkClass}>
                API Gateway
              </NavLink>
              <NavLink to="/applications" className={navLinkClass}>
                Applications
              </NavLink>
            </Nav>
          ) : (
            <Nav className="me-auto" />
          )}

          {isAuthenticated ? (
            <div className="d-flex align-items-center gap-2">
              <Badge className="ckn-badge-tenant">{email}</Badge>
              <Button size="sm" variant="outline-light" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          ) : null}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
