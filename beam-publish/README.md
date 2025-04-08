# Spaces Query Server

A simple Express-based server for querying DNS records from the Fabric network.

## Installation

```bash
npm install
```

## Usage

Build the TypeScript code:

```bash
npm run build
```

Start the server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The server will start on `http://127.0.0.1:3000`.

## API Endpoint

### Query DNS Records

```
GET http://127.0.0.1:3000/?q=<space-name>
```

Example:
```
GET http://127.0.0.1:3000/?q=@example
```

Response:
```json
{
  "type": "response",
  "id": 12345,
  "flags": 0,
  "questions": [],
  "answers": [
    {
      "name": "@example",
      "type": "A",
      "class": "IN",
      "ttl": 3600,
      "data": "127.0.0.1"
    }
  ]
}
```

## Error Handling

The server returns appropriate HTTP status codes and error messages:

- 400: Missing query parameter
- 500: Server error or Fabric network error

## Dependencies

- express
- @spacesprotocol/fabric
- dns-packet

## Development

This project is written in TypeScript. The source code is in the `src` directory and compiled to JavaScript in the `dist` directory. 