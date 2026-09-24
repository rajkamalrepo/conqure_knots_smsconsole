import { useEffect, useState } from "react";
import { Container, Row, Col, Form, Button, Alert, Table, Spinner, Card } from "react-bootstrap";
import { apiClient } from "../api/client.js";

function describeError(err) {
  if (err.response?.data?.detail) return err.response.data.detail;
  if (err.response?.data?.message) return err.response.data.message;
  if (err.response) return `Request failed (${err.response.status})`;
  return "Could not reach the API — is it running and is CORS configured for this origin?";
}

export default function ApplicationsPage() {
  const client = apiClient;

  const [name, setName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [justCreated, setJustCreated] = useState(null); // full API key, shown once

  const [apps, setApps] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);

  const loadApps = async () => {
    setLoadingApps(true);
    try {
      const res = await client.get("/api/v1/applications");
      setApps(res.data);
    } catch {
      // non-fatal on this page
    } finally {
      setLoadingApps(false);
    }
  };

  useEffect(() => {
    loadApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setJustCreated(null);
    try {
      const res = await client.post("/api/v1/applications", {
        name,
        webhookUrl: webhookUrl || undefined
      });
      setJustCreated(res.data);
      setName("");
      setWebhookUrl("");
      loadApps();
    } catch (err) {
      setCreateError(describeError(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Container fluid="lg" className="py-4">
      <h4 className="fw-semibold mb-1">Applications</h4>
      <p className="text-muted mb-4">
        Register an application (your integration, plus an optional delivery-webhook) to get an API key for it —
        the "application build" path for sending SMS from your own code.
      </p>

      <Row className="g-4">
        <Col lg={5}>
          <Form onSubmit={submit} className="ckn-card p-4 bg-white">
            <Form.Group className="mb-3">
              <Form.Label>Application name</Form.Label>
              <Form.Control value={name} onChange={(e) => setName(e.target.value)} placeholder="Order Notifications Service" required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Webhook URL (optional)</Form.Label>
              <Form.Control
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://yourapp.com/webhooks/conqure-knots"
              />
              <Form.Text muted>Delivery-report events (architecture doc §20) will POST here, HMAC-signed.</Form.Text>
            </Form.Group>
            {createError ? <Alert variant="danger">{createError}</Alert> : null}
            <Button type="submit" className="ckn-gradient-btn" disabled={creating}>
              {creating ? <Spinner size="sm" animation="border" className="me-2" /> : null}
              Create application
            </Button>
          </Form>

          {justCreated ? (
            <Alert variant="success" className="mt-3">
              <Alert.Heading className="h6">API key created</Alert.Heading>
              <p className="small mb-2">
                Copy this now — it won't be shown again. Use it on the <strong>API Gateway</strong> page to send SMS
                programmatically.
              </p>
              <code className="ckn-mono d-block bg-white border rounded p-2 mb-0" style={{ wordBreak: "break-all" }}>
                {justCreated.apiKey}
              </code>
            </Alert>
          ) : null}
        </Col>

        <Col lg={7}>
          <Card className="ckn-card">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">Your applications</h6>
                <Button size="sm" variant="outline-secondary" onClick={loadApps} disabled={loadingApps}>
                  {loadingApps ? <Spinner size="sm" animation="border" /> : "Refresh"}
                </Button>
              </div>
              <Table size="sm" responsive hover className="mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Webhook</th>
                    <th>API key</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-muted text-center py-3">
                        No applications registered yet
                      </td>
                    </tr>
                  ) : (
                    apps.map((a) => (
                      <tr key={a.applicationId}>
                        <td>{a.name}</td>
                        <td className="text-muted small">{a.webhookUrl || "—"}</td>
                        <td className="ckn-mono">{a.apiKeyMasked}</td>
                        <td className="text-muted small">{new Date(a.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
