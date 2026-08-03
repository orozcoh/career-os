import type { CareerData } from "../src/load/index";
import type { Template } from "../src/schema/index";
import type { LocaleFile } from "../src/locale/types";

/** Small typed fixture shared by resolver and renderer tests. */
export const fixtureData: CareerData = {
  profile: {
    name: "Test Person",
    title: { en: "Engineer", es: "Ingeniero" },
    summary_short: { en: "Short summary.", es: "Resumen corto." },
    summary: { en: "Default summary.", es: "Resumen por defecto." },
    location: "Remote",
    email: "test@example.com",
    linkedin: "https://www.linkedin.com/in/test",
    github: "https://github.com/test",
    website: "https://example.com",
    cv: "https://cv.example.com",
  },
  experience: [
    {
      id: "role-senior",
      title: { en: "Senior Engineer", es: "Ingeniero Senior" },
      company: { en: "Acme", es: "Acme" },
      employment_type: "full-time",
      location: "Remote",
      start: "2023-01",
      end: null,
      tags: ["swe"],
      bullets: [
        { text: { en: "swe bullet", es: "bullet swe" }, tags: ["swe"] },
        { text: { en: "frontend bullet", es: "bullet frontend" }, tags: ["frontend"] },
        { text: { en: "shared bullet", es: "bullet compartido" }, tags: ["swe", "frontend"] },
        { text: { en: "excluded bullet", es: "bullet excluido" }, tags: ["secret"] },
      ],
    },
    {
      id: "role-junior",
      title: { en: "Junior Engineer", es: "Ingeniero Junior" },
      company: { en: "Globex", es: "Globex" },
      employment_type: "internship",
      location: "Bogotá",
      start: "2020-06",
      end: "2021-01",
      tags: ["frontend"],
      bullets: [{ text: { en: "fe only", es: "solo fe" }, tags: ["frontend"] }],
    },
  ],
  projects: [
    {
      id: "proj-creative",
      name: "Creative Proj",
      tagline: { en: "art", es: "arte" },
      description: { en: "A creative project.", es: "Un proyecto creativo." },
      technologies: ["WebGL"],
      links: [{ label: { en: "Live", es: "En vivo" }, url: "https://example.com/live" }],
      tags: ["creative"],
      highlights: [{ text: { en: "did art", es: "hice arte" }, tags: ["creative"] }],
    },
    {
      id: "proj-swe",
      name: "SWE Proj",
      tagline: { en: "infra", es: "infra" },
      description: { en: "An infra project.", es: "Un proyecto de infra." },
      technologies: [],
      links: [],
      tags: ["swe"],
      highlights: [],
    },
  ],
  education: [
    {
      id: "edu-1",
      institution: "Test University",
      degree: { en: "B.Sc.", es: "Lic." },
      field: { en: "Computer Science", es: "Ciencias de la Computación" },
      location: "Bogotá",
      start: "2015",
      end: "2020",
      highlights: [
        { en: "Graduated with honors.", es: "Graduado con honores." },
        { en: "Thesis on distributed systems.", es: "Tesis sobre sistemas distribuidos." },
      ],
    },
  ],
  skills: [
    {
      category: { en: "Languages", es: "Lenguajes" },
      items: [
        { name: { en: "TypeScript", es: "TypeScript" }, tags: ["swe"] },
        { name: { en: "CSS", es: "CSS" }, tags: ["frontend"] },
      ],
    },
    {
      category: { en: "Creative", es: "Creativo" },
      items: [{ name: { en: "GLSL", es: "GLSL" }, tags: ["creative"] }],
    },
  ],
  languages: [
    { name: { en: "English", es: "Inglés" }, proficiency: "fluent" },
    { name: { en: "Spanish", es: "Español" }, proficiency: "native" },
  ],
};

export function makeTemplate(overrides: Partial<Template> = {}): Template {
  return {
    id: "test",
    name: { en: "Test", es: "Prueba" },
    slug: "test",
    download_name: "test-engineer",
    description: { en: "Test template.", es: "Plantilla de prueba." },
    title_override: null,
    summary_override: null,
    include_tags: ["*"],
    exclude_tags: [],
    max_bullets_per_role: null,
    project_layout: "complete",
    max_education_highlights: null,
    sections: ["summary", "experience", "projects", "skills", "education", "languages"],
    order: 100,
    skills: { filter_tags: null },
    ...overrides,
  };
}

/** English locale file fixture (mirrors locales/en.yaml). */
export const enLocale: LocaleFile = {
  sections: {
    summary: "Summary",
    experience: "Experience",
    projects: "Projects",
    skills: "Skills",
    education: "Education",
    languages: "Languages",
  },
  dates: {
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    present: "Present",
  },
  employment_types: {
    "full-time": "Full-time",
    "part-time": "Part-time",
    contract: "Contract",
    freelance: "Freelance",
    internship: "Internship",
    "self-employed": "Self-employed",
  },
  proficiency_levels: {
    native: "Native",
    fluent: "Fluent",
    professional: "Professional",
    intermediate: "Intermediate",
    basic: "Basic",
  },
  resume: {
    technologies: "Technologies",
    links: "Links",
    cv: "CV",
    linkedin: "LinkedIn",
    github: "GitHub",
  },
  website: {
    title_suffix: "Resume",
    meta_fallback: "ATS-friendly resumes generated from a single structured data source.",
    hero: "Choose the resume that best matches your hiring needs. Each version presents the same engineering experience with an emphasis on the skills, products, and accomplishments most relevant to the role.",
    view_online: "View online",
    download_pdf: "Download PDF",
    download_docx: "DOCX",
    all_resumes: "All resumes",
    generated_from: "© 2026 Santiago Orozco Holguín",
    version: "v",
  },
};

/** Spanish locale file fixture (mirrors locales/es.yaml). */
export const esLocale: LocaleFile = {
  sections: {
    summary: "Perfil Profesional",
    experience: "Experiencia",
    projects: "Proyectos",
    skills: "Habilidades Técnicas",
    education: "Educación",
    languages: "Idiomas",
  },
  dates: {
    months: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
    present: "Presente",
  },
  employment_types: {
    "full-time": "Tiempo completo",
    "part-time": "Medio tiempo",
    contract: "Contrato",
    freelance: "Freelance",
    internship: "Pasantía",
    "self-employed": "",
  },
  proficiency_levels: {
    native: "Nativo",
    fluent: "Fluido",
    professional: "Profesional",
    intermediate: "Intermedio",
    basic: "Básico",
  },
  resume: {
    technologies: "Tecnologías",
    links: "Enlaces",
    cv: "CV",
    linkedin: "LinkedIn",
    github: "GitHub",
  },
  website: {
    title_suffix: "Currículum",
    meta_fallback: "Currículums compatibles con ATS generados desde una única fuente de datos estructurada.",
    hero: "Elige la hoja de vida que mejor se adapte a tu proceso de selección. Cada versión presenta la misma experiencia profesional, destacando las habilidades, productos y logros más relevantes para el cargo.",
    view_online: "Ver en línea",
    download_pdf: "Descargar PDF",
    download_docx: "DOCX",
    all_resumes: "Todos los currículums",
    generated_from: "© 2026 Santiago Orozco Holguín",
    version: "v",
  },
};
