import { expect, it } from "vitest";
import { toCsv } from "../src/lib/csv";
it("quotes CSV delimiters, preserves Unicode and neutralizes spreadsheet formulas", () => {
  const output = toCsv([
    ["Қазақша", "A,B", '"quoted"', "=SUM(A1:A2)", " +cmd", "safe"],
  ]);
  expect(output).toContain('"Қазақша"');
  expect(output).toContain('"A,B"');
  expect(output).toContain('""quoted""');
  expect(output).toContain("'=SUM");
  expect(output).toContain("' +cmd");
});
