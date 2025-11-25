![FHIRbird Logo](public/logo-stacked-small.png)

# FHIRbird

A Next.js-powered browser for FHIR (Fast Healthcare Interoperability Resources) servers. Query and explore healthcare data with an intuitive interface.

FHIRbird is creaated by [Runbeam](https://runbeam.io).

## Features

- 🔧 **Server Configuration**: Easily set and save your FHIR server URL
- 🔍 **Flexible Querying**: Support for search, read by ID, and capability statement queries
- 🔑 **Custom Headers**: Add authentication and custom headers via JSON
- 🌐 **CORS Proxy**: Built-in proxy to bypass CORS restrictions
- 📊 **Interactive Results**: Expandable JSON viewer with syntax highlighting
- 🎯 **Common Resources**: Quick access to frequently-used FHIR resource types
- 💾 **Persistent Settings**: Server URL and preferences saved in local storage
- 📋 **Request Details**: View the exact request sent (method, URL, headers)
- ⚡ **Real-time Feedback**: Loading states and error handling

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Production Deployment

FHIRbird is deployed at **https://fhirbird.runbeam.io**

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

**Recommended settings for production:**

```env
NODE_ENV=production

# Restrict proxy to trusted FHIR servers
ALLOWED_FHIR_DOMAINS=hapi.fhir.org,*.hl7.org,*.fhir.org,server.fire.ly
```

### Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure `ALLOWED_FHIR_DOMAINS` to limit proxy usage
- [ ] Enable HTTPS/SSL
- [ ] Set up monitoring and logging
- [ ] Configure CDN/WAF (Cloudflare, AWS WAF, etc.)
- [ ] Review rate limits (currently 60 req/min per IP)
- [ ] Set up error tracking (Sentry, etc.)

## Usage

### 1. Configure Your FHIR Server

Click the "Configure" button and enter your FHIR server base URL. For testing, you can use the public HAPI FHIR server:

```
https://hapi.fhir.org/baseR4
```

### 2. Query Resources

Choose from three query modes:

#### Search Mode
- Select a resource type (Patient, Observation, etc.)
- Optionally add search parameters like `_count=10` or `name=Smith`
- Click "Execute Query"

#### Read by ID Mode
- Select a resource type
- Enter a specific resource ID
- Click "Execute Query"

#### Capabilities Mode
- Fetches the server's CapabilityStatement (metadata)
- Shows what resources and operations the server supports
- Click "Execute Query"

### 3. Custom Headers (Optional)

Add authentication or custom headers as JSON:

```json
{"Authorization": "Bearer your-token-here"}
```

### 4. CORS Proxy

If your FHIR server doesn't support CORS:
- Check "Use proxy to avoid CORS issues" (enabled by default)
- The app will route requests through a Next.js API proxy
- Uncheck to make direct requests (requires CORS-enabled server)

### 5. View Results

- Results are displayed in an interactive, expandable tree view
- Click the arrows (▶/▼) to expand/collapse sections
- Use "View Raw JSON" to see the complete response

## Supported Resource Types

- Patient
- Observation
- Condition
- Procedure
- MedicationRequest
- Encounter
- Practitioner
- Organization
- AllergyIntolerance
- DiagnosticReport
- Immunization
- CarePlan

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Linting**: Biome

## Project Structure

```
fhirbird/
├── app/
│   └── page.tsx          # Main application page
├── components/
│   ├── ServerConfig.tsx   # FHIR server configuration
│   ├── QueryInterface.tsx # Query builder form
│   └── ResultsDisplay.tsx # Results viewer
└── README.md
```

## CORS Proxy

FHIRbird includes a built-in proxy to handle CORS issues:

- **Enabled by default**: Requests go through `/api/fhir-proxy`
- **How it works**: The Next.js server makes the request server-side (no CORS restrictions)
- **When to disable**: Only if your FHIR server has CORS properly configured

The proxy preserves all custom headers including authentication tokens.

## Security

FHIRbird includes several security measures to prevent abuse:

### Rate Limiting
- **60 requests per minute** per IP address
- Prevents DoS attacks and excessive API usage
- Returns 429 status when limit exceeded

### URL Validation
- Only HTTP/HTTPS protocols allowed
- Private IP ranges (127.x, 10.x, 192.168.x, 172.16-31.x) blocked only when `NODE_ENV=production`
- Localhost and private IPs **are allowed** in development mode for local testing

### Resource Limits
- **30 second timeout** on proxy requests
- **10MB response size limit** to prevent memory exhaustion
- Automatic cleanup of aborted requests

### Production Recommendations

For production deployments, consider:

1. **Authentication**: Add API keys or OAuth to the proxy endpoint
2. **Distributed Rate Limiting**: Use Redis instead of in-memory storage
3. **Allowlist**: Restrict proxy to specific FHIR server domains
4. **Monitoring**: Log and alert on suspicious patterns
5. **CDN/WAF**: Use Cloudflare or AWS WAF for additional protection

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.
