import '@shopify/ui-extensions/preact';
import { render } from "preact";
import { useState } from "preact/hooks";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const [selectedValues, setSelectedValues] = useState([]);

  // Check if attribute changes are supported
  if (!shopify.instructions.value.attributes.canUpdateAttributes) {
    return (
      <s-banner heading="VAT Relief Form" tone="warning">
        {shopify.i18n.translate("attributeChangesAreNotSupported")}
      </s-banner>
    );
  }

  const handleChange = async (e) => {
    const values = e.currentTarget.values;
    setSelectedValues(values);

    const selectedValue = values.length > 0 ? values[0] : "";

    try {
      await shopify.applyAttributeChange({
        key: "_vat_relief_reason",
        type: "updateAttribute",
        value: selectedValue,
      });
      console.log("Updated _vat_relief_reason:", selectedValue);
    } catch (err) {
      console.error("Error updating attribute:", err);
    }
  };

  const attributes = shopify.attributes.value;
  const currentAttributeValue = attributes.find(attr => attr.key === "_vat_relief_reason")?.value || "None";

  return (
    <s-stack gap="base">
      <s-heading>VAT Relief Form</s-heading>
      {/* <s-banner tone="info" heading="Debug Mode">
        Current Attribute: {currentAttributeValue}
      </s-banner> */}
      <s-text>Claim VAT Relief?</s-text>

      <s-choice-list
        name="vat-relief"
        values={selectedValues}
        onChange={handleChange}
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
    </s-stack>
  );
}