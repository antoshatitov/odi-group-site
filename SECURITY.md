# Security Policy

## Reporting

Please use GitHub security reporting features or contact the project owners through a private
channel for vulnerability disclosure. Do not publish active secrets, exploit details, or
production-only infrastructure information in public issues.

## Public Repository Guardrails

- Real secrets, certificates, and environment files must never be committed.
- Public docs must stay free of operator-specific SSH, VPS, certificate, and production path
  instructions.
- Production-specific deploy details should live in private operations documentation, not in this
  repository.
- Repository checks must keep GitHub secret scanning and push protection enabled.
