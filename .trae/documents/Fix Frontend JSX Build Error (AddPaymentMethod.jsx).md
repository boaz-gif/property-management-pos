## Root Cause
- [AddPaymentMethod.jsx](file:///c:/Users/HP/property-management-pos/src/components/tenant/AddPaymentMethod.jsx) has malformed JSX:
  - The `mpesa ? (...) : (...)` branch’s `:` (card branch) contains **two sibling `<div>` blocks** (Card Number block + Expiry/CVC grid) without a wrapper, triggering “Adjacent JSX elements must be wrapped…”.
  - There’s also a duplicated `<label>` line for CVC and a missing closing `</label>` for the Nickname label.
  - There is an extra closing `</div>` around line ~145 that breaks element nesting.

## Fix Plan
### 1) Correct JSX structure in AddPaymentMethod
- Wrap the entire card branch in a single enclosing element (React fragment `<>...</>`).
- Remove the duplicated `<label>` line for CVC.
- Close the Nickname `<label>` properly.
- Remove the extra stray closing `</div>` so the form structure is valid.

### 2) Validate the fix
- Start the frontend dev server and confirm the compile error is gone.
- If any new lint/compile errors appear, fix them immediately.

### 3) Quick sanity check
- Open the Payment Methods screen and ensure:
  - Selecting “M-Pesa” shows the phone field.
  - Selecting “Card” shows card number + expiry + CVC fields.
  - Submitting still calls `onAdd(...)` correctly.

If you approve, I’ll apply the JSX fixes and re-run the frontend build/dev server to confirm it compiles cleanly.