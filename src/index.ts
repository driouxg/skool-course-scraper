import "dotenv/config";
import puppeteer, { Page } from "puppeteer";

function fuzzy<T>(page: Page, text: string, func?: (item: HTMLElement[]) => T) {
  return page.$$eval(`::-p-xpath(//div[contains(@class, '${text}')])`, func);
}

function delay(time: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

async function main() {
  const browser = await puppeteer.launch({
    timeout: 0,
    headless: false,
    args: ["--no-sandbox", "--start-fullscreen"],
  });
  const page = await browser.newPage();

  await page.goto("https://skool.com/login");

  await page.setViewport({ width: 1920, height: 1080 });

  await page.type("#email", process.env.SKOOL_USERNAME);
  await page.type("#password", process.env.SKOOL_PASSWORD);

  await page.click('button[type="submit"]');
  await page.waitForNavigation();

  await page.locator("div ::-p-text(Classroom)").click();
  await page.waitForNavigation();

  await delay(1000);

  const courseTitles = await fuzzy(page, "CourseTitle", (divs) =>
    divs.map((div) => div.textContent)
  );

  console.log("course Titles: ", courseTitles);

  for (const courseTitle of courseTitles) {
    await page.locator(`text/${courseTitle}`).click();
    await page.waitForNavigation();

    // const expandableSections = await page.$$(
    //   `::-p-xpath(//div[contains(@class, 'Icon')])`
    // );
    // expandableSections.forEach((section) => section.click());

    const lessonTitles = await fuzzy(page, "MenuItemTitle-sc", (divs) =>
      divs.map((div) => div.textContent)
    );

    console.log("Lesson Titles: ", lessonTitles);

    let titleSet: Set<string> = new Set(lessonTitles);

    for (const lessonTitle of titleSet) {
      console.log("clicking section: ", lessonTitle);
      await page.locator(`::-p-xpath(//div[@title='${lessonTitle}'])`).click();
      await page.waitForNavigation();
      await delay(1000);

      // Download video
      await page
        .locator(`::-p-xpath(//div[contains(@class, 'VideoWrapper')])`)
        .click();

      const video = await page
        .locator(
          `::-p-xpath(//div[contains(@class, 'VideoPlayerWrapper')]/div/div/iframe)`
        )
        .waitHandle();

      const videoUrl = await video.evaluate((v) => v.getAttribute("src"));

      console.log("Downloading video: ", videoUrl);

      const resources = await page.$$(
        "::-p-xpath(//span[contains(@class, 'ResourceLabel')])"
      );

      for (const resourceLink of resources) {
        const resourceName = resourceLink.evaluate((l) => l.textContent);

        await resourceLink.click();

        await delay(2000);

        const fileIframe = await (
          await page.waitForSelector(
            "::-p-xpath(//div[contains(@class, 'AttachmentPreviewInnerContent')]/iframe)"
          )
        ).frame;

        const resourceUrl = await fileIframe.$eval(
          "::-p-xpath(//div[contains(@class, 'AttachmentPreviewInnerContent')]/iframe)",
          (f) => f.getAttribute("src")
        );

        console.log("resource url: ", resourceUrl);
      }
    }

    // await page.goBack();
  }
}

main();
