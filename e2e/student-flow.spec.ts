import { test, expect } from "@playwright/test";
test("register → onboard → subject → task → plan → calendar → completion → analytics", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const email = `e2e-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.locator("html[data-ready=true]").waitFor();
  await page.getByLabel("Тіл").selectOption("en");
  await page.getByLabel("Full name", { exact: true }).fill("Test Student");
  await page.getByLabel("Email address").fill(email);
  await page.locator("input[name=password]").fill("StudyPlanner123!");
  await page.getByLabel("Confirm password").fill("StudyPlanner123!");
  await page.getByLabel("University").fill("Test University");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("Email address").fill(email);
  await page.locator("input[name=password]").fill("StudyPlanner123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  // Account preferences deliberately start in Kazakh; select the test language.
  await page.getByLabel("Тіл").selectOption("en");
  await page
    .getByRole("link")
    .filter({ hasText: "Let’s find your rhythm." })
    .click();
  await page.getByRole("button", { name: "Do this later" }).click();
  await page.goto("/subjects");
  await page
    .getByRole("button", { name: "New subject", exact: true })
    .first()
    .click();
  await page.getByRole("dialog").getByLabel("Title").fill("Computer Science");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Computer Science" }),
  ).toBeVisible();
  await page.goto("/tasks");
  await page
    .getByRole("button", { name: "New task", exact: true })
    .first()
    .click();
  const modal = page.getByRole("dialog");
  await modal.getByLabel("Title", { exact: true }).fill("Build a compiler");
  await modal
    .getByRole("combobox", { name: "Subject", exact: true })
    .selectOption({ label: "Computer Science" });
  await modal.getByLabel("Duration").fill("90");
  await modal.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText("Build a compiler", { exact: true }),
  ).toBeVisible();
  await page.goto("/ai-planner");
  await page
    .getByRole("button", { name: "Generate study plan", exact: true })
    .click();
  await expect(
    page.getByText("Intelligent algorithm", { exact: true }).first(),
  ).toBeVisible();
  await page.goto("/calendar");
  await expect(
    page.getByRole("button", { name: /Build a compiler/ }).first(),
  ).toBeVisible();
  await page.goto("/tasks");
  await page
    .getByRole("button", { name: "Completed", exact: true })
    .first()
    .click();
  await page.goto("/analytics");
  await expect(
    page.getByRole("heading", { name: "Analytics", exact: true }),
  ).toBeVisible();
  const saved = () =>
    page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/workspace") &&
        r.request().method() === "POST" &&
        r.status() === 200,
    );
  await Promise.all([
    saved(),
    page.getByRole("button", { name: "Appearance", exact: true }).click(),
  ]);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({
    path: "artifacts/dashboard-dark.png",
    fullPage: true,
  });
  await Promise.all([
    saved(),
    page.getByRole("button", { name: "Appearance", exact: true }).click(),
  ]);
  await Promise.all([
    saved(),
    page
      .getByRole("combobox", { name: "Language", exact: true })
      .selectOption("ru"),
  ]);
  await expect(
    page.getByRole("heading", { name: "Аналитика", exact: true }),
  ).toBeVisible();
  await Promise.all([
    saved(),
    page
      .getByRole("combobox", { name: "Язык", exact: true })
      .selectOption("kk"),
  ]);
  await expect(
    page.getByRole("heading", { name: "Талдау", exact: true }),
  ).toBeVisible();
  await Promise.all([
    saved(),
    page.getByRole("combobox", { name: "Тіл", exact: true }).selectOption("en"),
  ]);
  await page.goto("/focus");
  await page.getByRole("button", { name: "Start focus", exact: true }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Start focus", exact: true }),
  ).toBeVisible();
  if (!process.env.OPENAI_API_KEY) {
    await page.goto("/ai-assistant");
    await page
      .getByRole("textbox", { name: "What would you like to work on?" })
      .fill("Which assignment should I prioritize?");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText(/The AI service is unavailable/)).toBeVisible();
  }
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "dashboard",
      "tasks",
      "subjects",
      "ai-planner",
      "calendar",
      "analytics",
      "focus",
      "ai-assistant",
      "profile",
      "settings",
    ]) {
      await page.goto(`/${route}`);
      await expect(page.locator("main h1")).toBeVisible();
      const overflow = await page.evaluate(() => ({
        width: window.innerWidth,
        scroll: document.documentElement.scrollWidth,
        offenders: [...document.querySelectorAll("main *")]
          .filter(
            (e) => e.getBoundingClientRect().right > window.innerWidth + 1,
          )
          .slice(0, 5)
          .map((e) => ({ tag: e.tagName, cls: e.className })),
      }));
      expect(
        overflow.scroll,
        JSON.stringify({ route, ...overflow }),
      ).toBeLessThanOrEqual(width);
      if ((width === 375 || width === 1440) && route === "dashboard")
        await page.screenshot({
          path: `artifacts/dashboard-${width}.png`,
          fullPage: true,
        });
    }
  }
  expect(errors).toEqual([]);
});
for (const width of [375, 768, 1024, 1440])
  test(`public pages fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.locator("html[data-ready=true]").waitFor();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.goto("/login");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
