import { beforeEach, describe, expect, test, vi } from "vitest";
import ToggleButton from "../src/components/ToggleButton.mts";

beforeEach(() => {
  document.body.innerHTML = "<div id='target-id'></div>";
})

describe("ToggleButton", () => {
  test("it is an instance of ToggleButton", () => {
    const toggleButton = new ToggleButton("target-id")
    expect(toggleButton).toBeInstanceOf(ToggleButton);
  })

  test("it says 'show/hide' based on target '.hidden'", () => {
    const targetElementId = "target-id"
    const targetElement = document.getElementById(targetElementId)
    const toggleButton = new ToggleButton(targetElementId)
    expect(toggleButton.textContent).toContain("hide");
    targetElement?.classList.add("hidden");
    toggleButton.click();
    expect(toggleButton.textContent).toContain("hide");
    toggleButton.click();
    expect(toggleButton.textContent).toContain("show");
  })

  test("it toggles target 'hidden' class on click", async () => {
    const targetElementId = "target-id"
    const targetElement = document.getElementById(targetElementId)
    const toggleButton = new ToggleButton(targetElementId)
    toggleButton.click();
    expect(targetElement?.classList).toContain("hidden");
    toggleButton.click();
    expect(targetElement?.classList).not.toContain("hidden");
    toggleButton.click();
    expect(targetElement?.classList).toContain("hidden");
  })

  test("it finds target even if created after initialization", async () => {
    const targetElementId = "new-target-id"
    const toggleButton = new ToggleButton(targetElementId)
    expect(toggleButton.targetElement).toBeNull();
    const targetElement = document.createElement("div");
    targetElement.id = targetElementId;
    document.body.appendChild(targetElement);
    toggleButton.click();
    expect(toggleButton.targetElement).toBe(targetElement);
  })

  test("if no target at init, the button says show", () => {
    const targetElementId = "doesnt-exist"
    const toggleButton = new ToggleButton(targetElementId)
    expect(toggleButton.textContent).toContain("show");
  })
})