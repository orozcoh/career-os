import type { SectionId } from "../schema/index";
import type { Locale } from "../schema/locale";
import { t } from "../schema/locale";
import type { LocaleFile } from "../locale/types";
import { formatDateRange, formatYearRange } from "../resolve/dates";
import { visibleSections, type ResumeData } from "../resolve/index";

function contactLine(resume: ResumeData, locale: LocaleFile): string {
  const { profile: p } = resume;
  const web = (url: string) => `[${url.replace(/^https?:\/\//, "")}](${url})`;
  return [
    p.location,
    [p.email, `[${locale.resume.linkedin}](${p.linkedin})`, `[${locale.resume.github}](${p.github})`].join(" · "),
    [web(p.website), `[${locale.resume.cv}](${p.cv})`].join(" · "),
  ].join("\n");
}

const sectionRenderers: Record<SectionId, (resume: ResumeData, locale: LocaleFile, lang: Locale) => string> = {
  summary: (r, _locale, lang) => t(r.summary, lang),

  experience: (r, locale, lang) =>
    r.experience
      .map((role) => {
        const metaParts = [
          formatDateRange(role.start, role.end, locale),
          role.location,
          locale.employment_types[role.employment_type],
        ].filter(Boolean);
        const meta = `*${metaParts.join(" · ")}*`;
        const bullets = role.bullets.map((b) => `- ${t(b.text, lang)}`).join("\n");
        const heading = [t(role.title, lang), t(role.company, lang)].filter(Boolean).join(" — ");
        return [`### ${heading}`, meta, bullets].filter(Boolean).join("\n\n");
      })
      .join("\n\n"),

  projects: (r, locale, lang) =>
    r.projects
      .map((project) => {
        const layout = r.template.project_layout;
        const parts = [
          `### ${project.name}`,
          `*${t(project.tagline, lang)}*`,
          layout === "compact" ? "" : t(project.description, lang),
          project.highlights.map((h) => `- ${t(h.text, lang)}`).join("\n"),
        ];
        if (project.technologies.length > 0) {
          parts.push(
            layout === "compact"
              ? project.technologies.join(" · ")
              : `**${locale.resume.technologies}:** ${project.technologies.join(", ")}`,
          );
        }
        if (layout !== "compact" && project.links.length > 0) {
          parts.push(
            `**${locale.resume.links}:** ${project.links.map((l) => `[${t(l.label, lang)}](${l.url})`).join(" · ")}`,
          );
        }
        return parts.filter(Boolean).join("\n\n");
      })
      .join("\n\n"),

  skills: (r, _locale, lang) =>
    r.skills
      .map((c) => `- **${t(c.category, lang)}:** ${c.items.map((i) => t(i.name, lang)).join(", ")}`)
      .join("\n"),

  education: (r, locale, lang) =>
    r.education
      .map((edu) => {
        const meta = `*${formatYearRange(edu.start, edu.end, locale)} · ${edu.location}*`;
        const highlights = edu.highlights.map((h) => `- ${t(h, lang)}`).join("\n");
        return [`### ${t(edu.degree, lang)} ${t(edu.field, lang)} — ${edu.institution}`, meta, highlights]
          .filter(Boolean)
          .join("\n\n");
      })
      .join("\n\n"),

  languages: (r, locale, lang) => r.languages.map((l) => `- ${t(l.name, lang)} — ${locale.proficiency_levels[l.proficiency]}`).join("\n"),
};

/**
 * Renders one resume as a Markdown document, following the template's
 * section order. ATS-friendly: single column, real headings, no tables.
 */
export function renderMarkdown(resume: ResumeData, locale: LocaleFile, lang: Locale): string {
  const lines: string[] = [
    `# ${resume.profile.name}`,
    `**${t(resume.title, lang)}**`,
    contactLine(resume, locale),
  ];

  for (const section of visibleSections(resume)) {
    lines.push(`## ${locale.sections[section]}`, sectionRenderers[section](resume, locale, lang));
  }

  return `${lines.join("\n\n")}\n`;
}
