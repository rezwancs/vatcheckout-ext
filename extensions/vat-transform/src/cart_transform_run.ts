import type {
  CartTransformRunInput,
  CartTransformRunResult,
} from "../generated/api";

/**
 * VAT Relief flowchart: price stays the same for Yes and No.
 * Cart transform is kept installed but performs no price/title mutations.
 */
export function cartTransformRun(
  _input: CartTransformRunInput
): CartTransformRunResult {
  return { operations: [] };
}
