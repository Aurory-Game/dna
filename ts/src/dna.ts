export class DNA {
  cursor: number;
  dna: string;
  encodingBase: number;
  baseSize: number;
  constructor(dna: string, encodingBase?: number) {
    this.cursor = 0;
    this.dna = dna;
    this.encodingBase = encodingBase ?? 16;
    this.baseSize = this.encodingBase / 8;
  }

  read(n: number): string {
    const cursorShift = this.baseSize * n;
    const value = this.dna.substring(this.cursor, this.cursor + cursorShift);
    this.cursor += cursorShift;
    return value;
  }

  /**
   * Set the cursor to 0.
   */
  reset() {
    this.cursor = 0;
  }

  /**
   * Used to not impact the original DNA offset.
   */
  clone(): DNA {
    const dna = new DNA(this.dna, this.encodingBase);
    dna.read(this.cursor);
    return dna;
  }
}
