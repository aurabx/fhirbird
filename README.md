# 🐦 FHIR Bird

A Next.js-powered browser for FHIR (Fast Healthcare Interoperability Resources) servers. Query and explore healthcare data with an intuitive interface.

## Features

- 🔧 **Server Configuration**: Easily set and save your FHIR server URL
- 🔍 **Flexible Querying**: Support for both search queries and direct resource reads
- 📊 **Interactive Results**: Expandable JSON viewer with syntax highlighting
- 🎯 **Common Resources**: Quick access to frequently-used FHIR resource types
- 💾 **Persistent Settings**: Server URL saved in local storage
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

## Usage

### 1. Configure Your FHIR Server

Click the "Configure" button and enter your FHIR server base URL. For testing, you can use the public HAPI FHIR server:

```
https://hapi.fhir.org/baseR4
```

### 2. Query Resources

Choose from two query modes:

#### Search Mode
- Select a resource type (Patient, Observation, etc.)
- Optionally add search parameters like `_count=10` or `name=Smith`
- Click "Execute Query"

#### Read by ID Mode
- Select a resource type
- Enter a specific resource ID
- Click "Execute Query"

### 3. View Results

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

## CORS Considerations

If you encounter CORS errors when querying a FHIR server:

1. Ensure the server supports CORS
2. Use a CORS proxy for development (not recommended for production)
3. Consider running the server with appropriate CORS headers

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.
