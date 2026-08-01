import { describe, expect, it } from "vitest";
import { resolveResume } from "../src/resolve/index";
import { t } from "../src/schema/locale";
import { fixtureData, makeTemplate } from "./fixtures";

const bulletsEn = (bullets: { text: { en: string; es: string } }[]) =>
  bullets.map((b) => t(b.text, "en"));

describe("resolveResume", () => {
  it('include_tags: ["*"] keeps everything (master)', () => {
    const resume = resolveResume(fixtureData, makeTemplate());
    expect(resume.experience).toHaveLength(2);
    expect(resume.projects).toHaveLength(2);
    expect(resume.skills).toHaveLength(2);
    expect(resume.experience[0]?.bullets).toHaveLength(4);
  });

  it("filters roles, bullets, projects, and skills by tag intersection", () => {
    const resume = resolveResume(
      fixtureData,
      makeTemplate({ include_tags: ["swe"], skills: { filter_tags: ["swe"] } }),
    );

    expect(resume.experience.map((r) => r.id)).toEqual(["role-senior"]);
    expect(bulletsEn(resume.experience[0]?.bullets ?? [])).toEqual([
      "swe bullet",
      "shared bullet",
    ]);

    expect(resume.projects.map((p) => p.id)).toEqual(["proj-swe"]);

    // "Creative" category has no swe-tagged skills and is dropped entirely.
    expect(resume.skills).toHaveLength(1);
    expect(resume.skills[0]?.items.map((i) => t(i.name, "en"))).toEqual(["TypeScript"]);
  });

  it("applies exclude_tags before include_tags, even for '*'", () => {
    const resume = resolveResume(
      fixtureData,
      makeTemplate({ include_tags: ["*"], exclude_tags: ["creative", "secret"] }),
    );
    expect(resume.projects).toHaveLength(1);
    expect(bulletsEn(resume.experience[0]?.bullets ?? [])).not.toContain("excluded bullet");
  });

  it("caps bullets per role in file order", () => {
    const resume = resolveResume(fixtureData, makeTemplate({ max_bullets_per_role: 2 }));
    expect(bulletsEn(resume.experience[0]?.bullets ?? [])).toEqual([
      "swe bullet",
      "frontend bullet",
    ]);
  });

  it("sorts roles newest first regardless of file order", () => {
    const shuffled: typeof fixtureData = {
      ...fixtureData,
      experience: [...fixtureData.experience].reverse(),
    };
    const resume = resolveResume(shuffled, makeTemplate());
    expect(resume.experience.map((r) => r.id)).toEqual(["role-senior", "role-junior"]);
  });

  it("applies title and summary overrides, falling back to the profile", () => {
    const overridden = resolveResume(
      fixtureData,
      makeTemplate({
        title_override: { en: "Platform Engineer", es: "Ingeniero de Plataformas" },
        summary_override: { en: "Custom summary.", es: "Resumen personalizado." },
      }),
    );
    expect(t(overridden.title, "en")).toBe("Platform Engineer");
    expect(t(overridden.summary, "en")).toBe("Custom summary.");

    const fallback = resolveResume(fixtureData, makeTemplate());
    expect(t(fallback.title, "en")).toBe("Engineer");
    expect(t(fallback.summary, "en")).toBe("Default summary.");
  });

  it("keeps roles with no matching bullets (the role itself still matches)", () => {
    const resume = resolveResume(fixtureData, makeTemplate({ include_tags: ["frontend"] }));
    const junior = resume.experience.find((r) => r.id === "role-junior");
    expect(junior).toBeDefined();
    expect(junior?.bullets).toHaveLength(1);
  });
});
