import type { Builder } from "../engine/builder";
import { interiors } from "./cafe/interior";
import { grounds, rooftop, terrace, yard } from "./cafe/outdoor";
import { shell } from "./cafe/shell";

/** Corner building with a café and a grocery downstairs, a flat upstairs, terrace and delivery yard. */
export function cafe(b: Builder): void {
  grounds(b);
  shell(b);
  interiors(b);
  rooftop(b);
  terrace(b);
  yard(b);
}
