// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Loading from "@/app/loading";

describe("Loading", () => {
  it("announces a status region while the health check is in flight", () => {
    render(<Loading />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Checking status...");
    expect(status).toHaveAttribute("aria-live", "polite");
  });
});
