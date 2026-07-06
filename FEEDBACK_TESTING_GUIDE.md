# Pintap — What to Test (Client Feedback Rounds 1 + 2)

A simple checklist to walk through everything that was changed.
📱 = test in **mobile view** · 🖥️ = test in **desktop view** · 📱🖥️ = both

> Tip for mobile view on a computer: open browser DevTools (F12) → toggle device toolbar, or just test on your phone.

---

## 1. Start page & signup

- [ ] 📱 Open the app logged out (`/`). You shou**me** (splash). After ~2 seconds (or a tap) a **"G**ld see **only the pintap logo + naet started"** button appears at the bottom, plus a small "Log in" link. Tapping "Get started" opens the **signup** page.
- [ ] 🖥️ On desktop the start page still shows the normal landing (slogan + buttons).
- [ ] 📱🖥️ Signup page has the **Recommender | Merchant** account-type toggle.
- [ ] 📱🖥️ **Double opt-in:** sign up with a fresh email → you land on a "check your inbox" screen and are **NOT** logged in. You receive a confirmation email from **[hello@pintap.com](mailto:hello@pintap.com)** (sent via Brevo). Clicking the button confirms the account and logs you straight in (merchants land in store onboarding).
  - ⚠️ **Before this works:** in Brevo → Security → [Authorised IPs](https://app.brevo.com/security/authorised_ips), the server's IP must be allowed (or the restriction disabled), and `hello@pintap.com` must be a verified sender. Until then signup shows "We couldn't send the confirmation email."
- [ ] 📱🖥️ Trying to **log in before confirming** the email is rejected.



## 2. Navigation

- [ ] 📱 Bottom nav order: **Home · Links · ➕ (center) · Shops · More**.
- [ ] 📱 "Discover" is now called **"Shops"** everywhere.
- [ ] 📱 Tabs react on the **first tap** — the tapped tab highlights immediately, even while the page is still loading.



## 3. Homepage

- [ ] 📱🖥️ Order: **stats on top** (Total clicks · **Sales** · Commission — no "Conversion" box), then **Create Link**, then My active links, then My shops.
- [ ] 📱 In **German**: the "Verkäufe" (Sales) box no longer squeezes its icon out.
- [ ] 📱🖥️ No language button in the top header (language is under More; default follows your browser language).
- [ ] 📱 My active links: bigger product pictures; FahrradXXL / Tennis Point links show an image (favicon fallback if the shop blocks image fetching).
- [ ] 📱 **My Shops** shows the shops of *your* links (empty state points to Shops). Both rails slide horizontally.
- [ ] 📱🖥️ "Show all" (was "Explore") links to the Shops page.
- [ ] 📱 **Brave browser:** log in — page should fit the screen without zooming out. If it still doesn't: Brave remembers per-site zoom (⋮ → Zoom → reset), please tell us.



## 4. Shops

- [ ] 📱🖥️ Shops page (was Discover): just **"Shops — Manage your shops"** + the shop cards. No search bar, no Stores/Campaigns tabs, no stats.
- [ ] 📱 Tap a shop (on Shops page **or** Homepage): a sheet opens with **logo + shop name**, a **table** with Active campaign / Discount / Commission / Active until, and the buttons **Visit shop** + **Create link**. No more "Shop Details" info rows.



## 5. Create Link

- [ ] 📱 The ➕ button and every other entry point use the same flow: paste icon + **"Create Link"** button.
- [ ] 📱 Create a link with a FahrradXXL **product URL** (e.g. any product page of fahrrad-xxl.de) → the store is found and the campaign **"Sommer 26"** (5% off · 8% commission) is offered.



## 6. Link preview (the page your followers see, `/l/…`)

- [ ] 📱 **Light mode** (beige/white, navy text) — no dark mode.
- [ ] 📱 Language follows the browser (manual EN/DE toggle still at the bottom).
- [ ] 📱 "What is this" → opens **[www.pintap.com](http://www.pintap.com)**. No "Help Center" link anymore.
- [ ] 📱 **"Continue" works now:** it opens the real product/shop page (for the old test link it's now `https://www.fahrrad-xxl.de/`). The discount code is shown on the preview and can be copied — it is **no longer** stuffed into a `/discount/…` URL (that format only exists on Shopify shops and caused the broken page).



## 7. My Links & link details

- [ ] 📱 My Links: **no stats**, just filters + the list.
- [ ] 📱 Open a link → **link details now fit the screen**, even with very long product names/URLs.
- [ ] 📱 A link **with a commission/sale in any status** cannot be deleted (button disabled + explanation). Links without commissions can.



## 8. More / Account

- [ ] 📱 More → **Delete account** (with confirmation). After deleting: you are signed out, links are deactivated, and the account **cannot log in** anymore.
  - ⚠️ Use a **throwaway account** for this test — never admin@!
- [ ] 🖥️ Admin → Users: the deleted account is **still listed** with a red **"Deleted"** badge (kept for payment history).



## 9. Profile

- [ ] 📱 Edit profile (name, country, gender, photo) → **Save** → reload → changes persisted. (A last name is required — save is blocked until filled.)



## 10. Help

- [ ] 📱 Contact email is **[hello@pintap.com](mailto:hello@pintap.com)**.
- [ ] 📱 FAQ: opening one question **closes the previously open one**.



## 11. Admin

- [ ] 🖥️ Merchant signup exists on the signup page (toggle).
- [ ] 🖥️ Users page shows all users; deleted ones badged (see 8).

---



### Known items NOT in this round (backlog)

- Final copy/translation pass · Feather-icon set · Inter font · commission statuses (pending/confirmed/returned) · request-payout polish · invited-user-sees-inviting-shop (needs a data-model decision).



### For the developers

Progress/analysis is tracked in [CLIENT_FEEDBACK_CHECKLIST.md](CLIENT_FEEDBACK_CHECKLIST.md) (section R = round 2). Active Supabase project: `gdcyztbupojpmbnsnmwr`.