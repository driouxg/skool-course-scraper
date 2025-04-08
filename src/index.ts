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

async function go(url: string, path: string) {
  const t = new Promise<any>((resolve, reject) => {
    https.get(url, (res) => {
      let result = "";
      res.on("data", (data) => {
        result += data;
      });
      res.on("error", (err) => {
        reject(err);
      });
      res.on("end", () => {
        resolve(JSON.parse(result));
      });
    });
  });

  const b = await Promise.resolve(t);

  console.log(b);

  // await new Promise((resolve, reject) => {
  //   https.get(targetVideoFileUlr, (res) => {
  //       const file = fs.createWriteStream(path);
  //       res.pipe(file);
  //       res.on('error', err => {
  //           reject(err);
  //       });
  //       res.on('end', () => {
  //           resolve();
  //       });
  //   });
  // });
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

  // Get group name
  const groupName = "WellOiledOperations";

  createFolder(`./${groupName}`);

  const courseTitles = await fuzzy(page, "CourseTitle", (divs) =>
    divs.map((div) => div.textContent)
  );

  console.log("course Titles: ", courseTitles);

  for (const courseTitle of courseTitles) {
    await page.locator(`text/${courseTitle}`).click();
    await page.waitForNavigation();

    createFolder(`./${groupName}/${courseTitle}`);

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
      await page.waitForNavigation().then(() => delay(1000));

      createFolder(`./${groupName}/${courseTitle}/${lessonTitle}`);

      // Download video
      await page
        .locator(`::-p-xpath(//div[contains(@class, 'VideoWrapper')])`)
        .click();

      const video = await page
        .locator(
          `::-p-xpath(//div[contains(@class, 'VideoPlayerWrapper')]/div/div/iframe)`
        )
        .waitHandle();

      // const player = new Player(await video);

      // console.log("REACHED!");

      // page.evaluate(() => {
      //   const a = document.createElement("a");
      //   a.href = videoUrl;
      //   a.download = "myfilename";
      //   document.body.appendChild(a);
      //   a.click();
      //   document.body.removeChild(a);
      // });

      // page.evaluate(() => {
      //   document.querySelector("");
      // });

      const videoUrl = await video.evaluate((v) => v.getAttribute("src"));

      console.log("Downloading video: ", videoUrl);
      // new DownloaderHelper(
      //   videoUrl,
      //   `./${groupName}/${courseTitle}/${lessonTitle}`,
      //   { fileName: "video" }
      // )
      //   .start()
      //   .catch((err) => console.error(err));

      createFolder("./WellOiledOperations");
      const val = await go(
        videoUrl,
        `./${groupName}/${courseTitle}/${lessonTitle}`
      );

      await page.evaluate(() => {
        const downloadLink = document.createElement("a");
        // const url = URL.createObjectURL(
        //   new Blob(
        //     [
        //       // "https://player.vimeo.com/video/953223263?title=0&byline=0&portrait=0&autoplay=1&autopause=0&app_id=122963",
        //       videoUrl,
        //     ],
        //     { type: "text/plain" }
        //   )
        // );

        downloadLink.href = videoUrl; // Replace videoSrc with the actual video URL
        downloadLink.download = "video.mp4"; // Replace with desired filename
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      });

      const resources = await page.$$(
        "::-p-xpath(//span[contains(@class, 'ResourceLabel')])"
      );

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

      await page.goBack();
    }

    await page.goBack();
  }

  // click next page
  await page.locator("span ::-p-text(Next)").click();
}

main();
