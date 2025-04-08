import "dotenv/config";
import puppeteer, { Page } from "puppeteer";
import fs from "fs";
import { DownloaderHelper } from "node-downloader-helper";
import https from "https";
import Player from "@vimeo/player";

function fuzzy<T>(page: Page, text: string, func?: (item: HTMLElement[]) => T) {
  return page.$$eval(`::-p-xpath(//div[contains(@class, '${text}')])`, func);
}

function delay(time: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

function createFolder(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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

  console.log("REACHED 1");

  // await page.click(`a[download="video.mp4"]`);

  await delay(15000);

  // Create root folder
  createFolder("./courses");

  // Get group name
  const groupName = "WellOiledOperations";

  createFolder(`./courses/${groupName}`);

  const courseTitles = await fuzzy(page, "CourseTitle", (divs) =>
    divs.map((div) => div.textContent)
  );

  console.log("course Titles: ", courseTitles);

  const currentUrl = page.url();

  for (
    let courseTitleIdx = 0;
    courseTitleIdx < courseTitles.length;
    courseTitleIdx++
  ) {
    const courseTitle = courseTitles[courseTitleIdx];
    await page.locator(`text/${courseTitle}`).click();
    await page.waitForNavigation();

    createFolder(`./courses/${groupName}/${courseTitleIdx} - ${courseTitle}`);

    // const expandableSections = await page.$$(
    //   `::-p-xpath(//div[contains(@class, 'Icon')])`
    // );
    // expandableSections.forEach((section) => section.click());

    const lessonTitles = await fuzzy(page, "MenuItemTitle-sc", (divs) =>
      divs.map((div) => div.textContent)
    );

    console.log("Lesson Titles: ", lessonTitles);

    let titleSet: Set<string> = new Set(lessonTitles);

    for (
      let lessonTitleIdx = 0;
      lessonTitleIdx < lessonTitles.length;
      lessonTitleIdx++
    ) {
      const lessonTitle = lessonTitles[lessonTitleIdx];
      console.log("clicking section: ", lessonTitle);
      await page.locator(`::-p-xpath(//div[@title='${lessonTitle}'])`).click();
      await page.waitForNavigation().then(() => delay(1000));

      createFolder(
        `./courses/${groupName}/${courseTitleIdx} - ${courseTitle}/${lessonTitleIdx} - ${lessonTitle}`
      );

      // Get video url
      await page
        .locator(`::-p-xpath(//div[contains(@class, 'VideoWrapper')])`)
        .click();

      const video = await page
        .locator(
          `::-p-xpath(//div[contains(@class, 'VideoPlayerWrapper')]/div/div/iframe)`
        )
        .waitHandle();

      const videoUrl = await video.evaluate((v) => {
        return v.getAttribute("src");
      });

      console.log("Gathering video url: ", videoUrl);

      createFolder(
        `./courses/${groupName}/${courseTitleIdx} - ${courseTitle}/`
      );

      const resources = await page.$$(
        "::-p-xpath(//span[contains(@class, 'ResourceLabel')])"
      );

      console.log(`Found ${resources.length} resources.`);

      for (const resourceLink of resources) {
        const resourceName = await resourceLink.evaluate((l) => l.textContent);

        await resourceLink.click().then(() => delay(2000));

        const fileIframe = (
          await page.waitForSelector(
            "::-p-xpath(//div[contains(@class, 'AttachmentPreviewInnerContent')]/iframe)"
          )
        ).frame;

        const resourceUrl = await fileIframe.$eval(
          "::-p-xpath(//div[contains(@class, 'AttachmentPreviewInnerContent')]/iframe)",
          (f) => f.getAttribute("src")
        );

        console.log("resource: ", resourceName, "resource url: ", resourceUrl);

        const buttons = await fileIframe.$$(
          "::-p-xpath(//button[contains(@class, 'ButtonWrapper')])"
        );

        const closeButton =
          buttons[buttons.length - (1 < resources.length ? 2 : 1)];

        await closeButton.click().then(() => delay(2000));
      }

      // await page.goBack();
    }

    await page.goto(currentUrl);
  }

  // click next page
  await page.locator("span ::-p-text(Next)").click();
}

main();
