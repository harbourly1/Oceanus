# Oceanus Marine Insurance CRM - Process Flows

## Complete Business Pipeline

```
Lead Submission (Public) --> Lead Qualification (Sales) --> Convert to Customer
--> Create Policy --> Create Invoice --> Accounts Approval --> UW Assignment
--> UW Review & Issue Policy --> Policy ACTIVE --> Endorsements / Renewals
```

---

## 1. Lead Submission (Public)

**Trigger:** Landing page form at `/`
**API:** `POST /api/leads`
**Roles:** Public (no auth required)

| Field | Required | Description |
|-------|----------|-------------|
| fullName | Yes | Customer full name |
| email | Yes | Contact email |
| phone | No | Phone number |
| company | No | Company name |
| productType | Yes | Marine Cargo, Hull, Liability, etc. |
| nationality | No | Customer nationality |
| residence | No | Country of residence |
| contactPref | No | Email / Phone / WhatsApp |
| currency | No | AED (default) |
| language | No | en / ar |
| formData | Yes | Product-specific risk data (JSON) |

**What happens:**
1. Lead record created with status `NEW` and ref `L-YYYY-NNNN`
2. Lead score computed based on form completeness and risk data
3. Lead auto-allocated to a sales agent via allocation pools (product + language match)
4. Multi-insurer quotes auto-generated via Quote Engine
5. Sales agent and admin notified

**Visible at:** `/sales/leads`

---

## 2. Quote Calculation (Public)

**Trigger:** Landing page quote wizard
**API:** `POST /api/quote-engine/calculate`
**Roles:** Public

Calculates premium quotes from multiple insurers based on:
- Product type and risk factors
- Rate tables per insurer
- Risk modifiers (claims history, age, ICC clause, route, etc.)
- Coverage multipliers and deductibles

**Output:** Array of quotes with insurer name, premium, score, and breakdown.

---

## 3. Quote Selection (Public)

**Trigger:** Landing page after quotes displayed
**API:** `PATCH /api/leads/:id/select`
**Roles:** Public

Customer selects a preferred quote. Lead status moves to `SELECTED`.

---

## 4. Lead Qualification (Sales)

**Page:** `/sales/leads/:id`
**Roles:** SALES_EXEC, SALES_ADMIN, ADMIN

### Status Transitions

```
NEW --> CONTACTED --> QUOTED --> SELECTED --> CONVERTED (terminal)
  \        \           \           \
   \        \           \           +--> LOST
    \        \           +--> LOST
     \        +--> LOST
      +--> LOST

LOST --> NEW / CONTACTED / QUOTED (reopen by SALES_ADMIN / ADMIN only)
```

### Available Actions on Lead Detail

| Action | API | Description |
|--------|-----|-------------|
| Transition Status | `PATCH /api/leads/:id/status` | Move lead through pipeline |
| Edit Contact Info | `PATCH /api/leads/:id` | Update name, email, phone, etc. |
| Add Note | `POST /api/leads/:id/notes` | Add internal notes to lead |
| Delete Note | `DELETE /api/leads/:id/notes/:noteId` | Remove a note |
| Create Task | `POST /api/leads/:id/tasks` | Assign follow-up task to agent |
| Respond to Task | `POST /api/leads/:id/tasks/:taskId/respond` | Complete, follow-up, or transfer |
| Override Temperature | `PATCH /api/leads/:id/temperature` | Manual hot/warm/cold override |
| Assign to Agent | `POST /api/leads/:id/assign` | Reassign to different sales agent |
| Upload Document | `POST /api/leads/:id/documents` | Attach PDF/image documents |

---

## 5. Convert Lead to Customer

**Trigger:** "Convert to Customer ID" button on lead detail page
**API:** `POST /api/leads/:id/convert`
**Roles:** SALES_EXEC, SALES_ADMIN, ADMIN

**Prerequisites:**
- Lead status must be `QUOTED` or `SELECTED`
- Lead must not already be converted

**What happens:**
1. CustomerID record created with ref `C-L-YYYY-NNNN-001`
2. Customer populated from lead data (name, email, phone, company, etc.)
3. Lead status set to `CONVERTED` (terminal)
4. Activity logged for both lead and customer
5. User redirected to `/customers/:id`

**Visible at:** `/sales/customers`

---

## 6. Create Policy

**Trigger:** "Create Policy" button on customer detail page (when no policy exists)
**Page:** `/customers/:id`
**API:** `POST /api/policies`
**Roles:** SALES_EXEC, SALES_ADMIN, ADMIN

| Field | Required | Description |
|-------|----------|-------------|
| customerIdId | Yes | Customer ID (auto-filled) |
| insurer | Yes | Selected insurer name |
| product | Yes | Product code (pre-filled from lead) |
| premium | Yes | Premium amount (AED) |
| sumInsured | Yes | Sum insured amount (AED) |
| commission | No | Commission amount (AED) |
| commissionRate | No | Commission percentage |
| startDate | Yes | Policy start date |
| endDate | Yes | Policy end date |

**What happens:**
1. Policy created with ref `P-YYYY-NNNN` and status `PENDING_UW`
2. Policy linked to customer record
3. "Create Invoice" button becomes available on customer page

**Visible at:** `/customers/:id` (Overview tab, Policy section)

---

## 7. Create Invoice

**Trigger:** "Create Invoice" button on customer detail page (requires existing policy)
**Page:** `/customers/:id`
**API:** `POST /api/invoices`
**Roles:** SALES_EXEC, SALES_ADMIN, ADMIN

| Field | Required | Description |
|-------|----------|-------------|
| customerIdId | Yes | Customer ID (auto-filled) |
| policyId | Yes | Policy ID (auto-filled from latest policy) |
| amount | Yes | Total premium amount (AED) |
| receiptAmount | No | Amount received |
| paymentDate | No | Date of payment |
| paymentMode | No | Online / Cash / Cheque / Bank Transfer |
| policyPurchaseType | No | ANNUAL / MONTHLY / QUARTERLY |
| installment | No | Is installment payment |
| installmentDetails | No | Installment schedule details |
| notes | No | Additional notes |

**What happens:**
1. Invoice created with ref `INV-YYYY-NNNN` and status `PENDING`
2. VAT (5%) auto-calculated and added to total
3. AccountsQueueItem auto-created (type: `APPROVAL`)
4. All accountants notified via in-app notification and email
5. Invoice appears in Accounts Approval Queue

**Visible at:**
- `/customers/:id` (Invoices tab)
- `/accounts/approval` (Approval Queue)

---

## 8. Accounts Approval

**Trigger:** Invoice appears in approval queue
**Page:** `/accounts/approval`
**API:** `PATCH /api/accounts-queue/:id/process`
**Roles:** ACCOUNTANT, ADMIN

### Actions

| Action | Effect |
|--------|--------|
| **Approve** | Invoice status -> APPROVED. Auto-creates UW Assignment for the policy. Routes to the underwriter mapped to the sales exec who created the invoice. |
| **Decline** | Invoice status -> DECLINED. Sent back to sales with remarks. |

**Auto UW Assignment Logic:**
1. System finds the sales exec who created the invoice
2. Looks up their mapped underwriter (set in Admin > Team Mapping)
3. Creates UW Assignment with policy attached
4. Notifies the underwriter

**Visible at:** `/underwriting/queue` (after approval)

---

## 9. Underwriting Review

**Trigger:** UW Assignment appears in queue after invoice approval
**Page:** `/underwriting/queue` and `/underwriting/in-progress`
**Roles:** UNDERWRITER, UW_MANAGER, ADMIN

### Workflow

```
QUEUED --> IN_PROGRESS --> COMPLETED (policy issued)
                      \--> RETURNED_FOR_REVIEW (back to sales)
```

| Action | API | Description |
|--------|-----|-------------|
| Start Review | `PATCH /api/uw-assignments/:id/start` | Move to IN_PROGRESS |
| Complete (Issue Policy) | `PATCH /api/uw-assignments/:id/complete` | Issue the policy |
| Return for Revision | `PATCH /api/uw-assignments/:id/return` | Send back with notes |

### Complete / Issue Policy - Required Fields

| Field | Required | Description |
|-------|----------|-------------|
| policyNumber | Yes | Official policy number from insurer |
| debitNoteNumber | Yes | Debit note reference |
| debitNoteAmount | Yes | Debit note amount |
| policyDocument | Yes | Uploaded policy document URL |
| policyHolderName | No | Name on policy |
| premiumCharged | No | Final premium charged |
| policySchedule | No | Policy schedule document URL |
| debitNotePath | No | Debit note document URL |
| startDate | No | Override start date |
| endDate | No | Override end date |
| sumInsured | No | Override sum insured |

**What happens on Complete:**
1. UW Assignment status -> COMPLETED
2. Policy status -> ACTIVE
3. Policy updated with all issuance fields (policy number, documents, etc.)
4. Activity logged

**Visible at:** `/customers/:id` (policy shows as ACTIVE)

---

## 10. Endorsements

**Trigger:** "Create Endorsement" dropdown on customer detail page (requires ACTIVE policy)
**Page:** `/customers/:id`
**API:** `POST /api/endorsements`
**Roles:** Any authenticated user

### Endorsement Types

| Type | Description |
|------|-------------|
| AMENDMENT | Change policy terms/coverage |
| CANCELLATION | Cancel the policy |
| REINSTATEMENT | Reinstate a lapsed/cancelled policy |

### Endorsement Status Flow

```
PENDING --> PROCESSING --> COMPLETED
                      \--> CANCELLED
```

### Cancellation Endorsement Required Documents

| Document | Description |
|----------|-------------|
| Credit Note | Credit note for refund |
| Endorsement Certificate | Cancellation certificate |
| Cancellation Letter | Formal cancellation letter |

### Amendment Endorsement Required Documents

| Document | Description |
|----------|-------------|
| Credit Note | If premium reduction |
| Revised Document | Updated policy document |

**What happens:**
1. Endorsement created in PENDING status with ref `E-YYYY-NNNN`
2. UW Assignment auto-created for the endorsement
3. Underwriter reviews and completes
4. For cancellation: AccountsQueueItem created (type: COMPLETION)
5. Accounts team processes the completion

**Visible at:**
- `/customers/:id` (Endorsements tab)
- `/accounts/completion` (for cancellation processing)

---

## 11. Accounts Completion (Cancellations)

**Trigger:** Cancellation endorsement processed by UW
**Page:** `/accounts/completion`
**API:** `PATCH /api/accounts-queue/:id/process`
**Roles:** ACCOUNTANT, ADMIN

### Actions

| Action | Effect |
|--------|--------|
| **Complete** | Endorsement finalized, refund processed |
| **Return** | Sent back to underwriter for rework |
| **Decline** | Cancellation rejected, policy remains active |

---

## Admin & Configuration Flows

### User Management
**Page:** `/admin/users`

| Action | API | Roles |
|--------|-----|-------|
| Create User | `POST /api/users` | ADMIN |
| Update User | `PATCH /api/users/:id` | ADMIN |
| Reset Password | `PATCH /api/users/:id/reset-password` | ADMIN |
| Toggle Leave | `PATCH /api/users/:id/leave` | ADMIN |

### Team Mapping (Sales to Underwriter)
**Page:** `/admin/team-mapping`

| Action | API | Description |
|--------|-----|-------------|
| Assign UW | `PATCH /api/users/:id/assign-underwriter` | Map sales exec to underwriter for auto-routing |

### Allocation Pools
**Page:** `/admin/allocation`

| Action | API | Description |
|--------|-----|-------------|
| Create Pool | `POST /api/allocation/pools` | Define product+language pool with agents |
| Update Pool | `PATCH /api/allocation/pools/:id` | Modify pool config |
| Delete Pool | `DELETE /api/allocation/pools/:id` | Remove pool |
| Manual Allocate | `POST /api/allocation/allocate/:leadId` | Manually assign unallocated lead |

### Product Catalog
**Page:** `/admin/products`

| Action | API | Description |
|--------|-----|-------------|
| Create Product | `POST /api/product-catalog/products` | Add insurance product |
| Update Product | `PATCH /api/product-catalog/products/:id` | Modify product config |
| Manage Modifiers | `POST/PATCH /api/product-catalog/modifiers` | Risk modifier factors |
| Manage Rates | `POST /api/product-catalog/products/:id/rates` | Per-insurer rate tables |
| Manage Inclusions | `POST /api/product-catalog/products/:id/inclusions` | Coverage inclusions |

### Reference Data
**Page:** `/admin/reference-data`

| Action | API | Description |
|--------|-----|-------------|
| Create Entry | `POST /api/reference-data` | Add reference data (countries, hull types, etc.) |
| Update Entry | `PATCH /api/reference-data/:id` | Modify entry |
| Export CSV | `GET /api/reference-data/export/csv` | Download all reference data |
| Import CSV | `POST /api/reference-data/import/csv` | Bulk import reference data |

### System Configuration
**Page:** `/admin/settings`

| Action | API | Description |
|--------|-----|-------------|
| Update Config | `PATCH /api/system-config/:key` | System-wide settings |

---

## Reports

| Report | Page | API | Description |
|--------|------|-----|-------------|
| Sales Master | `/sales/reports` | `GET /api/reports/master` | All policies, premiums, commissions by sales exec |
| Production | `/accounts/reports` | `GET /api/reports/production` | Invoices, approvals, collections |
| Admin Dashboard | `/admin` | `GET /api/reports/admin-dashboard` | High-level metrics |
| Sales Dashboard | `/sales` | `GET /api/reports/dashboard` | Sales team metrics |
| UW Dashboard | `/underwriting` | `GET /api/reports/dashboard` | Underwriting metrics |
| Accounts Dashboard | `/accounts` | `GET /api/reports/dashboard` | Accounts metrics |

All reports support CSV export and date/filter parameters.

---

## User Roles & Permissions

| Role | Access |
|------|--------|
| **SALES_EXEC** | Own leads, customers, create policies/invoices/endorsements |
| **SALES_ADMIN** | All sales data, lead reassignment, reopen lost leads |
| **UNDERWRITER** | UW queue, review assignments, issue policies |
| **UW_MANAGER** | All UW functions + create assignments |
| **ACCOUNTANT** | Approval queue, completion queue, invoice processing |
| **ADMIN** | Full access to all features including user/system management |

---

## Notification & Activity

- **In-app notifications:** Bell icon in header, real-time via WebSocket
- **Email notifications:** Sent for invoice approval, UW assignments, endorsement updates
- **Activity audit log:** All actions logged with timestamp, user, entity, and detail
- **View at:** `/admin/activity` (admin), lead/customer detail pages (per-entity)
