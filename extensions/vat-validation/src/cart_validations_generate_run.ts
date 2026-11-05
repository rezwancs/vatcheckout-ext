import type {
  CartValidationsGenerateRunInput,
  CartValidationsGenerateRunResult,
  ValidationError,
} from "../generated/api";

function declarationError(message: string): ValidationError {
  return {
    message,
    target: "$.cart",
  };
}

function emptyResult(): CartValidationsGenerateRunResult {
  return {
    operations: [
      {
        validationAdd: {
          errors: [],
        },
      },
    ],
  };
}

/**
 * Only enforce VAT declaration at checkout completion.
 * Cart page quantity/remove uses CART_INTERACTION — must stay unblocked.
 */
export function cartValidationsGenerateRun(
  input: CartValidationsGenerateRunInput
): CartValidationsGenerateRunResult {
  if (input.buyerJourney.step !== "CHECKOUT_COMPLETION") {
    return emptyResult();
  }

  const reason = input.cart.reason?.value ?? "";
  const eligibleName = (input.cart.eligibleName?.value ?? "").trim();
  const condition = (input.cart.condition?.value ?? "").trim();

  const errors: ValidationError[] = [];

  if (!reason) {
    errors.push(
      declarationError("Please complete the VAT Relief Form to continue.")
    );
  } else if (reason.startsWith("no")) {
    errors.push(
      declarationError(
        "Online payment isn't available without a VAT relief declaration. Select Yes and enter the eligible person name and condition, or continue so we can contact you."
      )
    );
  } else if (reason.startsWith("yes") && (!eligibleName || !condition)) {
    errors.push(
      declarationError(
        "Please enter the eligible person name and select a condition to continue."
      )
    );
  }

  return {
    operations: [
      {
        validationAdd: {
          errors,
        },
      },
    ],
  };
}
