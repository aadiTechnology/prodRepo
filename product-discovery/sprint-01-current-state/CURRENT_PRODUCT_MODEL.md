# SmartKidz Current Product Model

**Sprint:** 1 — Existing Product Discovery + Runtime Closure  
**Date:** 2026-08-11  
**Scope:** Lead → Student → Parent/User lifecycle; Fee Management  
**Method:** Repository inspection + read-only runtime verification on hosted test/dev UI (`erpui.aaditechnology.com`, tenant **Aadi Tech**, account role **Admin**). No application source code modified; no production data created or payments submitted.  
**Runtime screenshots:** Captured under `product-discovery/sprint-01-current-state/screenshots/` (see Screenshot Index).

---

## 1. Executive Summary

The current SmartKidz product implements **two partially connected domains**:

| Domain | What actually exists (CONFIRMED) |
| ------ | -------------------------------- |
| Admissions | Lead capture (`leads` + `parents`), lead list/edit, enrollment conversion that creates Student + Parent link + Fee Assignment + Student User login |
| Fee Management | Fee Category, Fee Structure (+ installments), Fee Discount, Student Fee Assignment, Invoice generation/list/detail, Collect Payment, Receipt, Fee Due List, Fee Report |

**Actual entity model is not** Lead → Parent User → Student. Observed chain:

```
LeadParent (table: parents)
    ↑ parent_id
Lead ──converted_to_student_id──► Student ──parent_id──► LeadParent
                                    │
                                    └ (login) User resolved by email/name match, role STUDENT
```

Fee chain:

```
FeeCategory → FeeStructure → FeeInstallment
                  ↓
        StudentFeeAssignment → StudentFeeDetail / StudentFeeInstallment
                  ↓
            StudentInvoice → FeePayment (+ FeePaymentAllocation) → Receipt (FeePayment.receipt_number)
                  ↓
              FeeLedger (aggregate paid/balance per student + academic year name)
```

**Key confirmed facts:**

1. Lead exists and is fully CRUD-capable. CONFIRMED (CODE)
2. True Lead→Student conversion is **Enrollment**, not the `/convert` API (which only stamps `converted_at` without creating a student). CONFIRMED (CODE)
3. Parent is a shared `parents` row reused by mobile number; not a separate “Guardian” multi-table model. CONFIRMED (CODE)
4. Login user is created as **STUDENT**, named after the child; linked heuristically by email (parent email preferred), not by FK. CONFIRMED (CODE)
5. No Parent-role user is created during enrollment. CONFIRMED (CODE)
6. Fee structure is class + academic-year (optional division). Student fees attach at enrollment via assignment; invoices are a separate generation step. CONFIRMED (CODE)
7. Partial invoice payment is supported. Late-fee columns exist on installments but collection does not apply them. CONFIRMED / LIKELY (CODE)
8. Authoritative PRE-002…PRE-016 business requirement text is provided in the Sprint 1 closure brief (authoritative business baseline). A standalone BRD spreadsheet remains **not present** in the repository files. CONFIRMED (brief) / DOCUMENTATION gap vs repo file artifact

**Discovery confidence overall:** HIGH for code/data model of admissions + fees; HIGH for Admin runtime screens observed on hosted UI; MEDIUM where conversion/create/payment submit was not exercised; LOW for Principal/Accountant-specific RBAC runtime.

---

## 2. Lead / Student / Parent / User

### 2.1 Current Screens

| ID | Module | Screen | Route | Role / Permission (frontend) | Purpose | Entry Point | Main Actions | Evidence |
| -- | ------ | ------ | ----- | ---------------------------- | ------- | ----------- | ------------ | -------- |
| A-01 | Admissions | Lead Management (list) | `/admissions/leads` | `ADMISSIONS_MGMT:view` | List/search/filter leads | Dashboard “Lead Pipeline”; direct route | Add, Edit, Delete, Convert→Enrollment | `AppRoutes.tsx`, `LeadManagementPage.tsx` |
| A-02 | Admissions | Add Lead | `/admissions/leads/add` | `ADMISSIONS_MGMT:create` | Capture enquiry | Lead list “Add Lead” | Create lead | `AddLeadPage.tsx`, formConfig |
| A-03 | Admissions | Edit Lead | `/admissions/leads/:id/edit` | `ADMISSIONS_MGMT:edit` | Edit enquiry | Lead list edit | Update lead | same |
| A-04 | Admissions | Enrollment (blank / from lead / student) | `/admissions/enrollment`, `/admissions/enrollment/from-lead/:leadId`, query variants | `ADMISSIONS_MGMT:view\|create\|edit` | Admit student; prefill from lead; edit/view student | Lead convert icon; Students Add; Students edit/view | Enroll, upload docs, fee plan | `EnrollmentPage.tsx` |
| A-05 | Admissions | Enrollment Print | `/admissions/enrollment/print` | `ADMISSIONS_MGMT:view` | Printable enrollment receipt | After enroll (printable payload) | Print/view | `EnrollmentPrintPage.tsx` |
| A-06 | Administration | Student List | `/students` | `ADMIN_MGMT:view` | Search/list students | Sidebar Students (seed) | Add (→enrollment), View, Edit, Delete | `StudentList.tsx` |
| A-07 | Administration | Student View | `/students/:studentId/view` or enrollment `mode=view` | `ADMIN_MGMT:view` | Read-only student details | Student list | View | `EnrollmentPage` + `StudentDetailsView` |
| A-08 | Administration | Users | `/users`, `/user/create` | `ADMIN_MGMT:view/create` | Staff/system users (not parent portal UX) | Admin menu | CRUD users | separate from enrollment parent |

**Not found as dedicated screens (API may exist):** Lead Follow-up management UI, multi-guardian editor, admission approval workflow, parent portal registration.

### 2.2 Current Flow

#### Flow A — Lead → Enrollment → Student (primary)

```
Lead List ──[Add Lead]──► Add Lead Form ──POST /api/admissions/leads──► Lead + Parent
    │
    ├──[Edit]──► Edit Lead ──PUT /api/admissions/leads/{id}──► Lead/Parent update
    │
    └──[Convert]──► Enrollment from-lead ──GET prefill──► form
                              │
                              └──POST enroll──► Student + Parent reconcile
                                            + StudentFeeAssignment
                                            + Lead.converted_to_student_id
                                            + User (STUDENT)
                                            + optional profile photo
```

| Transition | Trigger | User action | Screen | API | DB operation | Result |
| ---------- | ------- | ----------- | ------ | --- | ------------ | ------ |
| Create lead | Add Lead | Fill parent/child/meta, save | A-02 | `POST /api/admissions/leads` | `parents` get-or-create by mobile; insert `leads` (`LD-{tenant}-{6digits}`) | New lead listed |
| Edit lead | Row edit | Save | A-03 | `PUT /api/admissions/leads/{id}` | Update parent + lead fields | Updated |
| Soft delete | Delete | Confirm | A-01 | `DELETE /api/admissions/leads/{id}` | `leads.is_deleted=true` | Hidden from list |
| Open conversion | Convert icon | Click | A-01→A-04 | navigate only (no `/convert` call) | none yet | Prefill enrollment |
| Prefill | Page load | — | A-04 | `GET /api/admissions/enrollments/prefill/{lead_id}` | read lead/parent | Child + parent fields populated |
| Enroll | Submit | Fill class, fee structure, docs | A-04 | `POST /api/admissions/enrollments` | student insert; fee assign; lead convert flags; user create | Student + assignment + login attempt |
| Print | After success | Navigate print | A-05 | uses printable payload | none | Printable summary |

#### Flow B — Student without lead

```
Students ──[Add]──► /students/add ──Navigate──► /admissions/enrollment?source=students
                          └──POST enroll (lead_id optional null)──► Student + User + Fee Assignment
```

#### Flow C — Legacy / alternate student create API

```
POST /api/students  (StudentService.add_student)
  → Parent by mobile, Student, User STUDENT
  → Does NOT set lead conversion, does NOT assign fees in this service path
```

Frontend main “Add Student” path redirects to enrollment (`AppRoutes` `/students/add` → Navigate enrollment). Direct `POST /api/students` remains available. CONFIRMED (CODE)

#### Broken / incomplete conversion path

```
POST /api/admissions/leads/{id}/convert
  → sets converted_at, converted_by only
  → does NOT create Student
  → does NOT set converted_to_student_id
```

Conflict with UI “Convert to Student” label which navigates to enrollment. CONFIRMED (CODE)

### 2.3 Current Data Model

#### Tables / models (CONFIRMED)

| Entity | Table | PK | Key FKs / fields | Notes |
| ------ | ----- | -- | ---------------- | ----- |
| LeadParent (`class` name) | `parents` | `id` | `tenant_id` → tenants | Shared parent for leads & students |
| LeadSource | `lead_sources` | `id` | optional `tenant_id` | Lookup; unique `code` |
| LeadStatus | `lead_statuses` | `id` | optional `tenant_id`; `sequence_order`, `is_terminal`, `color_code` | Lookup; unique `code` |
| Lead | `leads` | `id` | `parent_id` → parents; `lead_source_id`; `lead_status_id`; `preferred_class_id`; `preferred_academic_year_id`; `converted_to_student_id` → students; soft delete | Lead enquiry |
| LeadFollowup | `lead_followups` | `id` | `lead_id` → leads | Call/Visit/Email/WhatsApp; Pending/Completed/Cancelled |
| Student | `students` | `id` | `parent_id` → parents (SET NULL); class/division/year; fee_structure_id; denormalized `parent_name`, `mobile_number`, `email` | Single parent FK only |
| User | `users` | `id` | `tenant_id`; unique `email`; `full_name`; `role` (legacy); roles M2M | **No parent_id / student_id FK** |

Evidence: `apps/fastapi/app/models/lead.py`, `student.py`, `user.py`; SQL dump excerpts in `apps/web/src/hooks/USE [erpdb].sql`.

#### Relationship cardinality (from model constraints)

| Question | Answer | Confidence | Evidence |
| -------- | ------ | ---------- | -------- |
| Lead → Parent | N:1 required `parent_id` | CONFIRMED | Lead model |
| Parent → many Leads | Yes | CONFIRMED | relationship + get-or-create by mobile |
| Lead → Student | Optional 1:1 via `converted_to_student_id` | CONFIRMED | Lead model; enrollment sets it |
| Student → Parent | Optional 0..1 `parent_id` | CONFIRMED | Student model |
| One parent, multiple students | Yes (many students can share parent_id) | CONFIRMED | model allows; get-or-create mobile reuse |
| One student, multiple parents | **No** at schema level | CONFIRMED | single `parent_id` only |
| Parent ↔ User FK | **No** | CONFIRMED | User model |
| Student ↔ User FK | **No**; match by email/name | CONFIRMED | `profile_image_service._resolve_user_for_student` |

#### Field inventories

**Lead create (API `LeadCreate`):** parent_name, mobile_number, alternate_mobile, email, address, city, state, pin_code, relationship, society; child_name, child_dob, child_gender; lead_source_id, lead_status_id, preferred_class_id, preferred_academic_year_id, expected_admission_date, notes, remarks, assigned_to.

**Enrollment create (`EnrollmentCreateRequest`):** lead_id?, student_name, date_of_birth, gender, admission_no?, admission_date, academic_year_id, class_id, class_division_id?, roll_no?, parent_name, mobile_number, email (required), fee_structure_id, discount_id?, additional_fee?, birth_certificate_url?, photo_url?.

**Duplication between Lead and Student (observational):** child/student name, DOB, gender, parent name, mobile, email, class/year preferences vs assignment. Address fields copied from parent onto student at enroll (`address`, `area`←society, `city`, `state`, `pincode`).

**Parent vs User duplication:** parent email may become user login email; parent name is **not** the user full_name (student name is). Password defaults to student mobile (or `"student@123"` if empty) in enrollment.

### 2.4 Current API Flow

#### Lead API — prefix `/api/admissions/leads`

| Method | Path | Permission dependency | Service |
| ------ | ---- | --------------------- | ------- |
| GET | `/sources` | auth | list sources |
| GET | `/statuses` | auth | list statuses |
| GET | `/` | `Lead Management` view | list + search |
| POST | `/` | `Lead Management` create | create_lead |
| GET | `/{id}` | view | detail |
| PUT | `/{id}` | edit | update |
| DELETE | `/{id}` | delete | soft delete |
| POST | `/{id}/convert` | edit | mark converted timestamps only |
| GET/POST | `/{id}/followups` | view/edit | followups |
| POST | `/followups/{id}/complete` | edit | complete |

Frontend client: `apps/web/src/api/services/leadService.ts`.  
Follow-up client methods exist; **no primary UI page found** that calls them. LIKELY unused in UI.

#### Enrollment API — prefix `/api/admissions/enrollments`

| Method | Path | Permission | Effect |
| ------ | ---- | ---------- | ------ |
| GET | `/next-admission-no` | Lead Management create | preview ADM-{tenant}-###### |
| GET | `/prefill/{lead_id}` | create | prefill map |
| POST | `/` | create | enroll pipeline |
| POST | `/upload-document?document_type=` | create | birth_certificate \| photo → `/enrollment-documents/...` |

#### Student API — prefix `/api/students`

List/search, get by id, update, soft delete; also `POST` add_student as alternate create.

### 2.5 Current Business Rules

1. **Parent reuse:** Same tenant + mobile_number + not deleted → reuse parent; update name/email (and more fields on lead create). CODE
2. **Lead already converted:** enroll rejects if `converted_to_student_id` set. CODE
3. **Admission number:** Auto `ADM-{tenant_id}-{6 digit seq}` if not provided. CODE
4. **Class/division capacity:** enforced on enroll via school_class_service helpers. CODE
5. **Lead status on convert:** If a `LeadStatus` with code/name ILIKE `converted` exists, status updated. Else timestamp only. CODE
6. **User email uniqueness:** Prefer parent/student email; if taken, `local+admission@domain`. CODE `student_login_email.py`
7. **User creation failure is non-fatal:** logged; enrollment still succeeds. CODE
8. **Default student password:** mobile number (or fallback string). CODE — security limitation
9. **Frontend permission codes** use feature `ADMISSIONS_MGMT:*`; **backend** requires menu name **`Lead Management`**. Seed catalog currently seeds Admissions → **Enrollment** only, not “Lead Management” or lead path. CONFLICT / RBAC risk
10. **Statuses/sources** are DB lookup tables (active only). Hardcoded dashboard fallback labels: New / Contacted / Converted / Lost. LIKELY reference data varies per env. UNVERIFIED runtime values

### 2.6 Current Screenshots

Runtime captures exist under `product-discovery/sprint-01-current-state/screenshots/` (see Screenshot Index). Admissions/lead/student/user workflows captured for Admin on hosted UI. Convert for non-Converted lead and brand-new enroll submit remain unverified live.

### 2.7 Current Limitations

| Limitation | Evidence class | Evidence |
| ---------- | -------------- | -------- |
| Dual conversion APIs: `/convert` does not create students; UI does enrollment | CODE | `lead_service.convert_lead` vs `enrollment_service.enroll` vs `LeadManagementPage` navigate |
| Login user is student-named, not parent; no parent portal user from enroll | CODE | enrollment_service user create role STUDENT, full_name=student_name |
| No FK User↔Student / User↔Parent; fragile email/name resolution | CODE | user model; `_resolve_user_for_student` |
| Single guardian only on student | CODE | students.parent_id |
| Parent contact denormalized on student + parent table | CODE | Student fields + parent relationship |
| Follow-up domain partially built without UI | CODE | lead followup router/service/types; no page usage |
| Lead menu not in seed hierarchy; only Enrollment under Admissions | CODE | `seed_rbac.py` hierarchy |
| Backend menu permission `"Lead Management"` may not match seed menus | CODE / CONFLICT | enrollment/lead routers vs seed menu names |
| Enrollment email required; lead email optional → re-entry at admission | CODE | schemas |
| Re-entry of class, fee structure, admission date at conversion | CODE | prefill incomplete vs enrollment required fields |
| Address/society collected on lead may not all reappear as enrollment form fields | CODE | prefill omits address | Enrollment form focuses parent contact + academic + fee |
| Alternate student create path without fee assignment | CODE | `StudentService.add_student` |
| No admission approval workflow entity | CODE | no approval model/status beyond lead status |

### 2.8 Unknowns

| Unknown | Status |
| ------- | ------ |
| Exact lead_status / lead_source seed values in each tenant DB | UNVERIFIED |
| Whether production menus were manually added for Leads outside seed | UNVERIFIED |
| Whether sibling multi-student login UX is used in production | UNVERIFIED |
| Live password reset / first-login force change for STUDENT | UNVERIFIED |
| Whether soft-delete parent ever used | UNVERIFIED |

---

### Answers to Feature Group 1 question list

| # | Question | Finding | Confidence | Evidence |
| - | -------- | -------- | ---------- | -------- |
| 1 | Does Lead/New Enquiry exist? | Yes | CONFIRMED | leads model, pages, API |
| 2 | Where accessed? | `/admissions/leads`; Dashboard Lead Pipeline | CONFIRMED | AppRoutes, Dashboard |
| 3 | Screens? | List, Add, Edit; Enrollment; Print | CONFIRMED | §2.1 |
| 4 | Fields? | See §2.3 field inventories | CONFIRMED | schemas + formConfig |
| 5 | Roles? | Frontend `ADMISSIONS_MGMT`; backend menu “Lead Management” | CONFIRMED / CONFLICT | AppRoutes; routers |
| 6 | Statuses? | Dynamic `lead_statuses` table; dashboard defaults mentioned | LIKELY | model; dashboard fallback |
| 7 | Actions? | CRUD, soft delete, convert→enrollment, follow-up API | CONFIRMED | routers/UI |
| 8 | Lead→Student conversion? | Yes via enrollment | CONFIRMED | enrollment_service |
| 9 | Where implemented? | `EnrollmentService.enroll` | CONFIRMED | enrollment_service.py |
| 10 | Records created? | Student; Parent (get/create); StudentFeeAssignment(+details/installments); FeeLedger if missing; User STUDENT; Lead update | CONFIRMED | enroll() |
| 11 | Student info from lead? | Yes prefill: name, DOB, gender, parent/contact, preferred class/year | CONFIRMED | get_prefill_from_lead |
| 12 | Parent info copied? | Yes into prefill and on student fields | CONFIRMED | prefill + Student() constructor |
| 13 | Parent record created? | Yes if new mobile | CONFIRMED | `_get_or_create_parent` |
| 14 | Existing parent reused? | Yes by mobile | CONFIRMED | same |
| 15 | User/login created? | Yes, attempt post-commit | CONFIRMED | enroll user create block |
| 16 | User linked to parent? | No FK; user email may be parent email | CONFIRMED | no FK; email resolver |
| 17 | User linked to student? | No FK; name/email heuristic | CONFIRMED | profile_image_service |
| 18 | One parent multiple students? | Allowed by schema | CONFIRMED | parent_id on many students |
| 19 | One student multiple parents? | Not supported | CONFIRMED | single parent_id |
| 20 | Link existing user to another student? | No explicit link API; shared parent email uses +tag emails for siblings | CONFIRMED | resolve_student_login_email |
| 21 | If parent exists? | Reuse + update select fields | CONFIRMED | get-or-create |
| 22 | If parent mobile/email already exists? | Mobile drives parent reuse; email uniqueness enforced on users table only | CONFIRMED | parents look up; User.email unique |
| 23 | Data re-entered at admission? | At least class, division, academic year, fee plan, discount, admission date, email required | CONFIRMED | enrollment form schema |
| 24 | Duplicated Lead↔Student? | Name, DOB, gender, parent contact | CONFIRMED | fields both places |
| 25 | Duplicated Parent↔User? | Email (often); not full parent identity | CONFIRMED | user full_name = student |
| 26 | Limitations? | §2.7 | | |

---

## 3. Fee Management

### 3.1 Current Screens

| ID | Module | Screen | Route | Frontend permission | Purpose | Entry | Actions | Evidence |
| -- | ------ | ------ | ----- | ------------------- | ------- | ----- | ------- | -------- |
| F-01 | Fees | Fee Category list | `/fees/categories` | FEE_MGMT:view | Manage categories | Fees menu | CRUD | FeeCategoryManagement |
| F-02 | Fees | Add/Edit Fee Category | `/fees/categories/add`, `.../edit/:id` | create/edit | Category form | list | save | AddEditFeeCategory |
| F-03 | Fees | Fee Structure list | `/fees/setup` | view | Structures by class/year | menu | add/edit/delete | FeeStructureSetup |
| F-04 | Fees | Fee Structure form | `/fees/setup/add`, `/:id/edit` | create/edit | Define structure + installments | list | save | FeeStructureForm |
| F-05 | Fees | Fee Discount list | `/fees/discounts` | view | Discounts | menu | CRUD | FeeDiscountsPage |
| F-06 | Fees | Add/Edit Discount | `/fees/discounts/add`, `/:id/edit` | create/edit | Discount form | list | save | AddFeeDiscount |
| F-07 | Fees | Invoice List | `/fees/invoices` | view | Browse invoices | menu / Dashboard Collect Payment | open detail, generate | InvoiceList |
| F-08 | Fees | Generate Invoice | `/fees/generate-invoice` | create | Bulk/gen invoices by class | invoice list | generate | GenerateInvoice |
| F-09 | Fees | Invoice Detail | `/fees/invoices/:invoiceId/detail` | view | Context + history | list | collect pay | InvoiceDetail |
| F-10 | Fees | Invoice Edit | `/fees/invoices/:invoiceId/edit` | edit | Edit generation-like form | list | save | GenerateInvoice |
| F-11 | Fees | Collect Payment | `/fees/collect-payment` | view | Pay against invoice | invoice detail / menu | collect | CollectPaymentPage |
| F-12 | Fees | Receipt | `/fees/receipt/:paymentId`, `/fees/receipt/invoice/:invoiceId` | view | Receipt view | after payment | print | ReceiptPage |
| F-13 | Fees | Fee Due List | `/fees/due-list-v2` | view | Due/overdue rows | menu | filter → invoice | FeeDueListV2 |
| F-14 | Fees | Fee Report | `/fees/reports` | view | Summary + grid + CSV | menu | filter/export | FeeReportPage |

**Also present in codebases but secondary / partial:**

| Item | Notes |
| ---- | ----- |
| Class fee structure assignment pages (`AddClassFeeStructureAssignment`, AssignmentModal) | API router `/api/fees` assignment exists; not in current seed menu list |
| Installment tracking router | backend support |
| Student fee assignment router | service used by enrollment; standalone UI seed path deprecated (`/fees/assign-student-fee` cleaned in seed) |

### 3.2 Current Flow

```
Fee Category ──► Fee Structure (+ FeeInstallment rows)
                        │
                        ▼  (at enrollment or assignment API)
              StudentFeeAssignment (+ details + student installments)
                        │
                        ▼  (manual Generate Invoice)
                 StudentInvoice (per installment label)
                        │
                        ▼  Collect Payment
                   FeePayment + Allocation
                        │ updates invoice paid/due/status
                        │ updates FeeLedger
                        ▼
                     Receipt (RCP-YYYYMM-####)
```

| Step | Trigger | Screen | API | DB |
| ---- | ------- | ------ | --- | -- |
| Define category | Admin | F-01/02 | `/fees/categories` | fee_categories |
| Define structure | Admin | F-03/04 | `/fees/structures` | fee_structures, fee_installments |
| Define discount | Admin | F-05/06 | fee discount router | fee_discounts |
| Assign to student | Enrollment submit or assign service | Enrollment / API | `student_fee_assignment_service.assign_fee_to_student` | student_fee_* + optional fee_ledger |
| Generate invoice | User selects students/class/installment | F-08 | invoice generate | student_invoices |
| Collect | Pay from invoice context | F-11 | `POST /fees/collection/invoice` | fee_payments; invoice; ledger |
| Receipt | Navigate after success | F-12 | `GET /fees/collection/receipt/{id}` | read payment |

### 3.3 Current Data Model

| Entity | Table | Role |
| ------ | ----- | ---- |
| FeeCategory | `fee_categories` | component types (UUID string PK) |
| FeeStructure | `fee_structures` | class + academic_year (+ optional division); total; installment_type MONTHLY/QUARTERLY/YEARLY; multi_category_ids |
| FeeInstallment | `fee_installments` | schedule lines; late_fee_* fields present |
| FeeDiscount | `fee_discounts` | Percentage/Fixed; optional applicable_class string |
| StudentFeeAssignment | `student_fee_assignments` | student/year/structure; discount_id without formal FK; status Pending… |
| StudentFeeDetail | `student_fee_details` | category breakdown after discount |
| StudentFeeInstallment | `student_fee_installments` | student-level installment amounts (discounted) |
| StudentInvoice | `student_invoices` | billable unit; total/paid/due; status Paid/Partial/Pending/Overdue; installment label; fee_installment_id |
| FeePayment | `fee_payments` | payment header; receipt_number; payment_method; reference_no; bank fields |
| FeePaymentAllocation | `fee_payment_allocations` | payment ↔ fee_installments |
| FeeLedger | `fee_ledger` | totals by student + academic_year **name string** |
| ClassFeeStructureAssignment | (model exists) | class-level structure assignment (parallel path) |

**Fee components:** Represented as fee categories + multi-select categories on structure (`fee_category_ids` / `multi_category_ids`) + installments. Student detail collapses to one category line per assignment in assignment service.

**Outstanding calculation (multiple surfaces):**

| Surface | Basis |
| ------- | ----- |
| Invoice | `due_amount = total - paid` maintained on payment |
| Fee Report | SUM(invoice totals) from student_invoices |
| Fee Due List v2 | Assignment installment amount − aggregated payments **(join risks: payment installment_id vs student installment id mismatch)** |

### 3.4 Current API Flow

Primary routers:

| Router | Prefix | Auth pattern |
| ------ | ------ | ------------ |
| fee | `/fees` | require_permission(**"Fees"**, action) for categories/structures/due-list |
| fee_category_router | (categories) | "Fees" |
| fee_structure list for enrollment | `/api/fee-structures` | tenant/class filters (no menu name check in router body) |
| student_fee_assignment | assignment APIs | (service used by enroll) |
| invoice | `/fees/invoices` | installment_tracking access helper |
| fee_collection | `/fees/collection` | same access helper |
| fee_report | `/fees/reports` | get_current_user (auth only; **not** FEE menu named check) |

**Collect payment (invoice path):**

1. Validate method ∈ {CASH, UPI, BANK_TRANSFER}; non-cash requires reference  
2. Load invoice; assert access  
3. `payment_amount` > 0 and ≤ `due_amount`  
4. Insert FeePayment + optional FeePaymentAllocation  
5. Update invoice paid/due/status (`Paid` / `Partial`)  
6. Update FeeLedger paid/balance  
7. Return payment_id + receipt_number

**Partial payment:** Supported. CODE

**Multi-component pay-together:** Invoice-based collection is **one invoice**. Alternate `collect_payment` accepts multiple installment allocations in one request — inventory of UI usage concentrates on **invoice** path. LIKELY single invoice per collect screen.

**Payment modes (UI):** Cash, UPI, Bank Transfer. Service also lists CARD as allowed method, but Pydantic schema / UI do not expose CARD. CONFLICT

### 3.5 Current Business Rules

**Fee Structure**

- Scoped: `tenant_id`, `class_id` required, `academic_year_id` required, optional `class_division_id`
- Installment types fixed counts: MONTHLY=12, QUARTERLY=4, YEARLY=1 (frontend form config)
- Editable after create via PUT (no code-level lock because assigned). Whether safe after invoices exist = **UNVERIFIED** (no hard block found in skim)
- Copy structure: **no dedicated copy API found**. UNVERIFIED absent
- Late fee columns stored; **not applied in collect_invoice_payment**. CONFIRMED non-use in that path

**Student fee association**

- Primary path: enrollment requires `fee_structure_id` and creates assignment with optional `discount_id`
- Assignment service allows multiple assignments per student/year (uniqueness check removed)
- Discounts: percentage or fixed applied pro-rata to installments
- Concessions: no separate “concession” entity (only FeeDiscount)
- Invoices not auto-created at enrollment — separate generate step. CONFIRMED

**Collection validation**

- Overpayment blocked
- Reference required for UPI/Bank
- Bank holder/account/IFSC collected in UI for BANK_TRANSFER

**Reports**

- Filters: academic year, class, installment, search, start/end date (invoice `created_at`)
- Summary: total students, invoiced, collected, pending, collection %
- Export: **client-side CSV** of loaded rows (`FeeReportPage.exportToCsv`)
- Roles: frontend FEE_MGMT:view; backend currently only authenticated user

### 3.6 Current Screenshots

Fee category/structure/installments, invoice list/detail, generate invoice, and collect payment form captured (SS-B-*). Fee Report / Due / Discount not in tenant Fees menu (not captured). Receipt after new payment not submitted.

### 3.7 Current Limitations

| Limitation | Class | Evidence |
| ---------- | ----- | -------- |
| Fee assignment not automatic without enrollment or explicit assign call | CODE | enrollment vs generate invoice steps |
| Invoice generation manual | CODE | generate_invoices |
| Late fees stored but not charged in invoice collection | CODE | FeeInstallment fields vs fee_collection_service |
| Fee due list payment join may mix student_installment ids with fee_installment ids | CODE | get_fee_due_list_v2 payment_agg on fee_installment_id vs StudentFeeInstallment join |
| Backend permission string `"Fees"` vs seed menu names like “Fee Structure”, “Invoice List” | CODE CONFLICT | fee.py require_permission("Fees") vs seed_rbac children |
| Class fee assignment + student assignment parallel models risk dual concepts | CODE | both models present |
| Fee report lacks RBAC menu check on backend | CODE | fee_report.py Depends(get_current_user) only |
| Ledger keyed by academic year **name** string, not ID | CODE | FeeLedger.academic_year |
| Discount_id on assignment without FK | CODE | student_fee_assignment model comment |
| Structure edit after payments impacts consistency: unclear | UNVERIFIED | |

### 3.8 Unknowns

| Topic | Status |
| ----- | ------ |
| Production use of class_fee_structure_assignment UI | UNVERIFIED |
| Automatic overdue status flipper/job | UNVERIFIED (status Overdue allowed in invoice constants) |
| Receipt printer branding per tenant runtime | UNVERIFIED |
| Multi-currency | Absent in code — INR assumptions LIKELY |

### Fee Q&A condensed

| Topic | Finding |
| ----- | ------- |
| Structure access | `/fees/setup`; FEE_MGMT + backend "Fees" |
| Fields | name, year, class, division, categories multi, total, installment_type, num installments, description, active, installment due dates/amounts |
| Class/year specific? | Yes both required |
| Copy? | No dedicated feature found |
| Student association | Enrollment assignment + optional student_fee_assignment APIs |
| Auto generate fees? | Assignment auto on enroll; invoices not |
| Discounts/concessions | Discounts yes; concessions as synonym no |
| Late fees | Model only |
| Outstanding | Invoice due_amount + report sums + due list formula |
| Multi pay components | Allocation API exists; UI is invoice-centric |
| Partial | Yes |
| Modes | CASH/UPI/BANK_TRANSFER |
| Reports | Fee Report + Due List; filters/export above |

---

## 4. Requirement Comparison (superseded detail)

Detailed reconciliation using the authoritative Sprint 1 business baseline is in **§ Requirement Reconciliation** below (post runtime verification). Section 4 historically used title-only PRE interpretation before full BRD text was supplied in the closure brief.

---

## 5. Cross-Module Dependencies

```
Lead(prefill) ──► Enrollment ──► Student
                      │
                      ├──► parents (LeadParent)
                      ├──► StudentFeeAssignment ──depends──► FeeStructure / FeeDiscount
                      └──► User (STUDENT)

StudentInvoice ──depends──► Student + FeeStructure + (optional fee_installment)
FeePayment ──depends──► Student + Invoice path
Academic Year / Class / Division ──required by── Enrollment + Fee Structure + Invoice generate
```

| Dependency | Description |
| ---------- | ----------- |
| Admissions → Fees | Enrollment requires fee_structure_id |
| Fees → Academic | Structures & reports filter by academic year/class |
| Students Admin → Admissions UI | Student add/edit reuses Enrollment page |
| Auth/RBAC | Menus/features control sidebar; feature codes guard React routes; menu names guard many FastAPI endpoints |

---

## 6. Discovery Confidence

| Area | Rating | Notes |
| ---- | ------ | ----- |
| Lead data model & conversion code | **CONFIRMED** | Traced end-to-end |
| Parent multi-child support | **CONFIRMED** (schema) | UI multi-child management not specialized |
| Parent login | **CONFIRMED absent** in enroll | USER role PARENT creatable elsewhere only? not enrollment |
| Fee structure CRUD code | **CONFIRMED** | |
| Invoice + payment + receipt | **CONFIRMED** | Invoice-centric UI path |
| Live menu for Leads per tenant | **UNVERIFIED** | Seed omits lead path |
| Live late fee behavior | **CONFIRMED not in collection** | fields exist unused |
| Requirements PRE text match | **CONFIRMED** against Sprint 1 closure brief | Spreadsheet file artifact still absent from repo |
| Runtime UI polish/bugs | **CONFIRMED partial** | Screenshots + notes under screenshots/ |

### Conflicts catalog

1. **Convert API vs Convert UI** — API stamp-only vs UI navigates to enrollment  
2. **Permission naming** — Frontend feature codes vs backend menu names `"Lead Management"` / `"Fees"` vs seed menu names  
3. **Payment method CARD** in service allow-list vs schema/UI  
4. **Fee due payment aggregation** installment ID semantics vs `FeePayment.fee_installment_id` FK target (`fee_installments`)  
5. **Dashboard** links some paths that may not match AppRoutes (e.g. `/fees/report` singular vs `/fees/reports`, `/fees/student-ledger`) — UI inconsistency risk; mark LIKELY broken links if not redirected  

---

## Appendix A — Part 4 Screen Inventory (consolidated)

See tables §2.1 and §3.1. All routes verified in `apps/web/src/routes/AppRoutes.tsx`.

## Appendix B — Part 5 / Part 6 diagrams (actual)

### Admissions relationship (actual)

```
LeadSource ──┐
LeadStatus ──┼── Lead ──► (optional converted_to_student_id) ──► Student
             │     │                                          │ parent_id
LeadFollowup ┘     └── parent_id ──► LeadParent (parents) ◄───┘
                                           │
                                           │ (no FK)
                                     User (STUDENT) matched by email/name
```

### Fee relationship (actual)

```
FeeCategory ──► FeeStructure ──► FeeInstallment
                     │
                     ├──► StudentFeeAssignment ──► StudentFeeDetail
                     │            │           └──► StudentFeeInstallment
                     │            └──► FeeLedger (per student/year name)
                     │
                     └──► StudentInvoice ──► FeePayment ──► FeePaymentAllocation
                                               └── receipt_number
```

## Appendix C — Sprint discovery report card

### Files inspected (primary set)

**Frontend:**  
`apps/web/src/routes/AppRoutes.tsx`  
`apps/web/src/pages/Admissions/*`  
`apps/web/src/pages/students/*`  
`apps/web/src/pages/Fees/*`  
`apps/web/src/api/services/{lead,enrollment,fee,invoice,feeCollection,feeReport,feesApi}Service*.ts`  
`apps/web/src/hooks/useLeadListController.ts`, fee/invoice controllers  
`apps/web/src/pages/Dashboard.tsx` (navigation)  
`apps/fastapi/scripts/seed_rbac.py` (menu hierarchy)  

**Backend:**  
`apps/fastapi/app/main.py`  
`apps/fastapi/app/routers/{lead,enrollment,student,fee,fee_collection,invoice,fee_report,fee_structure,student_fee_assignment,...}.py`  
`apps/fastapi/app/services/{lead_service,enrollment_service,student_service,student_fee_assignment_service,fee_collection_service,invoice_service,fee_report_service,fee_service,profile_image_service}.py`  
`apps/fastapi/app/models/{lead,student,user,fee,student_fee_assignment,student_invoice,fee_payment,fee_discount,student_fee_ledger}.py`  
`apps/fastapi/app/schemas/{lead,enrollment,fee_collection}.py`  
`apps/fastapi/app/utils/student_login_email.py`  
`apps/fastapi/app/core/dependencies.py`  
`apps/web/src/hooks/USE [erpdb].sql` (schema dump excerpts)  

**Requirements:**  
PRE-* document **not found** in repository.

### Screens discovered

Admissions: 8 listed in §2.1  
Fees: 14 listed in §3.1  

### APIs discovered (module-critical)

Leads CRUD/followups/convert; Enrollment prefill/enroll/upload; Students CRUD; Fee categories/structures; Student fee assign; Invoices list/detail/generate; Collection + receipts; Fee due list; Fee report  

### Database entities discovered

`parents`, `lead_sources`, `lead_statuses`, `leads`, `lead_followups`, `students`, `users`, `fee_categories`, `fee_structures`, `fee_installments`, `fee_discounts`, `student_fee_assignments`, `student_fee_details`, `student_fee_installments`, `student_invoices`, `fee_payments`, `fee_payment_allocations`, `fee_ledger`, class_fee_structure_assignment  

### Screenshots captured

**Usable (contentful) PNGs ≥ ~140KB:** ~30 files under `screenshots/` (v2/v3 SPA-nav captures). Multiple early blank PNGs (~5KB) remain from hard deep-link failures and are marked unusable.

### Confirmed findings (highlights)

- Lead + enrollment conversion pipeline exists and creates student, fee assignment, and student user (CODE)  
- Runtime lead list, add, edit visible under Admissions → Lead Management (RUNTIME)  
- Student Management list + Student Details show Parent Name + Fee Plan/discount amounts (RUNTIME)  
- User Management lists **Student** role users with names matching students and emails matching parent contact emails (RUNTIME)  
- Fee Category, Fee Structure (+ installment schedule), Invoice list/detail, Generate Invoice, Collect Payment entry form visible for this Admin (RUNTIME)  
- Fee menu for this tenant exposes only: Invoices / Invoice List / Fee Category / Fee Structure — not Discount / Due / Collection / Report as top-level labels (RUNTIME)  

### Unverified findings

- Full PRE spreadsheet **file** in repository (brief text now available and reconciled)  
- Live **Convert** click for non-converted lead (all listed leads showed **Converted**; convertCount=0)  
- Payment submit / receipt page after payment (not performed — no data change)  
- Late fee applied amounts on live UI schedules  
- Principal / Accountant role sessions 

### Conflicts

See §6 conflicts catalog + deep-link SPA 404 vs client routing  

### Current limitations

See §2.7, §3.7, and **Current-State Issues** below  

### Questions for human / BA clarification

1. Is the authoritative student registration path **Enrollment only**, or is `/api/students` still used in any school process?  
2. Should parents log in, or only students — UI shows Student-named accounts using parent emails.  
3. Should multi-guardian and sibling sharing be formally supported?  
4. What is the intended lead status catalog and terminal “Converted/Lost” rules?  
5. Why does `/convert` exist if enrollment is the conversion engine?  
6. Must invoices be generated after every enrollment, and by whom?  
7. Are class-level fee structure assignments still in scope or obsolete?  
8. What late-fee business rule should later redesign implement?  
9. Parent-as-login vs Student login policy confirmed with school ops.  
10. Should Discount / Due / Collection / Report appear in Fees menu for all tenants?  
11. Hosted deep-link reloads blank (asset 404) — known ops issue?  
12. Authoritative PRE text used from Sprint 1 closure brief; optional: store formal spreadsheet in repo for audit.  

---

## Runtime Verification

**Environment:** https://erpui.aaditechnology.com/  
**Tenant:** Aadi Tech  
**Actor:** Prajakta Jadhav — UI badge **Admin**  
**Login source:** QA-Automation `.env.example` documented test identity (read-only use)  
**Session date:** 2026-08-11  
**Constraints:** No lead/student/enrollment/payment create/update submitted after observation setup  

### Runtime notes on navigation

| Observation | Classification | Evidence |
| ----------- | -------------- | -------- |
| Hard browser navigation / full page load to `/admissions/leads`, `/fees/*` often yields **blank black page** (html ~943 bytes, console 404 on resources) | Technical | `runtime-notes-pass2.json` |
| Client-side navigation from sidebar/menu loads the same routes correctly | Technical | Pass3 SPA navigation succeeded |
| Soft deep links within SPA after login work (e.g. invoice detail, collect-payment) | Runtime | invoice → collect URL |

### Workflow A — Runtime answers (UI observation)

| # | Question | Runtime observation | Confidence | Evidence |
| - | -------- | -------------------- | ---------- | -------- |
| 1 | How does user move from Lead to Enrollment? | Not observed for a **non-Converted** lead (all visible list rows Status=Converted). Code/UI still labels Convert icon, but **convertCount=0** in live list of 16. Separate Student path: Students list Edit opens Enrollment form. | CONFLICT with expected active convert path / CONFIRMED converted-only list | `runtime-notes-pass3.json`; screenshot SS-A-01-lead-list-v2 |
| 2 | Convert action on Lead screen? | **Not visible** on any current row when Status=Converted (expected: convert icon only for non-converted). Edit and Delete row actions present. | CONFIRMED for this dataset | SS-A-01; convertCount 0 |
| 3 | Does Convert create Student immediately? | **Runtime not demonstrated** (no convert control available). Code: Convert navigates to enrollment; API `/convert` does not create student. | CODE for mechanism; RUNTIME NOT for live click | prior discovery + convertCount 0 |
| 4 | Does Enrollment create Student? | Not re-executed (no create). Existing students, admission nos, and linked Parent/Fee on detail imply prior enrollment/admission. | LIKELY (history) | SS-A-07-student-view |
| 5 | Parent info on enrollment | Student Edit (enrollment screen) shows **PARENT DETAILS**: Parent Name*, Contact Number*, Email Address* | CONFIRMED | SS-A-07b-student-edit |
| 6 | Parent copied from Lead? | Lead Edit has Parent/Guardian section overlapping fields. Student After: Parent Name / Mobile shown. Live convert prefill **not captured**. | LIKELY from code + field parity; RUNTIME partial | SS-A-03; SS-A-07 |
| 7 | Parent re-entered? | Enrollment parent fields are editable on form (shown as entry fields). Not proven that blank enrollment requires retype after lead prefill. | PARTIAL RUNTIME | SS-A-07b |
| 8 | Parent reused if present? | UI does not show “select existing parent” control. Multiple students can share related contact patterns (list observation) without UI messaging about reuse. | UNVERIFIED at UI | — |
| 9 | User/Login created? | **User Management lists Student role users** (15 users incl. multiple **Student**). | CONFIRMED | SS-A-09-users-full; pass4 notes |
| 10 | Whose account? | User **full name = student first name** (e.g. Neha, Priya, Atharv). | CONFIRMED | pass4 usersBody |
| 11 | Parent or Student account? | Role column **Student** (not Parent). | CONFIRMED | pass4 usersBody |
| 12 | How UI shows Student–Parent–User relationship? | **No single relationship screen.** Student Details shows Parent Name + Mobile + student email. Users list separately shows Student + matching parent email. No parent_id/user_id displayed as IDs. | CONFIRMED | SS-A-07-student-view; SS-A-09 |

**Example observed triple (RUNTIME):**
- Student Details: **Neha**, ADM-22-000001, Parent **Vilas Patil**, Mobile 7856231425, email vilaspatil@gmail.com, Fee Plan **Annual Fee**, Final **INR 2000.00**
- Users: **Neha** / vilaspatil@gmail.com / **Student**

### Workflow B — Fee runtime chain

| Step | Runtime | Auto/Manual | Notes |
| ---- | ------- | ----------- | ----- |
| Fee Category | Menu → Fee Category: rows class, name, amount, status | Manual create (list exists) | SS-B-menu-fee-category-v2 |
| Fee Structure | Menu → Fee Structure list year/class filters | Manual | SS-B-menu-fee-structure-v2 |
| Fee Installment | Structure edit shows Quarterly schedule Installment 1–4 amounts/due | Defined with structure | SS-B-03-fee-structure-edit-installments-v2 |
| Student Fee Assignment | No dedicated “Assign Fee” menu item for this tenant; **Student Edit FEE DETAILS** shows Fee Plan*, Discount, Total/Discount/Final | Happens at enrollment (code); **visible on student form** | SS-A-07b |
| Invoice | Invoice List 14 rows; amounts paid/due/status | Manual Generate Invoice | SS-B-menu-invoice-list-v2; SS-B-05b |
| Payment | Collect form from Pay Now on pending invoice; amount ≤ due; modes Cash etc. | Manual; partial amount field present | SS-B-06-collect-payment-v2 |
| Receipt | Full Receipt control seen on paid invoice detail; post-payment receipt route not opened after submit | Manual after pay | SS-B-05c-invoice-detail-v2 (Receipt button label); receipt after collect RUNTIME NOT submitted |

**Runtime fee menu (this Admin/tenant):**  
Fees → **Invoices**, **Invoice List**, **Fee Category**, **Fee Structure** only.  
**Missing from expanded Fees sidebar for this session:** Fee Discount, Fee Due List, Fee Collection, Fee Report (RUNTIME — routes may still exist via code but not shown).

| Concern | Runtime finding |
| ------- | --------------- |
| Student Fee Assignment timing | Shown post-facto on Student Edit with Final Amount; no separate assignment wizard in menu |
| Invoice generation | Manual **Generate Invoice** form; copy states *“Individual student discounts will be applied automatically during generation.”* |
| Partial payments | Collect form: Payment Amount editable; helper “Maximum balance: ₹500” for INV-05 due ₹500 |
| Multi components together | Collect is **invoice-locked** (“Invoice is locked from Invoice Detail: INV-05”) — one invoice/installment context |
| Discounts | Student fee Final Amount vs list; Generate Invoice text claims auto apply; late fee **not shown** on install schedule UI captured |
| Outstanding display | Invoice list Due column; invoice detail DUE BALANCE; collect max balance |

---

## Screenshot Index

| Screenshot ID | Screen name | Route | Role | Workflow step | Demonstrates | Status |
| ------------- | ----------- | ----- | ---- | ------------- | ------------ | ------ |
| SS-00-dashboard / pass3 | Dashboard | `/` | Admin | Entry | Tenant Aadi Tech; Active Students 16 | CAPTURED |
| SS-00b-sidebar-menu | Side navigation | `/` | Admin | Nav | Modules: Admissions, Fees, … | CAPTURED |
| SS-A-00-admissions-menu(-v2) | Admissions expand | `/` | Admin | A-entry | Child **Lead Management** | CAPTURED |
| SS-A-01-lead-list-v2 | Lead Management list | `/admissions/leads` | Admin | A1 | 16 leads; Status chip Converted; columns Lead#/Child/Parent/Source/Status | CAPTURED |
| SS-A-02-lead-add-v2 | Add Lead | `/admissions/leads/add` | Admin | A2 | Parent/Guardian + Child + Lead Details form | CAPTURED |
| SS-A-03-lead-edit-v2 | Edit Lead | `/admissions/leads/55/edit` | Admin | A3/A4 | Prefill lead with Status Converted; Parent/Child/Lead sections | CAPTURED |
| SS-A-04 convert | Convert → Enrollment | — | Admin | A convert | **RUNTIME NOT VERIFIED** (no Convert control on Converted rows) | NOT VERIFIED |
| SS-A-05 enrollment blank | Enrollment | `/admissions/enrollment` | Admin | A5 | Hard deep-link blank; SPA path via student edit used instead | PARTIAL |
| SS-A-06-students | Student Management | `/students` | Admin | A6 | Student list search/filters; active students | CAPTURED |
| SS-A-07-student-view | Student Details | `/students/245/view?…` | Admin | A7–A8 | Parent block + Academic + Fee plan/final amount | CAPTURED |
| SS-A-07b-student-edit | Student Edit / Enrollment form | `/admissions/enrollment?studentId=245&mode=edit…` | Admin | A5–A6 | Parent fields + Fee Details + Document uploads | CAPTURED |
| SS-A-09-users(-full) | User Management | `/users` | Admin | A9–A10 | Admin/Teacher/**Student** accounts | CAPTURED |
| SS-A-08-profile | My Profile | `/profile` | Admin | account | Admin profile — not student/parent | CAPTURED |
| SS-B-00-fees-menu | Fees expand | `/` | Admin | B-entry | Invoices, Invoice List, Fee Category, Fee Structure | CAPTURED |
| SS-B-menu-fee-category-v2 | Fee Category | `/fees/categories` | Admin | B1 | Categories by class with amounts | CAPTURED |
| SS-B-menu-fee-structure-v2 | Fee Structure | `/fees/setup` | Admin | B2 | Structures by class/year/type/total | CAPTURED |
| SS-B-03-…installments-v2 | Edit Structure / Installments | `/fees/setup/101/edit` | Admin | B3 | Quarterly 4 installments schedule | CAPTURED |
| SS-A-07 / 07b | Student fee assignment | student routes | Admin | B4 | Fee Plan Annual Fee / Final 2000 | CAPTURED |
| SS-B-menu-invoice-list-v2 | Invoice List | `/fees/invoices` | Admin | B5 | Paid/Pending due amounts | CAPTURED |
| SS-B-05b-generate-invoice-v2 | Generate Invoice | `/fees/generate-invoice` | Admin | B5 gen | Manual generation form + discount note | CAPTURED |
| SS-B-05c-invoice-detail-v2 / detail-4 | Invoice Detail | `/fees/invoices/{id}/detail` | Admin | B5 detail | Student + due + Pay Now/Receipt | CAPTURED |
| SS-B-06-collect-payment-v2 | Fee Collection / Payment Entry | `/fees/collect-payment` | Admin | B6–B7 | Invoice-locked collect; amount, mode, bank fields | CAPTURED |
| SS-B-08 receipt | Receipt | `/fees/receipt/...` | Admin | B8 | **RUNTIME NOT VERIFIED** (Payment not submitted) | NOT VERIFIED |
| Fee Discount / Due / Report UI | — | codes paths exist | Admin | B9–B10 | **Not in Fees menu for this tenant** | NOT VERIFIED (menu absent) |

Usable artifacts live under:  
`product-discovery/sprint-01-current-state/screenshots/`  
Notes: `runtime-notes.json`, `runtime-notes-pass2.json`, `runtime-notes-pass3.json`, `runtime-notes-pass4.json`

---

## Preserved Discovery Findings — Verification

The following findings from prior discovery were re-checked against existing code + runtime evidence (no new capture). Status applies to Sprint 1 exit.

| # | Finding | Verdict | Evidence (existing) |
| - | ------- | ------- | ------------------- |
| 1 | Lead exists at `/admissions/leads` | **CONFIRMED** | AppRoutes; runtime SS-A-01; pass3 body Lead Management list |
| 2 | Authoritative student creation path is `EnrollmentService.enroll` | **CONFIRMED** | enrollment_service; UI Convert → Enrollment; `/students/add` redirects to enrollment; alternate `POST /api/students` remains secondary |
| 3 | `POST …/convert` does not create Student; only timestamps conversion | **CONFIRMED** (CODE) | `lead_service.convert_lead`; UI does not call this for Create Student |
| 4 | Parent is a shared `parents` record | **CONFIRMED** | LeadParent model / `parents` table; get-or-create by mobile |
| 5 | Student has `parent_id` | **CONFIRMED** | Student model |
| 6 | One parent can have multiple students | **CONFIRMED** (schema); **LIKELY** (runtime patterns) | Model allows shared `parent_id`; list shows sibling-like parent contacts (e.g. same mobile on related names) without explicit multi-child UI |
| 7 | Parent is not currently a login User | **CONFIRMED** | Enrollment creates role STUDENT; Users list shows Student (not Parent) accounts |
| 8 | Enrollment creates STUDENT login/user, not Parent login | **CONFIRMED** | enrollment user-create block; SS-A-09 usersBody role Student |
| 9 | Student/User has no proper FK; email/name heuristic | **CONFIRMED** | User model lacks student_id/parent_id; `_resolve_user_for_student`; runtime Neha = student name + parent email |
| 10 | PRE-004 Admission Approval appears not implemented | **CONFIRMED** gap | No approval model/UI/routes; students ACTIVE without Principal approval path |
| 11 | Fee assignment occurs during enrollment | **CONFIRMED** (CODE); **LIKELY** (runtime) | enroll assigns fee structure; student edit shows FEE DETAILS / Fee Plan / Final amount |
| 12 | Student invoices generated separately (not auto at enroll) | **CONFIRMED** | Separate Generate Invoice screen/API; enrollment does not create invoices |
| 13 | Late-fee fields exist; collection does not apply late fees | **CONFIRMED** (CODE); **RUNTIME partial** | FeeInstallment late_fee_* columns; `collect_invoice_payment` does not apply; installment schedule UI showed amount/due only |
| 14 | Frontend and backend RBAC/menu naming inconsistencies | **CONFIRMED** | Feature codes (`ADMISSIONS_MGMT`, `FEE_MGMT`, `ADMIN_MGMT`) vs backend menu names `"Lead Management"` / `"Fees"` vs seed names vs live Fees menu subset |

---

## Requirement Reconciliation

**Authoritative source:** Sprint 1 closure brief (PRE-002, PRE-003, PRE-004, PRE-008, PRE-014, PRE-015, PRE-016 full business text).  

**Repo artifact:** Standalone requirements spreadsheet still **not found** in the product repository (**Documentation** gap for file storage only — brief text is used as the business baseline).

Comparison is against **actual business behavior**, not screen titles alone. Where code and runtime disagree, both are recorded.

| Requirement | Requirement Intent | Current Implementation | Runtime Evidence | Gap | Gap Type | Confidence |
| ----------- | ------------------ | ---------------------- | ---------------- | --- | -------- | ---------- |
| **PRE-002 — Register Student** (Admissions / Student Registration / Admin; inputs Student & Parent Details; rule: Admission No unique; output: Student created; Priority High) | Capture complete personal, academic, and parent details and create an active student record with a unique Admission No. | Primary path: **Enrollment** (`EnrollmentService.enroll`) collects student personal fields, class/academic year/division, parent name/mobile/email, fee plan, optional lead prefill; creates `students` (+ parent get-or-create); auto-generates `ADM-{tenant}-######` when admission_no omitted, with sequence collision avoidance. Alternate: `POST /api/students` creates student without fee assignment / lead conversion. Screen naming is **Enrollment / Student Edit**, not “Student Registration”. Academic registration is coupled to fee structure selection. | SS-A-06 Student Management; SS-A-07 Student Details (personal + parent + fee); SS-A-07b enrollment-style edit (parent + academic + fee + docs); ADM-* values on invoices/students. Live **new** enroll submit not executed. Convert→enroll unobserved (all sample leads Converted). | Behavior exists under Enrollment with parent + academic fields and student create. Gaps: (1) dual create paths (enroll vs `POST /api/students`); (2) no dedicated “Student Registration” framing/state machine; (3) fee plan required as part of enroll (broader than personal/academic/parent-only); (4) Admission No uniqueness is sequence-based generation (CODE) but formal DB uniqueness constraint not re-verified beyond generation logic; (5) convert path not live-exercised. | Functional (secondary path inconsistency); Business Rule (admission uniqueness enforcement surface); Workflow (Lead convert vs direct enroll); UX (screen naming) | **HIGH** on present create capability (CODE + historical students RUNTIME); **MEDIUM** on full formal uniqueness/constraint and live new-create path |
| **PRE-003 — Upload Documents** (Admissions / Student Registration / Admin; inputs Birth Certificate, Aadhaar, Photo; rule: mandatory documents configurable; output: Documents stored; Priority High) | Securely store required student documents with configurable mandatory set. | Enrollment upload API supports `document_type` of **birth_certificate** and **photo** only; stores URLs on student. UI shows **DOCUMENTS UPLOAD** section on enrollment/edit form. No Aadhaar document type. No configuration API/UI for mandatory document checklist. | SS-A-07b documents section (birth certificate + photo). Upload submit not re-exercised end-to-end. No Aadhaar control observed. | Partial: Birth Certificate + Photo supported. Missing: **Aadhaar** document type; configurable mandatory documents; no “secure storage policy” beyond file URL storage path; not gated by approval. | Functional; Business Rule; Data Model | **HIGH** gap vs inputs/rule; **MEDIUM** on storage “secure” claim (path exists; hardening not assessed) |
| **PRE-004 — Admission Approval** (Admissions / Student Registration / Principal; input Student Record; rule: Approved students only become active; output: Admission Status; Priority High) | Principal approves or rejects admission; only approved students become active; status as output. | **No** admission-approval entity, Principal-only approval UI, or status transition workflow found. Lead has statuses (e.g. Converted) but that is enquiry status, not Principal admission approval. Students observed as **ACTIVE** without an approval step. Enrollment create effectively produces student without Principal gate. | No approval screen in Admissions menu. Student list statuses ACTIVE (SS-A-06). Actor was Admin only — Principal role UX not observed. | **Not implemented** relative to requirement intent. Lead status is not a substitute for Principal admission approval / activation gate. | Functional; Workflow; Permission/RBAC; Business Rule | **HIGH** (absence CONFIRMED by code inventory + no runtime UI); Principal actor path UNVERIFIED |
| **PRE-008 — Student Search** (Students / Student List / Admin; inputs Name, Class; rule: Fast search; output: Student List; Priority High) | Search students using multiple filters (at least Name, Class); return student list quickly. | Student Management list (`/students`) provides search + class / division / status filters; returns student directory. Backend student list/search APIs support filtering. No separate “advanced multi-field search engine” product; performance not load-tested. | SS-A-06 Student Management list with filters and rows of active students. | **None** for core Name/Class-oriented list search at Admin UX. Minor: other filters exist (division/status); “fast” is qualitative only — no perf evidence. Not a cross-entity parent+student global search. | None (primary intent); UX (scope of multi-filter beyond Name/Class is broader/narrower depending on interpretation) | **HIGH** match for list-level search |
| **PRE-014 — Configure Fees** (Fees / Fee Structure / Admin; inputs Fee Components; rule: No duplicate fee structure; output: Fee Structure Saved; Priority High) | Define fee structure by class from fee components; prevent duplicate structures; save structure. | **Fee Category** (components) + **Fee Structure** by class/academic year (optional division) + installment schedule. Structure CRUD save via UI/API. “No duplicate fee structure” **hard uniqueness rule not confirmed** as enforced (student assignment uniqueness was explicitly relaxed; structure-level unique key by class/year not established as hard constraint in discovery). Multiple structures can list for same class (RUNTIME: multiple Nursury/Junior KG structures). Late-fee columns on installments exist but are not used at collection. Discount module exists in code but not in this tenant Fees menu. | SS-B-menu-fee-category-v2; SS-B-menu-fee-structure-v2; SS-B-03 installments. Structures saved list visible. Multiple structures per class environment present. | Config by class + components **present**. Gaps: (1) duplicate-prevention business rule **not clearly enforced** (multiple structures per class observed); (2) Discount not in runtime Fees menu; (3) late fee not part of operative configuration UX. | Functional / Business Rule (duplicate rule); UX (menu completeness for discounts); Data Model (late fee unused) | **HIGH** for configure+save; **MEDIUM** on “no duplicate” compliance; **HIGH** that late fee is not operational |
| **PRE-015 — Collect Fees** (Fees / Fee Collection / Accountant; input Amount; rule: Cannot exceed pending amount; output: Receipt Generated; Priority High) | Accountant receives payments from parents; amount cannot exceed pending; receipt generated. | Invoice-centric collection: Invoice Detail → Pay Now → Collect Payment form; service validates amount > 0 and ≤ invoice `due_amount`; creates FeePayment + optional allocation; updates invoice/ledger; assigns `receipt_number`. UI modes Cash / UPI / Bank Transfer. Partial payment supported (editable amount with max balance helper). Standalone Fees → “Fee Collection” **not** in this tenant sidebar; path reached via invoice. Primary runtime actor **Admin**, not Accountant. Receipt **button** on paid invoices; post-submit receipt page **not** executed (no payment written in discovery). | SS-B-05c paid invoice shows Full Receipt + Pay Now; SS-B-06 collect: invoice locked, max balance ₹500 = due; payment modes present. Receipt route exists in code; live generate after pay **NOT VERIFIED**. | Core collect path + overpayment block **present** (CODE+RUNTIME form). Gaps: (1) primary user Accountant vs observed Admin/RBAC unproven; (2) menu discoverability (collection not top-level for tenant); (3) receipt lifecycle after submit not runtime-confirmed; (4) invoices must exist first (prerequisite workflow); (5) late fee not applied at collect. | Business Rule (**None** for overpayment block); Workflow (invoice-first); Permission/RBAC (Accountant); UX (menu); Documentation/test limit (receipt after pay) | **HIGH** for amount cap + collect form; **MEDIUM** for receipt generation end-to-end; **LOW** for Accountant role runtime |
| **PRE-016 — Fee Reports** (Fees / Fee Reports / Accountant; input Date Range; rule: Filter by class; output: Reports; Priority Medium) | Generate outstanding and collection reports; date range; class filter. | **FeeReportPage** + fee_report_service: filters academic year, class, installment, search, start/end date; summary totals + grid + client CSV. **Fee Due List** for outstanding-style view. Backend report route uses authenticated user only (weaker than menu permission pattern). **This Admin’s Fees sidebar does not expose Fee Report or Fee Due** (routes may exist; SPA deep-link fragile). | Fees menu capture (Invoices, Invoice List, Fee Category, Fee Structure only). Menu items for Report/Due missing (`runtime-notes-pass3` missing flags). Report screen content **not** captured for this tenant session. | Report capability **LIKELY present in code** but **not available in observed runtime menu** for Admin on Aadi Tech tenant. Outstanding/collection surfaces partially serve via Invoice list Due/Paid columns. | Permission/RBAC; UX; Workflow (access); Functional (if menu omission = effectively unavailable) | **HIGH** on menu absence RUNTIME; **LIKELY** on code report capability; **UNVERIFIED** on live report rendering for this tenant |

**Conflicts recorded (code vs runtime):**

| Topic | Code evidence | Runtime evidence | Classification |
| ----- | ------------- | ---------------- | -------------- |
| Convert → Student | UI navigates to Enrollment; `/convert` API stamps only | Convert control absent (all Converted); conversion click **not** observed | CONFLICT for operable convert path on this dataset; CODE conflict Convert API vs Convert UI intent |
| Fee Report / Due / Discount / Collection menu | Frontend routes + pages exist | Fees sidebar omits them for this Admin/tenant | CONFLICT access vs capability |
| Receipt after payment | Receipt routes + receipt_number generation in collection service | Receipt button on paid invoice; new payment not submitted | Not a contradiction — RUNTIME incomplete for post-pay path |
| Parent as user | No Parent user from enroll | Users show Student role only | CONFIRMED agreement (Parent login absent) |

**Product capabilities present but outside this PRE set (examples):** Lead Management (list/add/edit, sources, statuses); Lead→Enrollment conversion pipeline; Student role login auto-create; Generate Invoice; Fee ledger; Dashboard shortcuts; follow-up API without primary UI.

---

## Confirmed Current Flows

### Admissions (as operated)

```
Sidebar → Admissions → Lead Management (list)
   → Add Lead (parent + child + status/source)
   → Edit Lead (same fields)
   → [Convert when not converted] → Enrollment  (RUNTIME: sample all Converted; convertCount=0)
Sidebar / Student Management
   → View Student Details (parent + fee summary)
   → Edit → Enrollment form (parent + academic + fee + documents)
User Management
   → Student login accounts (name = student, email often parent email)
```

### Fees (as operated by this Admin)

```
Sidebar → Fees → Fee Category / Fee Structure (configure)
                → (installments inside structure edit)
Student Edit shows FEE DETAILS (assignment result of enrollment — CODE)
Sidebar → Fees → Invoice List → Generate Invoice (manual)
                → Invoice Detail → Pay Now (if due) → Collect Payment form
                → Full Receipt control (paid context; after-pay submit not executed)
```

Steps: **Configure (manual)** → **Assign at enrollment (CODE automatic)** → **Invoice generate (manual)** → **Collect (manual)** → **Receipt (after pay)**.

---

## Remaining Unknowns

| Unknown | Why still open | Who decides |
| ------- | -------------- | ----------- |
| Live Convert → Enrollment prefill for a **non-Converted** lead | Sample had no non-Converted lead; creating data forbidden in discovery | Technical (test data) |
| Parent reuse UX / mobile conflict messaging | Not triggered | Technical |
| Receipt layout after live payment submit | Payment intentionally not submitted | Technical |
| Whether Fee Report / Due / Discount appear under other roles or manual menu grants | Not in this Admin Fees menu | Business (menu entitlements) + Technical |
| Principal admission approval expectations vs Lead status only | PRE-004 absent in product | Business |
| Whether Parent should ever be a login user | Currently Student accounts use parent email | Business |
| Whether `/convert` stamp API is still intentional | Superseded by Enrollment in UI | Business + Technical |
| Whether structure uniqueness must be enforced | Multiple structures per class observed | Business |
| Whether Aadhaar + mandatory doc config are required immediately | PRE-003 specifies them; product has birth cert + photo only | Business |
| Accountant-only fee collection / reports enforcement | Only Admin exercised | Business (RBAC) |
| Live deep-link blank SPA asset 404 | Environment/ops | Technical |

---

## Current-State Issues

| ID | Issue | Classification | Evidence |
| -- | ----- | -------------- | -------- |
| I-01 | All sample leads already Converted → no Convert control → conversion flow not operable without new lead | Workflow / UX | convertCount=0; SS-A-01 |
| I-02 | Student↔Parent↔User relationship not shown on one screen | UX / Data Model | Separate Students vs Users pages |
| I-03 | Login named as Student using parent email (role STUDENT) | Business Rule / Data Model | pass4 users list + student view |
| I-04 | Hard refresh / deep link to lead & fee routes blanks SPA (404 assets) | Technical | pass2 console 404 |
| I-05 | Fees sidebar omits Due List, Discount, Collection, Report for this tenant | Permission/RBAC / UX | SS-B-00 fees menu |
| I-06 | No Admission Approval workflow (PRE-004) | Functional / Workflow / Permission/RBAC | No UI/model |
| I-07 | Invoice generation is separate manual step after fee assignment | Workflow | Generate Invoice form |
| I-08 | Collect UI invoice-locked — not multi-invoice batch collect | Workflow / UX | SS-B-06 locked invoice |
| I-09 | Receipt after new payment not verified live | Documentation / test limit | pay not submitted |
| I-10 | Requirements spreadsheet file missing from repository (brief text used) | Documentation | repo search |
| I-11 | Late fee fields not applied / not visible on installment schedule UI | Data Model / Business Rule | SS-B-03; collection service |
| I-12 | Terminology inconsistencies in live master data (e.g. Nursury, Tution Fee) | UX / Data quality | category & invoice text |
| I-13 | PRE-003 Aadhaar + configurable mandatory documents absent | Functional / Business Rule | upload-document types |
| I-14 | Dual student create paths (Enrollment vs `POST /api/students`) | Functional / Workflow | student_service vs enrollment_service |
| I-15 | Frontend feature codes vs backend menu name permission strings | Permission/RBAC | AppRoutes vs require_permission |

---

# Sprint 1 — Current Product Baseline

> Frozen understanding of **current** product behavior for Lead → Student → Parent/User and Fee Management. No redesign. No target-state screens. No application code changes.

## A. Lead → Student → Parent/User

### Current Purpose

Support school enquiry capture (**Lead**), conversion into a school **Student** with linked **Parent** contact data, and creation of a **Student-role User** login. Ongoing maintenance is via Student Management / Enrollment form, not a separate parent portal.

### Current Screens

| Screen | Route (representative) | Role observed |
| ------ | ---------------------- | ------------- |
| Lead Management list | `/admissions/leads` | Admin |
| Add Lead | `/admissions/leads/add` | Admin |
| Edit Lead | `/admissions/leads/:id/edit` | Admin |
| Enrollment (blank / from-lead / student edit-view) | `/admissions/enrollment` (+ variants) | Admin |
| Enrollment print | `/admissions/enrollment/print` | Admin |
| Student Management list | `/students` | Admin |
| Student Details view | `/students/:id/view` | Admin |
| User Management | `/users` | Admin |

Not present: dedicated Student Registration labeled screen, multi-guardian editor, Principal admission approval, Parent user registration portal.

### Current User Flow

1. Admin captures Lead (parent + child + source/status/class preference).  
2. Intended conversion: Lead **Convert** → Enrollment prefill → submit enroll (**CODE**; RUNTIME convert not exercised — all listed leads Converted).  
3. Alternate: Students **Add** → Enrollment without lead.  
4. Enroll creates Student, reuses/creates Parent by mobile, fee assignment, marks Lead converted when applicable, attempts Student User create.  
5. Admin maintains student via View/Edit (Enrollment form).  
6. User Management separately shows Student accounts (child name + often parent email).

### Current Roles

| Role | Observed use |
| ---- | ------------ |
| Admin | Full discovery actor; admissions + students + users |
| Principal | **Not observed**; PRE-004 actor — no approval UI |
| Parent | Contact entity only — **not** a login role from enrollment |
| Student | Login role created at enroll; not a parent portal role |

Frontend feature codes: `ADMISSIONS_MGMT`, `ADMIN_MGMT`. Backend often checks menu name **Lead Management**.

### Current Entities

`leads`, `parents` (LeadParent), `lead_sources`, `lead_statuses`, `lead_followups`, `students`, `users` (+ roles M2M).

### Current Relationships

```
Lead N──1 Parent
Student N──1 Parent          (single parent_id; multi-parent unsupported)
Lead 0..1──► Student         (converted_to_student_id)
Parent 1──N Student          (allowed)
User ⟂ Parent / Student     (no FK; resolve by email/name; role STUDENT)
```

### Current Business Rules

1. Parent get-or-create by tenant + mobile.  
2. Enroll rejects already-converted lead (`converted_to_student_id` set).  
3. Admission No auto `ADM-{tenant}-{6 digits}` if omitted.  
4. Enrollment requires email; fee_structure_id required for fee assignment path.  
5. User creation prefers parent/student email; sibling collision → tagged local-part; non-fatal if user create fails.  
6. Default student password uses mobile (or fallback) — security limitation.  
7. Single parent FK only.  
8. `POST /convert` stamps conversion time only — does **not** create Student.  

### Current Runtime Evidence

- Lead list 16 Converted leads (SS-A-01; convertCount=0).  
- Add/Edit Lead parent + child forms (SS-A-02, SS-A-03).  
- Student list/detail with Parent Name, Mobile, Fee Plan, ACTIVE (SS-A-06, SS-A-07).  
- Enrollment-style edit: parent + fee + documents (SS-A-07b).  
- Users: Student role, names = students, emails often parent-like (SS-A-09; Neha / vilaspatil@gmail.com example).  
- Hard deep-link blank vs SPA navigation works (technical env issue).

### Current Limitations

See I-01–I-04, I-06, I-13, I-14, I-15. Dual conversion semantics; no approval; Parent not login; heuristic User link; deep-link SPA fragility.

### Requirement Gaps

| PRE | Gap summary | Gap Type |
| --- | ----------- | -------- |
| PRE-002 | Present as Enrollment; dual paths; naming/workflow differ from “Student Registration” | Functional / Workflow / UX |
| PRE-003 | Birth cert + photo only; no Aadhaar; mandatory docs not configurable | Functional / Business Rule / Data Model |
| PRE-004 | **Missing** Principal approve/reject + activation gate | Functional / Workflow / Permission/RBAC / Business Rule |
| PRE-008 | Substantially met via Student List filters | None (primary) |

### Open Business Questions

1. Is Enrollment the **only** allowed student create path going forward (retire `/api/students` for ops)?  
2. Must Parent become a login user, or is Student-named login with parent email intentional?  
3. What multi-guardian / multi-parent product rules apply?  
4. What is the official Principal admission approval chain vs Lead status “Converted”?  
5. Should Aadhaar and configurable mandatory documents be in scope for baseline compliance?  
6. Is `/convert` stamp API retained or obsolete?

---

## B. Fee Management

### Current Purpose

Configure class-oriented fee products (category + structure + installments), attach a fee plan to a student at enrollment, **manually** generate installment invoices, collect payments against invoice balance, and retain payment/receipt records. Reporting and due-list code exists; not exposed in the observed Admin Fees menu for the Aadi Tech tenant session.

### Current Screens

| Screen | Route (representative) | Runtime menu (Admin Aadi Tech) |
| ------ | ---------------------- | ------------------------------ |
| Fee Category | `/fees/categories` | Visible |
| Fee Structure list/edit | `/fees/setup`, `…/edit` | Visible (installments in edit) |
| Invoice List | `/fees/invoices` | Visible |
| Generate Invoice | `/fees/generate-invoice` | Via invoice actions |
| Invoice Detail | `/fees/invoices/:id/detail` | Soft nav |
| Collect Payment | `/fees/collect-payment` | Via Pay Now (not top-level menu) |
| Receipt | `/fees/receipt/…` | Control on paid invoice; post-pay not executed |
| Fee Discount / Due List / Fee Report | code routes | **Not** in observed Fees sidebar |

Student Edit shows fee plan totals as assignment outcome.

### Current User Flow

1. Admin configures Fee Category → Fee Structure (+ installment schedule).  
2. At enrollment, student receives StudentFeeAssignment for selected structure (CODE).  
3. Admin generates StudentInvoice(s) via Generate Invoice (manual, by class/structure/installment).  
4. Admin opens pending invoice → Pay Now → enters amount ≤ due, mode, optional bank fields → collect (submit not done in discovery).  
5. Payment allocates, updates invoice paid/due/status, updates FeeLedger; receipt_number assigned (CODE).  
6. Reports: intended via Fee Report / Due List (code); **not** menu-reachable for this Admin session.

### Current Roles

| Role | Requirement actor | Runtime observation |
| ---- | ----------------- | ------------------- |
| Admin | Config + often ops | **Observed** configuring and collecting |
| Accountant | PRE-015 / PRE-016 | **Not observed** |
| Frontend | `FEE_MGMT:*` | Guards fee pages |
| Backend | Often menu `"Fees"`; report auth weaker | Naming conflict with fine-grained seed menus |

### Current Entities

`fee_categories`, `fee_structures`, `fee_installments`, `fee_discounts`, `student_fee_assignments`, `student_fee_details`, `student_fee_installments`, `student_invoices`, `fee_payments`, `fee_payment_allocations`, `fee_ledger`, class_fee_structure_assignment (parallel/legacy).

### Current Relationships

```
FeeCategory ──► FeeStructure ──► FeeInstallment (late_fee_* stored, unused at collect)
                     │
                     ▼
           StudentFeeAssignment ──► StudentFeeDetail / StudentFeeInstallment
                     │
                     ▼ (manual generate)
              StudentInvoice ──► FeePayment (+ Allocation) ── receipt_number
                     │
                     └── FeeLedger (student + academic year name string)
Enrollment ──requires──► fee_structure_id ──creates──► StudentFeeAssignment
```

### Current Business Rules

1. Structure scoped by tenant, class, academic year (optional division).  
2. Installment type drives schedule counts (MONTHLY/QUARTERLY/YEARLY) in form config.  
3. Overpayment blocked: payment ≤ invoice `due_amount`.  
4. Non-cash requires reference; bank fields for BANK_TRANSFER.  
5. Partial payment supported.  
6. Invoices not auto-created at enrollment.  
7. Late fees **not** applied during invoice collection path.  
8. “No duplicate fee structure” **not** observed as hard exclusivity (multiple structures per class present).  
9. Assignment uniqueness relaxed (multiple assignments per student/year possible in service).  

### Current Runtime Evidence

- Fee Category and Structure lists with class amounts (SS-B category/structure).  
- Quarterly installment schedule amount + due only (SS-B-03).  
- Student Fee Plan / Final amount on student screens.  
- Invoice directory Paid/Pending with Due amounts (SS-B invoice list).  
- Generate Invoice form + discount auto-apply note.  
- Collect form locked to INV-05, max ₹500 (SS-B-06).  
- Fees menu only: Invoices, Invoice List, Fee Category, Fee Structure.

### Current Limitations

See I-05, I-07–I-09, I-11–I-12. Invoice-first collection; incomplete report menu access; late fees inert; RBAC naming; ledger by year **name**.

### Requirement Gaps

| PRE | Gap summary | Gap Type |
| --- | ----------- | -------- |
| PRE-014 | Structure config exists; duplicate prevention not clearly enforced; components via categories | Business Rule (duplicates); partial None for core configure |
| PRE-015 | Collect + amount cap present; Accountant role / receipt after pay incomplete; collection menu hidden | Permission/RBAC; Workflow; UX; test-limit Documentation |
| PRE-016 | Report code LIKELY; **unavailable** in observed Admin Fees menu; class + date filters in code | Permission/RBAC; UX; Functional (effective access) |

### Open Business Questions

1. Must Fee Report / Due List / Discount / Collection be granted for all tenants by default?  
2. Who owns invoice generation after every enrollment?  
3. Is class-level fee structure assignment still in business scope?  
4. What late-fee rule should apply (fields exist unused)?  
5. Enforce one structure per class/year or allow multiples?  
6. Is collection restricted to Accountant, or may Admin collect?

---

## C. Cross-Feature Dependencies

| From | To | Dependency nature |
| ---- | -- | ----------------- |
| **Lead** | **Parent** | Required `parent_id`; parent created/reused on lead create |
| **Lead** | **Student** | Optional `converted_to_student_id` set on successful enroll |
| **Lead** | **Enrollment** | Prefill; convert navigation; enroll may consume `lead_id` |
| **Parent** | **Student** | Shared parent via `student.parent_id` (1:N children) |
| **Parent** | **User** | No FK; parent email often becomes Student user email |
| **Student** | **User** | No FK; heuristic email/name; role STUDENT created at enroll |
| **Enrollment** | **Student / Parent / User / Student Fee** | Orchestrates create + fee assignment + lead flag + user attempt |
| **Enrollment** | **Fee Structure** | Requires `fee_structure_id` |
| **Fee Structure** | **Student Fee** | Assignment copies structure/installments onto student |
| **Student Fee** | **Invoice** | Invoices generated later from assignment/structure installments (manual) |
| **Invoice** | **Payment** | Collect against invoice due |
| **Payment** | **Receipt** | `receipt_number` on payment; receipt views by payment/invoice |
| **Academic Year / Class / Division** | Enrollment, Fee Structure, Invoice generate, Reports | Shared master-data prerequisites |

```
Lead ──► Parent ◄── Student ──(heuristic)──► User [STUDENT]
              ▲         │
              │         ├── StudentFeeAssignment ──► FeeStructure / FeeDiscount
              │         │            │
Enrollment ───┴─────────┴────────────┼──► (manual) StudentInvoice
                                     │              │
                                     │              ▼
                                     │         FeePayment ── receipt_number
                                     └── FeeLedger
```

---

## D. Discovery Confidence

| Finding area | Class |
| ------------ | ----- |
| Lead route, list/add/edit UI | **CONFIRMED** |
| `EnrollmentService.enroll` as authoritative student create | **CONFIRMED** |
| `/convert` stamp-only behavior | **CONFIRMED** |
| Parent shared table + student.parent_id + multi-child allowed | **CONFIRMED** |
| Parent not login; Student user created at enroll | **CONFIRMED** |
| User linked by email/name, no FK | **CONFIRMED** |
| PRE-004 admission approval missing | **CONFIRMED** |
| Fee assignment at enrollment (code) | **CONFIRMED**; live enroll **LIKELY** (post-facto UI amounts) |
| Invoice separate from enrollment | **CONFIRMED** |
| Late fee stored unused in collection | **CONFIRMED** (code); UI non-display **CONFIRMED** on schedule capture |
| RBAC/menu naming inconsistencies | **CONFIRMED** |
| PRE-002 register via Enrollment capability | **CONFIRMED** existence; dual-path nuance **CONFIRMED** |
| PRE-003 Aadhaar + mandatory config | **CONFIRMED** absent |
| PRE-008 student search | **CONFIRMED** |
| PRE-014 fee configure by class | **CONFIRMED**; no-duplicate rule **UNVERIFIED**/not enforced |
| PRE-015 collect amount cap | **CONFIRMED** form+code; receipt after pay **UNVERIFIED** runtime; Accountant **UNVERIFIED** |
| PRE-016 report screens for this tenant menu | **CONFLICT** (code present vs menu absent); report body **UNVERIFIED** |
| Live Convert click / brand-new enroll submit | **UNVERIFIED** |
| Principal / Accountant role UX | **UNVERIFIED** |
| Production soft-delete parent / password change policy | **UNVERIFIED** |

---

## E. Sprint 1 Exit Assessment

1. **Is the current implementation sufficiently understood for these two features?**  
   **Yes.** Lead → Student → Parent/User and Fee Management entity chains, primary screens, APIs, business rules, runtime Admin behavior, and PRE-002…PRE-016 reconciliation are documented with confidence ratings. Critical conversion create and payment-submit steps were intentionally not mutated in runtime and remain code-confirmed with partial runtime evidence.

2. **What critical unknowns remain?**  
   Live Convert→Enroll for a non-Converted lead; live receipt after payment submit; Principal and Accountant runtime authorization; whether Fee Report/Due are intentionally menu-hidden vs mis-seeded; formal Admission No uniqueness constraint vs generator-only; production entitlement of missing fee menus.

3. **Which unknowns require a business decision?**  
   Parent vs Student login model; Principal approval (PRE-004) intent; Aadhaar + mandatory document configuration (PRE-003); fee structure uniqueness; late-fee policy; who collects fees (Admin vs Accountant); whether Dual student-create path and stamp-only `/convert` remain intentional; default menu entitlements for reports/discounts/due list.

4. **Which unknowns are technical and can be resolved later?**  
   SPA deep-link asset 404; due-list installment ID join risks; backend `"Fees"` / `"Lead Management"` menu-string coupling vs frontend feature codes; FeeLedger year **name** keying; discount_id without FK; CARD method allow-list vs UI; live convert/receipt verification tests; soft deep-link vs hard navigation environment issues.

---

*Sprint 1 complete. Current Product Baseline frozen from repository inspection + existing runtime captures under `product-discovery/sprint-01-current-state/`. No redesign proposed. No application source modified. No additional screenshots captured.*
