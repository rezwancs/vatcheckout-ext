import '@shopify/ui-extensions/preact';
import { render } from "preact";
import { useRef, useState } from "preact/hooks";

const ATTR_REASON = "_vat_relief_reason";
const ATTR_NAME = "_vat_relief_name";
const ATTR_CONDITION = "_vat_relief_condition";

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

function Extension() {
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
  const nameTimerRef = useRef(null);

  if (!shopify.instructions.value.attributes.canUpdateAttributes) {
    return (
      <s-banner heading="VAT Relief Form" tone="warning">
        {shopify.i18n.translate("attributeChangesAreNotSupported")}
      </s-banner>
    );
  }

  const selectedReason = selectedValues[0] ?? "";
  const isYes = selectedReason.startsWith("yes");

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
    </s-stack>
  );
}
