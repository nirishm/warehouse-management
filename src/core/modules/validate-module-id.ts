const KEBAB_CASE_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export function validateModuleId(id: string): void {
  if (!KEBAB_CASE_RE.test(id)) {
    throw new Error(
      `Invalid module ID "${id}": must be kebab-case (e.g. "my-module")`
    );
  }
}
