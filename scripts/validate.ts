const checks: Array<[string, string[]]> = [
  ["design", ["bun", "run", "check:design"]],
  ["generate", ["bun", "run", "generate"]],
  ["check", ["bun", "run", "check"]],
  ["frontend", ["bun", "run", "check:frontend"]],
  ["build", ["bun", "run", "build"]],
  ["tests", ["bun", "run", "test:memory"]],
];
for (const [name, cmd] of checks) {
  const child = Bun.spawn(cmd, { env: { ...process.env, NO_COLOR: "1" }, stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  const report = `Recall P3 validation\nRun: ${new Date().toISOString()}\nCommand: ${cmd.join(" ")}\nExit: ${code}\n\n${out}${err}`;
  await Bun.write(`docs/validation/${name}.txt`, report);
  console.log(`${name}: ${code === 0 ? "PASS" : "FAIL"}`);
  if (code !== 0) { console.error(out, err); process.exit(code); }
}
