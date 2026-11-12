// Resolve the app's extensionless relative TS imports for Node's built-in test runner.
export async function resolve(specifier, context, nextResolve) {
  if (
    context.parentURL?.includes("/src/lib/applicant/") &&
    specifier.startsWith("./") &&
    !/\.[a-z]+$/i.test(specifier)
  ) {
    return nextResolve(`${specifier}.ts`, context);
  }
  return nextResolve(specifier, context);
}
