import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../src/render/markdown";
import { resolveResume } from "../src/resolve/index";
import { fixtureData, makeTemplate, enLocale, esLocale } from "./fixtures";

describe("renderMarkdown", () => {
  it("renders a complete ATS-friendly document in English", () => {
    const resume = resolveResume(fixtureData, makeTemplate());
    const md = renderMarkdown(resume, enLocale, "en");

    expect(md).toContain("# Test Person");
    expect(md).toContain("## Experience");
    expect(md).toContain("### Senior Engineer — Acme");
    expect(md).toContain("*Jan 2023 – Present · Remote · Full-time*");
    expect(md).toContain("- swe bullet");
    expect(md).toContain("**Technologies:** WebGL");
    expect(md).toContain("- English — Fluent");
    expect(md).toContain("- Spanish — Native");
  });

  it("renders localized content in Spanish", () => {
    const resume = resolveResume(fixtureData, makeTemplate());
    const md = renderMarkdown(resume, esLocale, "es");

    expect(md).toContain("# Test Person");
    expect(md).toContain("## Experiencia");
    expect(md).toContain("### Ingeniero Senior — Acme");
    expect(md).toContain("*Ene 2023 – Presente · Remote · Tiempo completo*");
    expect(md).toContain("- bullet swe");
    expect(md).toContain("**Tecnologías:** WebGL");
    expect(md).toContain("- Inglés — Fluido");
    expect(md).toContain("- Español — Nativo");
    expect(md).toContain("## Educación");
  });

  it("respects the template's section order", () => {
    const resume = resolveResume(
      fixtureData,
      makeTemplate({ sections: ["experience", "summary"] }),
    );
    const md = renderMarkdown(resume, enLocale, "en");
    expect(md.indexOf("## Experience")).toBeLessThan(md.indexOf("## Summary"));
  });

  it("omits sections whose content was fully filtered out", () => {
    const resume = resolveResume(
      fixtureData,
      makeTemplate({ include_tags: ["nonexistent-tag"] }),
    );
    const md = renderMarkdown(resume, enLocale, "en");
    expect(md).not.toContain("### Senior Engineer");
  });

  it("matches the stored snapshot", () => {
    const resume = resolveResume(fixtureData, makeTemplate());
    expect(renderMarkdown(resume, enLocale, "en")).toMatchSnapshot();
  });

  it("renders compact projects without description, links, or technology label", () => {
    const resume = resolveResume(
      fixtureData,
      makeTemplate({ project_layout: "compact" }),
    );
    const md = renderMarkdown(resume, enLocale, "en");

    expect(md).toContain("### Creative Proj");
    expect(md).toContain("*art*");
    expect(md).toContain("- did art");
    expect(md).toContain("WebGL");
    expect(md).not.toContain("A creative project.");
    expect(md).not.toContain("**Technologies:**");
    expect(md).not.toContain("**Links:**");
  });

  it("renders standard projects with description and links", () => {
    const resume = resolveResume(
      fixtureData,
      makeTemplate({ project_layout: "standard" }),
    );
    const md = renderMarkdown(resume, enLocale, "en");

    expect(md).toContain("A creative project.");
    expect(md).toContain("**Technologies:** WebGL");
    expect(md).toContain("**Links:**");
  });
});
