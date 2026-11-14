// Render harness entry: a fixed clock (Sat Nov 14, 2026, 10:00 am New York), then the real app.
const RealDate = Date;
const FIXED = RealDate.parse('2026-11-14T15:00:00Z');
const START = RealDate.now();
const now = () => FIXED + (RealDate.now() - START);
class FakeDate extends RealDate {
  constructor(...a) {
    if (a.length === 0) super(now());
    else super(...a);
  }
  static now() {
    return now();
  }
}
globalThis.Date = FakeDate;
require('../index.ts');
