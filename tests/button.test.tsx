import { expect, test } from "vitest";
import { render } from "@testing-library/react";

test("Page", () => {
  const result = render(<button type="button">Button1</button>);
  const btn = result.container.querySelector('[data-test-id="button"]');
  expect(btn).toBeTruthy();
  expect(btn?.textContent).toEqual("Button1");
});
