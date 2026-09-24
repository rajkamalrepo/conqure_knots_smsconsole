import { useEffect, useMemo, useRef, useState } from "react";
import { Container, Row, Col, Tabs, Tab, Form, Button, Alert, Table, Spinner, Badge } from "react-bootstrap";
import * as XLSX from "xlsx";
import { apiClient, newIdempotencyKey } from "../api/client.js";

function segmentInfo(message) {
  const gsm7 = /^[\x00-\x7F£¥èéùìòÇØøÅåΔΦΓΛΩΠΨΣΘΞÆæßÉ¡ÄÖÑÜ§¿äöñü]*$/;
  const isGsm7 = gsm7.test(message);
  const len = message.length;
  if (len === 0) return { encoding: "GSM-7", segments: 1 };
  if (isGsm7) {
    return { encoding: "GSM-7", segments: len <= 160 ? 1 : Math.ceil(len / 153) };
  }
  return { encoding: "UCS-2", segments: len <= 70 ? 1 : Math.ceil(len / 67) };
}

function SingleSmsForm({ client, onSent }) {
  const [form, setForm] = useState({
    senderId: "CONQRE",
    to: "",
    message: "",
    clientReference: "",
    callbackUrl: ""
  });
  const [idemKey, setIdemKey] = useState(newIdempotencyKey());
  const [status, setStatus] = useState(null); // { variant, text }
  const [loading, setLoading] = useState(false);

  const { encoding, segments } = useMemo(() => segmentInfo(form.message), [form.message]);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await client.post(
        "/api/v1/sms/send",
        {
          senderId: form.senderId,
          to: form.to,
          message: form.message,
          clientReference: form.clientReference || undefined,
          callbackUrl: form.callbackUrl || undefined
        },
        { headers: { "Idempotency-Key": idemKey } }
      );
      setStatus({ variant: "success", text: `Accepted — messageId ${res.data.messageId} (${res.data.status})` });
      setIdemKey(newIdempotencyKey());
      onSent?.();
    } catch (err) {
      setStatus({ variant: "danger", text: describeError(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form onSubmit={submit} className="ckn-card p-4 bg-white">
      <Row className="g-3">
        <Col md={4}>
          <Form.Label>Sender ID</Form.Label>
          <Form.Control value={form.senderId} onChange={update("senderId")} required />
        </Col>
        <Col md={4}>
          <Form.Label>To (MSISDN)</Form.Label>
          <Form.Control placeholder="919876543210" value={form.to} onChange={update("to")} required />
        </Col>
        <Col md={4}>
          <Form.Label>Client reference</Form.Label>
          <Form.Control placeholder="ORDER-10001" value={form.clientReference} onChange={update("clientReference")} />
        </Col>
        <Col md={12}>
          <Form.Label className="d-flex justify-content-between">
            <span>Message</span>
            <span className="text-muted small">
              {encoding} · {segments} segment{segments > 1 ? "s" : ""} · {form.message.length} chars
            </span>
          </Form.Label>
          <Form.Control as="textarea" rows={3} value={form.message} onChange={update("message")} required />
        </Col>
        <Col md={8}>
          <Form.Label>Callback URL (optional)</Form.Label>
          <Form.Control
            value={form.callbackUrl}
            onChange={update("callbackUrl")}
            placeholder="https://yourapp.com/webhook"
          />
        </Col>
        <Col md={4}>
          <Form.Label>Idempotency key</Form.Label>
          <Form.Control className="ckn-mono" size="sm" value={idemKey} onChange={(e) => setIdemKey(e.target.value)} />
        </Col>
      </Row>

      {status ? (
        <Alert variant={status.variant} className="mt-3 mb-0">
          {status.text}
        </Alert>
      ) : null}

      <div className="mt-3">
        <Button type="submit" className="ckn-gradient-btn" disabled={loading}>
          {loading ? <Spinner size="sm" animation="border" className="me-2" /> : null}
          Send SMS
        </Button>
      </div>
    </Form>
  );
}

function BulkSmsForm({ client, onSent }) {
  const [senderId, setSenderId] = useState("CONQRE");
  const [message, setMessage] = useState("");
  const [recipientsText, setRecipientsText] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const recipients = useMemo(
    () =>
      recipientsText
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [recipientsText]
  );

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await client.post(
        "/api/v1/sms/bulk",
        {
          senderId,
          message,
          callbackUrl: callbackUrl || undefined,
          recipients: recipients.map((to) => ({ to }))
        },
        { headers: { "Idempotency-Key": newIdempotencyKey() } }
      );
      setStatus({
        variant: "success",
        text: `Batch ${res.data.batchId}: ${res.data.accepted} accepted, ${res.data.rejected} rejected`
      });
      onSent?.();
    } catch (err) {
      setStatus({ variant: "danger", text: describeError(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form onSubmit={submit} className="ckn-card p-4 bg-white">
      <Row className="g-3">
        <Col md={4}>
          <Form.Label>Sender ID</Form.Label>
          <Form.Control value={senderId} onChange={(e) => setSenderId(e.target.value)} required />
        </Col>
        <Col md={8}>
          <Form.Label>Callback URL (optional)</Form.Label>
          <Form.Control value={callbackUrl} onChange={(e) => setCallbackUrl(e.target.value)} placeholder="https://yourapp.com/webhook" />
        </Col>
        <Col md={12}>
          <Form.Label>Message (sent to every recipient)</Form.Label>
          <Form.Control as="textarea" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} required />
        </Col>
        <Col md={12}>
          <Form.Label className="d-flex justify-content-between">
            <span>Recipients</span>
            <span className="text-muted small">{recipients.length} number{recipients.length === 1 ? "" : "s"}</span>
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            placeholder={"One per line, or comma-separated\n919876543210\n919876500000"}
            value={recipientsText}
            onChange={(e) => setRecipientsText(e.target.value)}
            required
          />
        </Col>
      </Row>

      {status ? (
        <Alert variant={status.variant} className="mt-3 mb-0">
          {status.text}
        </Alert>
      ) : null}

      <div className="mt-3">
        <Button type="submit" className="ckn-gradient-btn" disabled={loading || recipients.length === 0}>
          {loading ? <Spinner size="sm" animation="border" className="me-2" /> : null}
          Send bulk SMS
        </Button>
      </div>
    </Form>
  );
}

// --- Bulk SMS from Excel ------------------------------------------------------

const EXCEL_MAX_ROWS = 200;
const EXCEL_HEADER_SNO = "s.no";
const EXCEL_HEADER_PHONE = "phonenumber";

function normalizeHeader(value) {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * Reads the first sheet of an uploaded workbook and enforces:
 *  - exactly 2 columns
 *  - header row is "s.no", "phoneNumber" (case/whitespace-insensitive)
 *  - at most EXCEL_MAX_ROWS data rows below the header
 * Throws with a user-facing message on any structural problem; per-row problems
 * (e.g. a blank phone number) are returned as rowErrors instead of throwing, so
 * one bad row doesn't block the rest of a large sheet.
 */
function parseRecipientsWorkbook(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("The file has no sheets.");
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
    blankrows: false
  });

  if (rows.length === 0) {
    throw new Error("The sheet is empty.");
  }

  const header = rows[0];
  if (header.length !== 2) {
    throw new Error(`Expected exactly 2 columns, found ${header.length}.`);
  }

  const [h1, h2] = header.map(normalizeHeader);
  if (h1 !== EXCEL_HEADER_SNO || h2 !== EXCEL_HEADER_PHONE) {
    throw new Error(
      `Header row must be "s.no" then "phoneNumber" (found "${header[0]}", "${header[1]}").`
    );
  }

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) {
    throw new Error("No data rows found below the header.");
  }
  if (dataRows.length > EXCEL_MAX_ROWS) {
    throw new Error(`Found ${dataRows.length} data rows — maximum allowed is ${EXCEL_MAX_ROWS}.`);
  }

  const recipients = [];
  const rowErrors = [];
  dataRows.forEach((row, idx) => {
    const rowNum = idx + 2; // +1 for header, +1 for 1-indexing
    if (row.length !== 2) {
      rowErrors.push(`Row ${rowNum}: expected 2 columns, found ${row.length}.`);
      return;
    }
    const phone = String(row[1] ?? "").trim();
    if (!phone) {
      rowErrors.push(`Row ${rowNum}: phoneNumber is empty.`);
      return;
    }
    recipients.push({ sno: row[0], to: phone });
  });

  return { recipients, rowErrors };
}

function ExcelBulkSmsForm({ client, onSent }) {
  const [senderId, setSenderId] = useState("CONQRE");
  const [message, setMessage] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [recipientsText, setRecipientsText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Same recipient parsing as the manual Bulk SMS tab, so a number the user
  // edits/adds by hand after upload behaves identically.
  const recipients = useMemo(
    () =>
      recipientsText
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [recipientsText]
  );

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    setStatus(null);
    setFileError(null);
    if (!file) {
      setFileName("");
      return;
    }
    setFileName(file.name);
    setParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const { recipients: parsed, rowErrors } = parseRecipientsWorkbook(buffer);
      // Extracted phoneNumbers go straight into the same textarea the manual
      // tab uses — one per line — so it's editable exactly like manual entry.
      setRecipientsText(parsed.map((r) => r.to).join("\n"));
      if (rowErrors.length > 0) {
        setFileError(
          `Loaded ${parsed.length} of ${parsed.length + rowErrors.length} rows — skipped: ${rowErrors
            .slice(0, 10)
            .join(" ")}${rowErrors.length > 10 ? ` …and ${rowErrors.length - 10} more.` : ""}`
        );
      }
    } catch (err) {
      setRecipientsText("");
      setFileError(err.message || "Could not read that file.");
    } finally {
      setParsing(false);
    }
  };

  const clearFile = () => {
    setFileName("");
    setFileError(null);
    setRecipientsText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await client.post(
        "/api/v1/sms/bulk",
        {
          senderId,
          message,
          callbackUrl: callbackUrl || undefined,
          recipients: recipients.map((to) => ({ to }))
        },
        { headers: { "Idempotency-Key": newIdempotencyKey() } }
      );
      setStatus({
        variant: "success",
        text: `Batch ${res.data.batchId}: ${res.data.accepted} accepted, ${res.data.rejected} rejected`
      });
      onSent?.();
    } catch (err) {
      setStatus({ variant: "danger", text: describeError(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form onSubmit={submit} className="ckn-card p-4 bg-white">
      <Row className="g-3">
        <Col md={4}>
          <Form.Label>Sender ID</Form.Label>
          <Form.Control value={senderId} onChange={(e) => setSenderId(e.target.value)} required />
        </Col>
        <Col md={8}>
          <Form.Label>Callback URL (optional)</Form.Label>
          <Form.Control value={callbackUrl} onChange={(e) => setCallbackUrl(e.target.value)} placeholder="https://yourapp.com/webhook" />
        </Col>
        <Col md={12}>
          <Form.Label>Message (sent to every recipient)</Form.Label>
          <Form.Control as="textarea" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} required />
        </Col>
        <Col md={12}>
          <Form.Label>Upload Excel file</Form.Label>
          <div className="d-flex gap-2 align-items-start">
            <Form.Control ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
            {fileName ? (
              <Button type="button" variant="outline-secondary" onClick={clearFile} disabled={loading}>
                Clear
              </Button>
            ) : null}
          </div>
          <Form.Text muted>
            Exactly 2 columns — header row <code>s.no</code>, <code>phoneNumber</code> — max {EXCEL_MAX_ROWS} data rows.
            Extracted numbers land in the box below, where you can still edit them before sending.
          </Form.Text>
        </Col>

        {parsing ? (
          <Col md={12}>
            <div className="text-muted small">
              <Spinner size="sm" animation="border" className="me-2" />
              Reading {fileName}…
            </div>
          </Col>
        ) : null}

        {!parsing && fileError ? (
          <Col md={12}>
            <Alert variant="danger" className="mb-0 small">
              {fileError}
            </Alert>
          </Col>
        ) : null}

        <Col md={12}>
          <Form.Label className="d-flex justify-content-between">
            <span>Recipients</span>
            <span className="text-muted small">{recipients.length} number{recipients.length === 1 ? "" : "s"}</span>
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            placeholder={"Upload an Excel file above, or type numbers here\nOne per line, or comma-separated"}
            value={recipientsText}
            onChange={(e) => setRecipientsText(e.target.value)}
            required
          />
        </Col>
      </Row>

      {status ? (
        <Alert variant={status.variant} className="mt-3 mb-0">
          {status.text}
        </Alert>
      ) : null}

      <div className="mt-3">
        <Button type="submit" className="ckn-gradient-btn" disabled={loading || recipients.length === 0}>
          {loading ? <Spinner size="sm" animation="border" className="me-2" /> : null}
          Send bulk SMS
        </Button>
      </div>
    </Form>
  );
}

function RecentMessages({ client, refreshToken }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get("/api/v1/sms", { params: { limit: 10 } });
      setMessages(res.data);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  return (
    <div className="ckn-card p-4 bg-white mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Recent messages</h6>
        <Button size="sm" variant="outline-secondary" onClick={load} disabled={loading}>
          {loading ? <Spinner size="sm" animation="border" /> : "Refresh"}
        </Button>
      </div>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Table size="sm" responsive hover className="mb-0">
        <thead>
          <tr>
            <th>Message ID</th>
            <th>To</th>
            <th>Sender</th>
            <th>Segments</th>
            <th>State</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {messages.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-muted text-center py-3">
                No messages yet
              </td>
            </tr>
          ) : (
            messages.map((m) => (
              <tr key={m.messageId}>
                <td className="ckn-mono">{m.messageId}</td>
                <td>{m.to}</td>
                <td>{m.senderId}</td>
                <td>{m.segmentCount}</td>
                <td>
                  <Badge bg="secondary">{m.state}</Badge>
                </td>
                <td className="text-muted small">{new Date(m.createdAt).toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}

function describeError(err) {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.response?.data?.title) return err.response.data.title;
  if (err.response) return `Request failed (${err.response.status})`;
  return "Could not reach the API — is it running and is CORS configured for this origin?";
}

export default function SendSmsPage() {
  const client = apiClient;
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <Container fluid="lg" className="py-4">
      <h4 className="fw-semibold mb-1">Send SMS</h4>
      <p className="text-muted mb-4">Portal sending — single message or a bulk batch, via the SMS API Service directly.</p>

      <Tabs defaultActiveKey="single" className="mb-3">
        <Tab eventKey="single" title="Single SMS">
          <SingleSmsForm client={client} onSent={() => setRefreshToken((t) => t + 1)} />
        </Tab>
        <Tab eventKey="bulk" title="Bulk SMS">
          <BulkSmsForm client={client} onSent={() => setRefreshToken((t) => t + 1)} />
        </Tab>
        <Tab eventKey="bulk-excel" title="Bulk SMS from Excel">
          <ExcelBulkSmsForm client={client} onSent={() => setRefreshToken((t) => t + 1)} />
        </Tab>
      </Tabs>

      <RecentMessages client={client} refreshToken={refreshToken} />
    </Container>
  );
}