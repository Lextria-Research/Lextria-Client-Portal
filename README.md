# Lextria Client Portal

The official unified Client Portal for the **Lextria Legal & Intellectual Property Ecosystem**.

Provides clients with a unified, real-time dashboard across all firm practices:
- **Patent Prosecution:** Track patent applications, Forms 1/18/9 filings, examination reports (FER), hearings, and grant certificates.
- **Trademarks & Soft IP:** Monitor trademark applications, formality checks, journal publications, and registration statuses.
- **Litigation & Disputes:** Review court filings, hearings, summons, and order decrees.
- **Commercial Agreements:** Track contracts, term sheets, drafts, redlines, and executed agreements.
- **Financial Transparency:** Real-time visibility into completed milestone billing, statutory government disbursements, and advance retainer ledger statements.
- **Secure Document Vault:** Encrypted access to official specifications, filings, and certificates.

## Architecture

- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (Royal Blue / Sapphire client theme)
- **Database:** Supabase Central Hub (`eafciegebhuhoneypsqy`)
  - Schemas: `core` (project codes, clients, matter events, recoverable costs, documents), `finance` (billing stages, invoices)
- **Authentication:** Central Supabase Auth with client provisioning via Task Manager Settings + 1-Click test client portfolios (MAHE, PRS Neurosciences, CodeZyng, Lightspeed Photonics, Circlechess).

## Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

