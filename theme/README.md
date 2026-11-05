# VAT Relief theme assets

Styled to match [movinglife.co.uk/pages/contact-us](https://movinglife.co.uk/pages/contact-us):
Montserrat headings, navy `#223872`, primary button `#0879a6`, 8px rounded inputs.

Copy these files into the live MovingLife theme (or push with Shopify CLI):

- `templates/page.vat-relief-enquiry.json`
- `sections/vat-relief-enquiry.liquid`
- `assets/section-vat-relief-enquiry.css`

## Setup

1. In Shopify Admin → **Online Store → Pages → Add page**
2. Title: `VAT relief enquiry`
3. Theme template: **vat-relief-enquiry**
4. Handle / URL should be `/pages/vat-relief-enquiry` (matches checkout extension default)
5. Ensure store **Customer email** / contact notifications go to `info@movinglife.co.uk`

Prefill query params from checkout: `name`, `email`, `phone`, `postcode`.

