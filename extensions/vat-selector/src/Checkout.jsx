import '@shopify/ui-extensions/preact';
import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

const ATTR_REASON = "_vat_relief_reason";
const ATTR_NAME = "_vat_relief_name";
const ATTR_CONDITION = "_vat_relief_condition";
const DEFAULT_CONTACT_PATH = "/pages/vat-relief-enquiry";

const CONDITIONS = [
  "Arthritis",
  "Blindness / severe visual impairment",
  "Cancer",
  "Cerebral palsy",
  "Cystic fibrosis",
  "Deafness / hearing impairment",
  "Diabetes",
  "Epilepsy",
  "Heart disease / cardiovascular condition",
  "HIV / AIDS",
  "Multiple sclerosis",
  "Muscular dystrophy",
  "Parkinson's disease",
  "Respiratory condition (e.g. COPD, severe asthma)",
  "Spinal injury / paralysis",
  "Stroke",
  "Other long-term medical condition or disability",
];

export default async () => {
  render(<Extension />, document.body);
};

function getAttributeValue(key) {
  return shopify.attributes.value.find((attr) => attr.key === key)?.value ?? "";
}

async function setAttribute(key, value) {
  await shopify.applyAttributeChange({
    type: "updateAttribute",
    key,
    value,
  });
}

async function clearAttribute(key) {
  await shopify.applyAttributeChange({
    type: "removeAttribute",
    key,
  });
}

function getBlockMessage(reason, name, condition) {
  if (!reason) {
    return "Please complete the VAT Relief Form to continue.";
  }

  if (reason.startsWith("no")) {
    return 'Online payment isn\'t available without a VAT relief declaration. Use "Continue — we will contact you", or select Yes and complete the declaration.';
  }

  if (reason.startsWith("yes") && (!name.trim() || !condition)) {
    return "Please enter the eligible person name and select a condition to continue.";
  }

  return "";
}

function readCheckoutContactDetails() {
  const shipping = shopify.shippingAddress?.value;
  const email = shopify.buyerIdentity?.email?.value ?? "";
  const phone =
    shopify.buyerIdentity?.phone?.value || shipping?.phone || "";
  const name = shipping?.name || "";
  const postcode = shipping?.zip || "";

  return { name, email, phone, postcode };
}

function buildContactPageUrl() {
  const settings = shopify.settings?.value ?? {};
  const configuredPath = (settings.contact_page_path || "").trim();
  const path = configuredPath || DEFAULT_CONTACT_PATH;

  const storefrontUrl = shopify.shop?.storefrontUrl?.replace(/\/$/, "") ?? "";
  const fallbackOrigin = shopify.shop?.myshopifyDomain
    ? `https://${shopify.shop.myshopifyDomain}`
    : "";
  const origin = storefrontUrl || fallbackOrigin;

  let url;
  try {
    url = path.startsWith("http")
      ? new URL(path)
      : new URL(path.startsWith("/") ? path : `/${path}`, `${origin}/`);
  } catch (err) {
    console.error("Invalid VAT contact page path:", err);
    return "";
  }

  const details = readCheckoutContactDetails();
  if (details.name) url.searchParams.set("name", details.name);
  if (details.email) url.searchParams.set("email", details.email);
  if (details.phone) url.searchParams.set("phone", details.phone);
  if (details.postcode) url.searchParams.set("postcode", details.postcode);

  return url.toString();
}

function Extension() {
  const canUpdateAttributes =
    shopify.instructions.value.attributes.canUpdateAttributes;

  const [selectedValues, setSelectedValues] = useState(() => {
    const reason = getAttributeValue(ATTR_REASON);
    return reason ? [reason] : [];
  });
  const [eligibleName, setEligibleName] = useState(() =>
    getAttributeValue(ATTR_NAME)
  );
  const [condition, setCondition] = useState(() =>
    getAttributeValue(ATTR_CONDITION)
  );
  const [contactUrl, setContactUrl] = useState("");
  const nameTimerRef = useRef(null);
  const declarationRef = useRef({
    reason: "",
    name: "",
    condition: "",
  });

  const selectedReason = selectedValues[0] ?? "";
  const isYes = selectedReason.startsWith("yes");
  const isNo = selectedReason.startsWith("no");
  const blockMessage = getBlockMessage(
    selectedReason,
    eligibleName,
    condition
  );
  const isBlocked = Boolean(blockMessage);

  declarationRef.current = {
    reason: selectedReason,
    name: eligibleName,
    condition,
  };

  useEffect(() => {
    if (!canUpdateAttributes) {
      return undefined;
    }

    const teardownPromise = shopify.buyerJourney.intercept(
      ({ canBlockProgress }) => {
        const { reason, name, condition: selectedCondition } =
          declarationRef.current;
        const message = getBlockMessage(reason, name, selectedCondition);

        if (canBlockProgress && message) {
          return {
            behavior: "block",
            reason: message,
            errors: [{ message }],
          };
        }

        return { behavior: "allow" };
      }
    );

    return () => {
      teardownPromise.then((teardown) => teardown?.());
    };
  }, [canUpdateAttributes]);

  useEffect(() => {
    if (!isNo) {
      setContactUrl("");
      return undefined;
    }

    const updateUrl = () => setContactUrl(buildContactPageUrl());
    updateUrl();

    const unsubscribes = [];
    if (shopify.shippingAddress?.subscribe) {
      unsubscribes.push(shopify.shippingAddress.subscribe(updateUrl));
    }
    if (shopify.buyerIdentity?.email?.subscribe) {
      unsubscribes.push(shopify.buyerIdentity.email.subscribe(updateUrl));
    }
    if (shopify.buyerIdentity?.phone?.subscribe) {
      unsubscribes.push(shopify.buyerIdentity.phone.subscribe(updateUrl));
    }

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe?.());
    };
  }, [isNo]);

  if (!canUpdateAttributes) {
    return (
      <s-banner heading="VAT Relief Form" tone="warning">
        {shopify.i18n.translate("attributeChangesAreNotSupported")}
      </s-banner>
    );
  }

  const handleReasonChange = async (e) => {
    const values = e.currentTarget.values;
    setSelectedValues(values);

    const selectedValue = values.length > 0 ? values[0] : "";

    try {
      await setAttribute(ATTR_REASON, selectedValue);

      if (!selectedValue.startsWith("yes")) {
        if (nameTimerRef.current) {
          clearTimeout(nameTimerRef.current);
          nameTimerRef.current = null;
        }
        setEligibleName("");
        setCondition("");
        await Promise.all([
          clearAttribute(ATTR_NAME),
          clearAttribute(ATTR_CONDITION),
        ]);
      }
    } catch (err) {
      console.error("Error updating VAT relief reason:", err);
    }
  };

  const handleNameInput = (e) => {
    const newValue = e.currentTarget.value;
    setEligibleName(newValue);

    if (nameTimerRef.current) {
      clearTimeout(nameTimerRef.current);
    }

    nameTimerRef.current = setTimeout(async () => {
      try {
        await setAttribute(ATTR_NAME, newValue.trim());
      } catch (err) {
        console.error("Error updating eligible person name:", err);
      }
    }, 400);
  };

  const handleConditionChange = async (e) => {
    const newValue = e.currentTarget.value;
    setCondition(newValue);

    try {
      await setAttribute(ATTR_CONDITION, newValue);
    } catch (err) {
      console.error("Error updating condition:", err);
    }
  };

  return (
    <s-stack gap="base">
      <s-heading>VAT Relief Form</s-heading>
      <s-text>Claim VAT Relief?</s-text>

      <s-choice-list
        name="vat-relief"
        values={selectedValues}
        onChange={handleReasonChange}
      >
        <s-choice value="yes_self">
          Yes - The goods are for me, and I have a medical condition or disability.
        </s-choice>
        <s-choice value="yes_else">
          Yes - The goods are for someone else with a medical condition or disability.
        </s-choice>
        <s-choice value="yes_charity">
          Yes - The goods are being paid for by a registered charity.
        </s-choice>
        <s-choice value="no_health">
          No - The goods are for someone without a long-term illness or disability.
        </s-choice>
        <s-choice value="no_business">
          No - The goods are being paid for by a business.
        </s-choice>
      </s-choice-list>

      {isYes && (
        <s-stack gap="base">
          <s-text-field
            label="Eligible person name"
            name="vat-relief-eligible-name"
            value={eligibleName}
            onInput={handleNameInput}
            autocomplete="name"
          />

          <s-select
            label="Condition"
            name="vat-relief-condition"
            value={condition}
            onChange={handleConditionChange}
          >
            <s-option value="">Select a condition</s-option>
            {CONDITIONS.map((item) => (
              <s-option key={item} value={item}>
                {item}
              </s-option>
            ))}
          </s-select>
        </s-stack>
      )}

      {isNo && (
        <s-stack gap="base">
          <s-banner heading="We will contact you" tone="warning">
            Payment stays blocked here. Tap the button below to send your details — this does not finish checkout automatically.
          </s-banner>
          {contactUrl ? (
            <s-button href={contactUrl} target="_blank" variant="primary">
              Continue — we will contact you
            </s-button>
          ) : (
            <s-banner tone="critical">
              Contact page URL could not be built. Set “VAT Contact page path” in the checkout editor settings.
            </s-banner>
          )}
        </s-stack>
      )}

      {isBlocked && !isNo && (
        <s-banner heading="Checkout blocked" tone="critical">
          {blockMessage}
        </s-banner>
      )}
    </s-stack>
  );
}
