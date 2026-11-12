# Lumen credit monitoring

Checked on 2026-11-13 (Asia/Manila).

## Current balance: requires organization portal access

Neither remaining balance has been retrieved. Do not interpret this as a zero balance.

Lumen has two separate balances:

- **API credits** pay for successful API operations at the prices below.
- **Lumen Credits (LC)** are a separate organization balance. Sending a chat message and uploading or retrying OCR require a positive LC balance as well as sufficient API credits. The published chat/OCR guides do not give an LC cost per operation; do not use API-credit prices to estimate LC remaining.

The sandbox portal reads LC from `GET https://org-admin.staging.nonlive.lumen.bayanichain.tech/api/credits/balance`, using an `org-admin-token` from the signed-in admin session. An unauthenticated check returned HTTP 401 with `ADMIN_TOKEN_NOT_FOUND`. The project's `LUMEN_API_KEY` and `LUMEN_API_SECRET` are developer API credentials, not an admin session. The published chat API exposes no balance route.

No paid chat/OCR requests were made during this credit investigation.

## Check and monitor

1. Sign in to the [sandbox organization portal](https://sandbox.app.lumensuite.io/) as an Admin or Super Admin and select the organization associated with this project's API key.
2. Open [Lumen Credits](https://sandbox.app.lumensuite.io/credits). Record **Current Balance**, any **Outstanding Debt**, and **Alert Threshold**. Use **Credit History** to inspect deductions and their API actions.
3. Use **Edit threshold** to configure the low-LC email and in-app warning. The portal requires a whole number of at least 10 LC. Choose a threshold that leaves time to replenish the shared organization balance before the demo; it is an alert, not a spending cap.
4. Review [Billing & Subscription](https://sandbox.app.lumensuite.io/settings/billing) for the active plan, renewal date, and plan limits. If an actual remaining API-credit counter is unavailable, ask the organization owner/organizer for the current API-credit balance, quota period, and reset time. A plan allowance alone does not establish the remaining amount.
5. Recheck before and after each integration-testing batch and immediately before the demo. Record the time, both balances when available, and your team's calls. Local application counts cannot establish the organization's balance because other keys may spend from it.

Do not paste admin tokens, cookies, API keys, or secrets into chat or commit them to this repository.

## API-credit budget

These are API-credit costs, not LC costs. See the [official chat guide](https://sandbox.docs.lumensuite.io/specs/ai-chat-api.md) and [OCR guide](https://sandbox.docs.lumensuite.io/specs/ocr-api.md).

| Operation | API credits |
| --- | ---: |
| List chat instances | 1 |
| Create a chat session | 2 |
| Send a chat message | 5 |
| Read a chat transcript | 1 |
| OCR upload | 6, charged when the read ends READY/PARTIAL |
| OCR retry | 3, charged when the read ends READY/PARTIAL |
| Any OCR GET, including each status poll | 1 |

Budget examples:

- First chat answer with a known instance: **7** (2 for a session + 5 for a message). Instance discovery adds 1.
- Additional answer in an existing session: **5**. Whether earlier messages affect model responses remains unverified; test that before depending on conversational memory.
- One successful OCR upload, `P` status polls, and one page-list read: **7 + P**. One to three polls therefore cost **8–10** total. Extra reads and successful retries add to this.
- With `B` remaining API credits and a chosen demo reserve `R`, an existing session can support at most `floor(max(0, B - R) / 5)` further answers if no other calls or keys consume credits and LC remains sufficient. This is a planning estimate.

## Reduce spending when implementing the adapters

- Use the configured `LUMEN_CHAT_INSTANCE_ID` to avoid rediscovering the instance for every question.
- Reuse a session within the same applicant conversation when appropriate; never share a session between unrelated applicants.
- Avoid transcript reads when the message response already contains the answer.
- Poll OCR with a delay, increasing intervals, and a maximum number of attempts. Every successful status poll costs a credit.
- Prevent duplicate submissions. Avoid automatically replaying uploads or messages after a client timeout: the provider may already have accepted them.
- Enforce server-side request limits and a shared spending budget before exposing public AI endpoints. An in-memory counter in one Vercel function cannot enforce a shared limit across instances or other teams' keys.

`/api/ai/chat` still returns 503/501 and makes no Lumen request. `/api/ai/ocr` is live: each successful upload costs about 7 + one credit per status poll (≈8–10), guarded by a per-instance rate limit (5 per 10 minutes per IP), a same-origin check and the `LUMEN_OCR_ENABLED=false` kill switch. Other tools, keys, branches, or deployments may still spend credits.

Stop further AI work and investigate the relevant balance when Lumen returns `403 API_CREDITS_INSUFFICIENT` or `403 LC_INSUFFICIENT`. The published guides say failed calls are not charged; repeated failures still do not reveal the numeric balance.

## Evidence for portal behavior

- [Portal application bundle](https://sandbox.app.lumensuite.io/assets/index-BMsWwIAW.js): balance/history routes, admin-token authentication, and admin-only credit/billing navigation.
- [Credits page bundle](https://sandbox.app.lumensuite.io/assets/Credits-Dnze2FtD.js): balance, debt, threshold, history, and low-balance email/in-app alert controls.
- [Billing page bundle](https://sandbox.app.lumensuite.io/assets/BillingManagement-Bn_EnepI.js): subscription, invoices, and plan limits. Public asset names can change after a portal deployment; use the portal links above for normal access.
