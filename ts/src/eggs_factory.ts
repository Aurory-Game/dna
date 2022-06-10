export class EggsFactory {
  hatch(minIndex: number, maxIndex: number): string {
    const NeftyIndex = Math.floor(Math.random() * (maxIndex - minIndex + 1)) + minIndex
    return NeftyIndex.toString()
  }
}
