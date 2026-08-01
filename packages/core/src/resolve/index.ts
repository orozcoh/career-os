import type { CareerData } from "../load/index";
import type {
  Education,
  Language,
  LocalizedText,
  Profile,
  Project,
  Role,
  SectionId,
  SkillCategory,
  TaggedBullet,
  Template,
} from "../schema/index";

/** A role after template filtering: bullets are the selected subset. */
export type ResolvedRole = Omit<Role, "bullets"> & { bullets: TaggedBullet[] };
/** A project after template filtering: highlights are the selected subset. */
export type ResolvedProject = Omit<Project, "highlights"> & { highlights: TaggedBullet[] };

/**
 * Everything a renderer needs for one resume variant.
 * Renderers must consume this type only — never raw CareerData —
 * so filtering logic lives in exactly one place.
 */
export interface ResumeData {
  template: Template;
  profile: Profile;
  /** Resolved title (template override or profile default). */
  title: LocalizedText;
  /** Resolved summary (template override or profile default). */
  summary: LocalizedText;
  experience: ResolvedRole[];
  projects: ResolvedProject[];
  skills: SkillCategory[];
  education: Education[];
  languages: Language[];
}

function tagsMatch(itemTags: readonly string[], template: Template): boolean {
  if (itemTags.some((t) => template.exclude_tags.includes(t))) return false;
  if (template.include_tags.includes("*")) return true;
  return itemTags.some((t) => template.include_tags.includes(t));
}

function selectBullets(bullets: readonly TaggedBullet[], template: Template): TaggedBullet[] {
  const matched = bullets.filter((b) => tagsMatch(b.tags, template));
  const max = template.max_bullets_per_role;
  return max === null ? matched : matched.slice(0, max);
}

/** Sorts roles by start date, newest first. "YYYY-MM" strings compare lexicographically. */
function byStartDesc(a: ResolvedRole, b: ResolvedRole): number {
  return b.start.localeCompare(a.start);
}

function filterSkills(skills: SkillCategory[], template: Template): SkillCategory[] {
  const filter = template.skills.filter_tags;
  if (filter === null) return skills;
  return skills
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => item.tags.some((t) => filter.includes(t))),
    }))
    .filter((category) => category.items.length > 0);
}

/** Applies one template to the full dataset, producing one resume. */
export function resolveResume(data: CareerData, template: Template): ResumeData {
  const experience = data.experience
    .filter((role) => tagsMatch(role.tags, template))
    .map((role) => ({ ...role, bullets: selectBullets(role.bullets, template) }))
    .sort(byStartDesc);

  const projects = data.projects
    .filter((project) => tagsMatch(project.tags, template))
    .map((project) => ({ ...project, highlights: selectBullets(project.highlights, template) }));

  return {
    template,
    profile: data.profile,
    title: template.title_override ?? data.profile.title,
    summary: template.summary_override ?? data.profile.summary,
    experience,
    projects,
    skills: filterSkills(data.skills, template),
    education: data.education,
    languages: data.languages,
  };
}

export function resolveAll(data: CareerData, templates: readonly Template[]): ResumeData[] {
  return templates.map((template) => resolveResume(data, template));
}

/**
 * Whether a section has any content after filtering. Renderers skip empty
 * sections so tailored resumes never show a bare "Projects" heading.
 * LocalizedText fields count as content when any locale is non-empty.
 */
export function sectionHasContent(resume: ResumeData, section: SectionId): boolean {
  const localized = (text: { en: string; es: string }): boolean =>
    Object.values(text).some((value) => value.trim().length > 0);
  switch (section) {
    case "summary":
      return localized(resume.summary);
    case "experience":
      return resume.experience.length > 0;
    case "projects":
      return resume.projects.length > 0;
    case "skills":
      return resume.skills.length > 0;
    case "education":
      return resume.education.length > 0;
    case "languages":
      return resume.languages.length > 0;
  }
}

/** The template's sections, filtered to those with content, in render order. */
export function visibleSections(resume: ResumeData): SectionId[] {
  return resume.template.sections.filter((s) => sectionHasContent(resume, s));
}
