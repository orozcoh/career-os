import pkg from "../../../package.json";

/**
 * The resume release version, stamped into the site at build time.
 * Displayed in the footer and (when a real analytics sink exists)
 * attached to every tracked event.
 */
export const RELEASE_VERSION: string = pkg.version;
