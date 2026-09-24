import { useMemo, useState } from "react";
import { Container, Row, Col, Form, Button, Alert, Spinner, Badge } from "react-bootstrap";
import axios from "axios";
import { newIdempotencyKey } from "../api/client.js";

//const baseURL = import.meta.env.VITE_API_BASE_URL || "https://localhost:21721/" || "https://conqureknots-ceb0anf2brbcetba.southindia-01.azurewebsites.net/";
const baseURL = "https://conqureknots-ceb0anf2brbcetba.southindia-01.azurewebsites.net/"
function describeError(err) {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.response?.data?.error) return err.response.data.error;
  if (err.response) return `Request failed (${err.response.status})`;
  return "Could not reach the API — is it running and is CORS configured for this origin?";
}

/**
 * A console for the "call the API Gateway with an API key" path. There's no real
 * Azure API Management instance deployed yet (architecture doc §20 has the setup
 * steps + apim/policies/*.xml), so this page demonstrates the shape of that call
 * and resolves the key to a tenant the same way apim/policies/global-policy.xml's
 * subscription→tenant lookup would, via the demo-only /applications/whoami endpoint.
 */
export default function ApiGatewayPage() {
  const [apiKey, setApiKey] = useState("");
  const [resolvedTenant, setResolvedTenant] = useState(null);
  const [resolveError, setResolveError] = useState(null);
  const [resolving, setResolving] = useState(false);

  const [form, setForm] = useState({
    senderId: "CONQRE",
    to: "",
    message: "",
    clientReference: ""
  });
  const [idemKey, setIdemKey] = useState(newIdempotencyKey());
  const [sendStatus, setSendStatus] = useState(null);
  const [sending, setSending] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const resolveTenant = async (e) => {
    e.preventDefault();
    setResolving(true);
    setResolveError(null);
    setResolvedTenant(null);
    try {
      const res = await axios.get(`${baseURL}/api/v1/applications/whoami`, {
        headers: { "X-Api-Key": apiKey }
      });
      setResolvedTenant(res.data.tenantId);
    } catch (err) {
      setResolveError(err.response?.status === 404 ? "That API key isn't recognized." : describeError(err));
    } finally {
      setResolving(false);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    setSending(true);
    setSendStatus(null);
    try {
      const res = await axios.post(
        `${baseURL}/api/v1/sms/send`,
        {
          senderId: form.senderId,
          to: form.to,
          message: form.message,
          clientReference: form.clientReference || undefined
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idemKey,
            // Stands in for APIM's Ocp-Apim-Subscription-Key check; the resolved
            // tenant is what a real APIM policy would forward as X-Tenant-Id.
            "X-Tenant-Id": resolvedTenant
          }
        }
      );
      setSendStatus({ variant: "success", text: `Accepted — messageId ${res.data.messageId} (${res.data.status})` });
      setIdemKey(newIdempotencyKey());
    } catch (err) {
      setSendStatus({ variant: "danger", text: describeError(err) });
    } finally {
      setSending(false);
    }
  };

  const curl = useMemo(
    () =>
      [
        `curl -X POST https://conqureknots-ceb0anf2brbcetba.southindia-01.azurewebsites.net/api/v1/sms/send \\`,
        `  -H "Ocp-Apim-Subscription-Key: ${apiKey || "<your-api-key>"}" \\`,
        `  -H "Idempotency-Key: ${idemKey}" \\`,
        `  -H "Content-Type: application/json" \\`,
        `  -d '${JSON.stringify(
          {
            senderId: form.senderId,
            to: form.to || "919876543210",
            message: form.message || "Hello from Conqure Knots",
            clientReference: form.clientReference || undefined
          },
          null,
          0
        )}'`
      ].join("\n"),
    [apiKey, idemKey, form]
  );

  return (
    <Container fluid="lg" className="py-4">
      <h4 className="fw-semibold mb-1">API Gateway</h4>
      <p className="text-muted mb-4">
        Send SMS the way an external application would — with an API key, through the gateway, instead of the
        portal's own session.
      </p>

      <Row className="g-4">
        <Col lg={6}>
          <Form onSubmit={resolveTenant} className="ckn-card p-4 bg-white mb-4">
            <Form.Label>API key</Form.Label>
            <div className="d-flex gap-2">
              <Form.Control
                className="ckn-mono"
                placeholder="ckn_live_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
              />
              <Button type="submit" variant="outline-primary" disabled={resolving}>
                {resolving ? <Spinner size="sm" animation="border" /> : "Verify"}
              </Button>
            </div>
            <Form.Text muted>
              Get a key from the <strong>Applications</strong> page. In production, API Management validates this
              subscription key itself before your request ever reaches the SMS API Service.
            </Form.Text>
            {resolveError ? (
              <Alert variant="danger" className="mt-3 mb-0">
                {resolveError}
              </Alert>
            ) : null}
            {resolvedTenant ? (
              <Alert variant="success" className="mt-3 mb-0">
                Key verified — resolves to tenant <Badge bg="dark">{resolvedTenant}</Badge>
              </Alert>
            ) : null}
          </Form>

          <Form onSubmit={send} className="ckn-card p-4 bg-white">
            <fieldset disabled={!resolvedTenant}>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Label>Sender ID</Form.Label>
                  <Form.Control value={form.senderId} onChange={update("senderId")} required />
                </Col>
                <Col md={6}>
                  <Form.Label>To (MSISDN)</Form.Label>
                  <Form.Control placeholder="919876543210" value={form.to} onChange={update("to")} required />
                </Col>
                <Col md={12}>
                  <Form.Label>Message</Form.Label>
                  <Form.Control as="textarea" rows={3} value={form.message} onChange={update("message")} required />
                </Col>
                <Col md={12}>
                  <Form.Label>Client reference (optional)</Form.Label>
                  <Form.Control value={form.clientReference} onChange={update("clientReference")} placeholder="ORDER-10001" />
                </Col>
              </Row>
              {sendStatus ? (
                <Alert variant={sendStatus.variant} className="mt-3 mb-0">
                  {sendStatus.text}
                </Alert>
              ) : null}
              <div className="mt-3">
                <Button type="submit" className="ckn-gradient-btn" disabled={sending}>
                  {sending ? <Spinner size="sm" animation="border" className="me-2" /> : null}
                  Send via API Gateway
                </Button>
              </div>
            </fieldset>
            {!resolvedTenant ? <p className="text-muted small mt-2 mb-0">Verify an API key above first.</p> : null}
          </Form>
        </Col>

        <Col lg={6}>
          <div className="ckn-card p-4 bg-white">
            <h6>Equivalent request, once deployed behind APIM</h6>
            <p className="text-muted small">
              This is what the same call looks like against the production API Management endpoint (architecture
              doc §20) — a subscription key instead of a session, and a stable versioned path.
            </p>
            <code className="ckn-curl">{curl}</code>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
