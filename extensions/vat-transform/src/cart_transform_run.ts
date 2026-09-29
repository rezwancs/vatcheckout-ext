import type {
  CartTransformRunInput,
  CartTransformRunResult,
  Operation,
} from "../generated/api";

const UK_VAT_RATE = 1.20;

export function cartTransformRun(input: CartTransformRunInput): CartTransformRunResult {
  const vatReliefReason = input.cart.attribute?.value ?? "NONE_SELECTED";
  const isVatReliefSelected = vatReliefReason.startsWith("yes");

  // LOGGING: Access logs via terminal or Partner Dashboard
  console.log(`VAT Relief Reason: ${vatReliefReason}`);
  console.log(`Is VAT Relief Selected: ${isVatReliefSelected}`);
  console.log(`Number of lines: ${input.cart.lines.length}`);

  const operations: Operation[] = input.cart.lines.map((line) => {
    const basePrice = parseFloat(line.cost.amountPerQuantity.amount);
    const finalPrice = isVatReliefSelected ? basePrice : basePrice * UK_VAT_RATE;
    const priceFormatted = finalPrice.toFixed(2);

    let originalTitle = "";
    console.log(`Merchant Type: ${line.merchandise.__typename}`);

    if (line.merchandise.__typename === "ProductVariant") {
      const variant = line.merchandise;
      originalTitle = variant.product.title;
      if (variant.title && variant.title !== "Default Title") {
        originalTitle += ` - ${variant.title}`;
      }
    }

    const vatLabel = isVatReliefSelected ? "(without VAT)" : "(with VAT)";
    const newTitle = `${originalTitle} ${vatLabel}`;

    console.log(`Line ID: ${line.id}, Base: ${basePrice}, Final: ${priceFormatted}, Title: ${newTitle}`);

    return {
      lineUpdate: {
        cartLineId: line.id,
        title: newTitle,
        price: {
          adjustment: {
            fixedPricePerUnit: {
              amount: priceFormatted,
            },
          },
        },
      },
    };
  });

  return { operations };
}