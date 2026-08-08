// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HealthStatusCard } from "@/components/HealthStatusCard";

describe("HealthStatusCard", () => {
  it("shows the database as up", () => {
    render(<HealthStatusCard database="up" />);

    expect(screen.getByRole("status")).toHaveTextContent("Database: up");
  });

  it("shows the database as down", () => {
    render(<HealthStatusCard database="down" />);

    expect(screen.getByRole("status")).toHaveTextContent("Database: down");
  });
});
