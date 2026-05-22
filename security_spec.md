# Security Specification: Libroflix Firestore Database

This specification details the cryptographic and role-based security assertions, relational invariants, and mitigation vectors protecting user library data on Libroflix.

## 1. Data Invariants

- **Ownership Locking**: A user can only read, create, update, or delete books inside their custom document path `/users/{userId}/books/{bookId}` where `userId` matches the verified `request.auth.uid`.
- **Verified Authentication**: Standard read and write operations require that `request.auth.token.email_verified == true`.
- **EAN/ISBN ID Safety**: The ID of the books or user profiles must be structured properly to prevent injection or wallet exhaustion.
- **Server-Side Temporal Authority**: The creation time (`createdAt`) and updates (`updatedAt`) must strictly match `request.time`.

---

## 2. The "Dirty Dozen" Payloads

These 12 malicious payloads represents attacks attempting to break Identity, Integrity, State, and Temporal laws. All of these **MUST** be rejected as `PERMISSION_DENIED`:

### Group A: Identity Spoofing & Path Poisoning
1. **Malicious Path Infiltration**: User `attacker_123` attempts to write directly to `/users/victim_999/books/novel_abc`.
2. **UID Injection Payload**: User `attacker_123` attempts to set the `ownerId` inside `/users/attacker_123/books/novel_abc` to `victim_999`.
3. **Admin Privileges Escalation**: Submitting a payload with custom field `isAdmin: true` or `role: "admin"`.
4. **Path Variable ID Injection**: Creating a book where the document ID is `../spoofed/path` or contains huge junk characters (Denial of Wallet).

### Group B: Value Poisoning & Validation Gaps
5. **Ghost Field Injection**: Adding custom metadata field `secret_override_flag: true` during creation.
6. **Malicious Overlarge Types**: Book with `title` set to a redundant 2MB string.
7. **Negative Page Space**: Book with `pages` set to `-500` or `currentPage` set to `1200` on a `500` page book.
8. **Invalid Enum Splicing**: Setting status to `reading-forever` or spineStyle to `cyberpunk-rainbow` which are not in the permitted enum constraints.

### Group C: Temporal & State Shortcutting
9. **Backdated Creation Timestamps**: Setting `createdAt` to a hand-crafted past date like `1999-12-31T23:59:59Z` instead of standard `request.time`.
10. **State Corruption Loop**: Modifying `createdAt` field after document creation on a book update operation.
11. **Negative Star Rating**: Setting rating to `-5` or `125` (must be 1 to 10).
12. **Blanket Query Scraping**: Attempting to run a list query on all books of all users globally without filtering by the authorized `userId` path variable.

---

## 3. The Test Runner Structure

A complete rule harness checks these cases. Below is the blueprint of tests validating that rules assert denials on these payloads:

```typescript
// firestore.rules.test.ts or equivalent emulator tests
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

// All Dirty Dozen payloads are tested to assertFails()
```
