# How to: validate a custom form with your own CAPTCHA using server logic

This guide walks you through setting up and testing the **server logic** sample
that adds your own [Google reCAPTCHA](https://developers.google.com/recaptcha)
to a **custom form** on a Power Pages site, verifies the CAPTCHA token
**server-side**, and only then writes the submission to a Dataverse table.

> **Note:** Power Pages **basic forms** already offer a built-in CAPTCHA. This
> sample is for **custom forms** (hand-built HTML you POST yourself), where you
> bring your own CAPTCHA and validate it in server logic before saving data.

A custom "Request a callback" form collects a few fields and a reCAPTCHA
response. On submit, a small client script sends the field values plus the
CAPTCHA token to a server logic. The server logic verifies the token with Google
and, **only if verification succeeds**, creates a **Callback Request** record in
Dataverse. This keeps the secret key off the client and guarantees the CAPTCHA is
actually checked before any data is stored.

## Scenario

> A public-facing portal has a lightweight "Request a callback" form. It is not a
> basic form (so there's no built-in CAPTCHA), and it is open to anonymous users,
> so it's an easy target for spam bots. Every submission must pass a CAPTCHA check
> that is verified on the server before a lead record is created.

## How it works

```
 Browser (custom form)          Power Pages                    Google
 ─────────────────────          ───────────                    ──────
 1. User fills fields
 2. User solves reCAPTCHA ─────▶ (token issued by Google widget)
 3. Submit ── fields+token ──▶  4. server logic (custom-form-captcha)
                                       │
                                       5. POST siteverify ─ secret+token ─▶ verify
                                          { success: true|false }         ◀──┘
                                       6. If success → CreateRecord
                                          in Dataverse (sample_callbackrequest)
 7. JS hides the form and     ◀──── { success, message }
    shows a confirmation
```

* The reCAPTCHA widget on the page issues a **token** when the user solves the
  challenge. The **site key** is rendered from a site setting via Liquid
  (`{{ settings['RecaptchaSiteKey'] }}`), so it isn't hardcoded in the page.
* The client posts the form fields plus the token to the `custom-form-captcha`
  server logic using `webapi.safeAjax`, which attaches the Power Pages
  **anti-forgery token**.
* The server logic reads the **secret key** from a site setting, calls Google's
  [`siteverify`](https://developers.google.com/recaptcha/docs/verify) endpoint,
  and inspects `success`.
* **Only when verification succeeds** does the server logic call
  `Server.Connector.Dataverse.CreateRecord` to insert a **Callback Request**
  record. Any internal error is logged server-side; the browser receives only a
  generic message.
* The client hides the form and shows a "Thank you" confirmation on success, or
  re-enables the CAPTCHA and shows a message on failure.

## Step 1: Download the sample

1. Go to the sample folder:
   [samples/server-logic/custom-form-captcha](https://github.com/microsoft/power-pages-samples/tree/main/samples/server-logic/custom-form-captcha).
2. Select **Code > Download ZIP**, or clone the repository:

   ```bash
   git clone https://github.com/microsoft/power-pages-samples
   cd power-pages-samples/samples/server-logic/custom-form-captcha/
   ```

## Step 2: Prerequisites

Before you start, make sure you have:

* A Power Platform environment where you can import a Power Pages site.
* A **Google reCAPTCHA** account and access to the
  [reCAPTCHA admin console](https://www.google.com/recaptcha/admin).
* Permission to create **Dataverse tables** and **site settings** in the target
  environment.

## Step 3: Register a reCAPTCHA site (get your keys)

1. Open the [reCAPTCHA admin console](https://www.google.com/recaptcha/admin) and
   select **+** (Create).
2. Give it a **Label**, choose **reCAPTCHA v2 → "I'm not a robot" Checkbox**, and
   add your site's **domain** (for example, `contoso.powerappsportals.com`). Do
   not include `https://` or a path. For local testing you can also add
   `localhost`.
3. Submit to get two keys:
   * **Site key** — public, rendered into the page.
   * **Secret key** — private, used only by the server logic.

## Step 4: Import the site and create the Dataverse table

1. Import the downloaded site into your target environment. Follow
   [Import a Power Pages site solution](https://learn.microsoft.com/power-pages/configure/power-pages-solutions#import-the-solution-into-the-target-environment).
   This creates the **Callback Request** table used by the sample.
2. Confirm the **Callback Request** table (`sample_callbackrequest`) exists with
   these columns:

   | Display name       | Logical name                 | Type            |
   | ------------------ | ---------------------------- | --------------- |
   | Name               | `sample_name`                | Text (primary)  |
   | Phone number       | `sample_phonenumber`         | Text            |
   | Email              | `sample_email`               | Text            |
   | Best time to call  | `sample_besttimetocall`      | Choice          |

   > The **Best time to call** choice uses the option values `100000000`
   > (Morning), `100000001` (Afternoon), and `100000002` (Evening). Match these to
   > the `<option value="…">` entries in the form if you change them.

## Step 5: Add the reCAPTCHA site settings

Create two **site settings** so no keys are stored in code
([manage site settings](https://learn.microsoft.com/power-pages/configure/configure-site-settings)):

| Site setting        | Value                         | Used by                |
| ------------------- | ----------------------------- | ---------------------- |
| `RecaptchaSiteKey`  | Your reCAPTCHA **site key**   | the form page (Liquid) |
| `RecaptchaSecretKey`| Your reCAPTCHA **secret key** | the server logic       |

### Script Highlight: Configuration Section

The server logic reads the secret from a site setting and never exposes it to the
browser:

```javascript
const RECAPTCHA_SECRET = Server.SiteSetting.Get("RecaptchaSecretKey");
const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const ENTITY_SET_NAME = "sample_callbackrequests"; // plural logical name of the table
```

The page renders the site key with Liquid, so it is not hardcoded:

```html
<div class="g-recaptcha"
     data-sitekey="{{ settings['RecaptchaSiteKey'] }}"
     data-callback="captchaCompleted"
     data-expired-callback="captchaExpired">
</div>
```

## Step 6: Grant table permissions for the form

Because the form is public, allow the **Anonymous Users** web role to create
records, and make sure the server logic can run for that role
([table permissions](https://learn.microsoft.com/power-pages/security/table-permissions)):

1. Create a **table permission** on **Callback Request** with **Create** access
   for the **Anonymous Users** web role (use **Global** scope for a public lead
   form).
2. Assign the same web role to the **custom-form-captcha** server logic so
   anonymous visitors can invoke it.

## Step 7: Activate the site

Open the site in the Power Pages design studio and **activate** (provision) it so
it becomes available at its portal URL.

### Script Highlight: Verify First, Then Create

The security guarantee of this sample is ordering: the record is created **only**
after Google confirms the token is valid.

```javascript
const result = JSON.parse(response.Body);
if (!result.success) {
    // CAPTCHA failed — do NOT create a record
    return JSON.stringify({ status: "error", success: false, message: "CAPTCHA verification failed. Please try again." });
}

// CAPTCHA passed — safe to create the record
const createResultRaw = await Server.Connector.Dataverse.CreateRecord(ENTITY_SET_NAME, JSON.stringify(record));
```

## Step 8: Test

1. Browse to the **Request a callback** page.
2. The **Submit** button stays disabled until you solve the reCAPTCHA.
3. Fill in **Full name** and **Phone number** (Email and Best time to call are
   optional), solve the CAPTCHA, and select **Submit request**.
4. On success, the form is replaced by a **Thank you** confirmation, and a new
   **Callback Request** row appears in Dataverse.
5. To see failure handling, let the CAPTCHA expire (wait, or use the widget's
   reset) and submit — the client blocks the request and prompts you to complete
   the CAPTCHA again.

## Security notes

* **Server-side verification.** The CAPTCHA token is verified in server logic, not
  in the browser, so the check cannot be skipped by editing client code.
* **Secret stays server-side.** The secret key lives in a site setting and is only
  read by the server logic. Only the public site key reaches the browser.
* **No internal details leaked.** Dataverse or CRM errors are written to
  `Server.Logger` and the client receives a generic message, so stack traces are
  never exposed to end users.
* **Least-privilege access.** Grant the Anonymous Users role only **Create** on the
  Callback Request table — it does not need read, update, or delete for this form.
* **Defense in depth.** A CAPTCHA reduces automated spam but is not a complete
  anti-abuse solution; combine it with rate limiting and monitoring for
  high-traffic public forms.
