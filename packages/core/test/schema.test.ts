import { describe, expect, it } from "vitest";
import { educationSchema, profileSchema, roleSchema, templateSchema } from "../src/schema/index";

describe("schema validation", () => {
  it("accepts a valid role", () => {
    const result = roleSchema.safeParse({
      id: "x",
      title: { en: "Engineer", es: "Ingeniero" },
      company: "Acme",
      employment_type: "full-time",
      location: "Remote",
      start: "2023-03",
      end: null,
      tags: ["swe"],
      bullets: [{ text: { en: "did things", es: "hice cosas" }, tags: ["swe"] }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid month formats with a precise path", () => {
    const base = {
      id: "x",
      title: { en: "Engineer", es: "Ingeniero" },
      company: "Acme",
      employment_type: "full-time" as const,
      location: "Remote",
      end: null,
      tags: [],
      bullets: [],
    };
    for (const bad of ["2023-13", "March 2023", "2023", "2023-3"]) {
      const result = roleSchema.safeParse({ ...base, start: bad });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toEqual(["start"]);
      }
    }
  });

  it("rejects unknown employment types", () => {
    const result = roleSchema.safeParse({
      id: "x",
      title: { en: "Engineer", es: "Ingeniero" },
      company: "Acme",
      employment_type: "permanent",
      location: "Remote",
      start: "2023-03",
      end: null,
      tags: [],
      bullets: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a profile missing required fields", () => {
    const result = profileSchema.safeParse({ name: "Test" });
    expect(result.success).toBe(false);
  });

  it("rejects localized fields that are missing a locale key", () => {
    const result = profileSchema.safeParse({
      name: "Test",
      title: { en: "Engineer" }, // es missing
      summary_short: { en: "Short", es: "Corto" },
      summary: { en: "Full", es: "Completo" },
      location: "Remote",
      email: "test@example.com",
      linkedin: "https://linkedin.com/in/test",
      github: "https://github.com/test",
      website: "https://example.com",
      cv: "https://cv.example.com",
    });
    expect(result.success).toBe(false);
  });

  it("accepts education with both YYYY and YYYY-MM formats", () => {
    const base = {
      id: "edu-1",
      institution: "Test University",
      degree: { en: "B.Sc.", es: "Lic." },
      field: { en: "Computer Science", es: "Ciencias de la Computación" },
      location: "Bogotá",
      highlights: [],
    };

    const yyyy = educationSchema.safeParse({ ...base, start: "2015", end: "2020" });
    expect(yyyy.success).toBe(true);

    const yyyyMm = educationSchema.safeParse({ ...base, start: "2014-08", end: "2023-06" });
    expect(yyyyMm.success).toBe(true);

    const mixed = educationSchema.safeParse({ ...base, start: "2015", end: "2023-06" });
    expect(mixed.success).toBe(true);
  });

  it("applies template defaults for omitted optional fields", () => {
    const result = templateSchema.parse({
      id: "t",
      name: { en: "T", es: "T" },
      slug: "t",
      description: { en: "d", es: "d" },
      include_tags: ["*"],
      sections: ["summary"],
    });
    expect(result.title_override).toBeNull();
    expect(result.summary_override).toBeNull();
    expect(result.exclude_tags).toEqual([]);
    expect(result.max_bullets_per_role).toBeNull();
    expect(result.skills.filter_tags).toBeNull();
  });

  it("rejects non-kebab-case slugs", () => {
    const base = {
      id: "t",
      name: { en: "T", es: "T" },
      description: { en: "d", es: "d" },
      include_tags: ["*"],
      sections: ["summary"],
    };
    for (const bad of ["Software Engineer", "software_engineer", "-leading"]) {
      const result = templateSchema.safeParse({ ...base, slug: bad });
      expect(result.success).toBe(false);
    }
  });
});
