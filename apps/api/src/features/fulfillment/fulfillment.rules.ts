export function shipmentQuantityFits(orderQuantity: number, previouslyAllocated: number, requested: number): boolean {
  return Number.isSafeInteger(orderQuantity) && orderQuantity > 0 &&
    Number.isSafeInteger(previouslyAllocated) && previouslyAllocated >= 0 &&
    Number.isSafeInteger(requested) && requested > 0 &&
    previouslyAllocated + requested <= orderQuantity;
}
