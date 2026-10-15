import type { EmploymentType, Proficiency, SectionId } from "../schema/index";

/**
 * Type-safe interface for locale file structure.
 * This matches the YAML schema in locales/*.yaml files.
 */
export interface LocaleFile {
  sections: Record<SectionId, string>;
  dates: {
    months: string[];
    present: string;
  };
  employment_types: Record<EmploymentType, string>;
  proficiency_levels: Record<Proficiency, string>;
  resume: {
    technologies: string;
    links: string;
    cv: string;
    linkedin: string;
    github: string;
  };
  website: {
    title_suffix: string;
    meta_fallback: string;
    hero: string;
    view_online: string;
    download_pdf: string;
    download_pdf_1col: string;
    download_pdf_2col: string;
    download_docx: string;
    all_resumes: string;
    generated_from: string;
    version: string;
  };
}
