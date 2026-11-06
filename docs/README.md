# Documentation

Start with the root README that matches your language:

- [English quickstart](../README.md)
- [Schnellstart auf Deutsch](../README.de.md)

## User and operator guides

- [Kind setup, architecture, application onboarding and C# example (English)](./advanced-setup.en.md)
- [Kind-Setup, Architektur, Anwendungs-Onboarding und C#-Beispiel (Deutsch)](./advanced-setup.de.md)
- [Repository verification, deployment constraints, backup and restore](./operations.md)

## Developer and API references

- [Run the backend locally](./backend-dev-startup.md)
- [Kubernetes infrastructure status API](./infrastructure-status.md)
- [Monitor rules API](../apps/backend/src/modules/monitors/README.md)

## Setup overview

1. Install Node.js 24+, Yarn 1.22.22, Docker Desktop, Kind, `kubectl`, and Helm.
2. Clone the repository and run `yarn install --frozen-lockfile`.
3. Run `yarn setup` to create the first administrator and local Kubernetes secrets.
4. Run `yarn cluster:init`, then keep `yarn ports:backend` running.
5. In another terminal, run `yarn dev:frontend` and open the URL it prints.

Use the root README for the concise installation and first-application instructions. The advanced
guides cover cluster operations and deploying an already-instrumented backend into Kind.
